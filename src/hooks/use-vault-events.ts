"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { parseAbiItem, type Address, type Hex, type PublicClient } from "viem";

import { deploymentByVault, earliestBlock } from "@/lib/deployments";
import { getLogsClient, LOG_CHUNK } from "@/lib/rpc";
import { useTargetChainId } from "@/hooks/use-target-chain";
import type { ActivityEvent, YieldPoint } from "@/lib/activity";
import type { VaultView } from "@/lib/protocol";

/**
 * Vault history, read from logs. `Harvested` is what a yield chart should be
 * built from — summing `toYesSide` / `toNoSide` over time is real history,
 * far more trustworthy than projecting a rate forward (guide §9).
 *
 * Every query starts at the vault's deploy block; nothing exists before it.
 */

const EVENTS = {
  deposited: parseAbiItem(
    "event Deposited(address indexed user, bool isYes, uint256 amount)",
  ),
  withdrawn: parseAbiItem(
    "event Withdrawn(address indexed user, bool isYes, uint256 amount)",
  ),
  partial: parseAbiItem(
    "event PartialWithdrawal(address indexed user, bool isYes, uint256 requested, uint256 served)",
  ),
  claimed: parseAbiItem(
    "event YieldClaimed(address indexed user, uint256 amount)",
  ),
  harvested: parseAbiItem(
    "event Harvested(uint256 gross, uint256 fee, uint256 toYesSide, uint256 toNoSide)",
  ),
  merged: parseAbiItem("event Merged(uint256 pairs)"),
  settled: parseAbiItem(
    "event Settled(uint256 yesPayoutWad, uint256 noPayoutWad, uint256 redeemed)",
  ),
} as const;

/**
 * Log endpoints cap the span of a single `eth_getLogs`. `LOG_CHUNK` is sized to
 * the configured logs endpoint (10,000 on public Base), so a vault's whole
 * history is usually one request.
 */
const CHUNK = LOG_CHUNK;
/** Backstop so a misconfigured deploy block can't fan out into hundreds. */
const MAX_CHUNKS = 60;

async function getLogsResilient(
  client: PublicClient,
  address: Address,
  fromBlock: bigint,
) {
  const events = Object.values(EVENTS);
  const latest = await client.getBlockNumber();

  const spans: { from: bigint; to: bigint }[] = [];
  for (let start = fromBlock; start <= latest; start += CHUNK + 1n) {
    const end = start + CHUNK > latest ? latest : start + CHUNK;
    spans.push({ from: start, to: end });
  }

  // If the range is implausibly wide, scan only the most recent chunks rather
  // than hammering the RPC — partial history beats none.
  const scanned = spans.length > MAX_CHUNKS ? spans.slice(-MAX_CHUNKS) : spans;

  const batches = await Promise.all(
    scanned.map(({ from, to }) =>
      client
        .getLogs({ address, events, fromBlock: from, toBlock: to })
        // One bad chunk shouldn't lose the rest of the history.
        .catch(() => []),
    ),
  );
  return batches.flat();
}

export type VaultHistory = {
  activity: ActivityEvent[];
  /** Cumulative distributed yield, for the chart. */
  yieldSeries: YieldPoint[];
  /** Sum of the connected user's `YieldClaimed` amounts. */
  lifetimeClaimed: bigint;
  isLoading: boolean;
};

const EMPTY: VaultHistory = {
  activity: [],
  yieldSeries: [],
  lifetimeClaimed: 0n,
  isLoading: false,
};

export function useVaultEvents(vault: VaultView | undefined): VaultHistory {
  const chainId = useTargetChainId();
  // A dedicated client on the wide-range logs endpoint — see lib/rpc.ts. Also
  // pinned to the target chain, so log queries never follow the wallet onto a
  // network where the vault doesn't exist.
  const client = getLogsClient(chainId);
  const { address: user } = useAccount();

  const deployment = deploymentByVault(chainId, vault?.address);
  const fromBlock = deployment?.deployBlock ?? earliestBlock(chainId);

  const enabled = Boolean(client) && Boolean(vault);

  const { data, isLoading } = useQuery({
    queryKey: ["vault-events", chainId, vault?.address, user],
    enabled,
    staleTime: 120_000,
    refetchInterval: 300_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!client || !vault) return EMPTY;
      const logs = await getLogsResilient(client, vault.address, fromBlock);

      // Block timestamps come from a deduped set of blocks, not one call each.
      const blocks = [...new Set(logs.map((l) => l.blockNumber))];
      const times = new Map<bigint, number>();
      await Promise.all(
        blocks.map(async (bn) => {
          if (bn === null) return;
          const b = await client.getBlock({ blockNumber: bn });
          times.set(bn, Number(b.timestamp) * 1000);
        }),
      );

      const activity: ActivityEvent[] = [];
      const harvests: { t: number; amount: bigint }[] = [];
      let lifetimeClaimed = 0n;

      for (const log of logs) {
        const t = times.get(log.blockNumber ?? 0n) ?? 0;
        const id = `${log.transactionHash}-${log.logIndex}`;
        const txHash = (log.transactionHash ?? "0x") as Hex;
        // viem narrows args per event; treat as a loose record here.
        const args = (log as unknown as { args: Record<string, unknown> }).args;
        const name = (log as unknown as { eventName: string }).eventName;

        switch (name) {
          case "Deposited":
            activity.push({
              id, kind: "deposit", vault: vault.address, txHash, timestamp: t,
              actor: args.user as Address,
              side: args.isYes ? "yes" : "no",
              amount: args.amount as bigint,
            });
            break;
          case "Withdrawn":
            activity.push({
              id, kind: "withdraw", vault: vault.address, txHash, timestamp: t,
              actor: args.user as Address,
              side: args.isYes ? "yes" : "no",
              amount: args.amount as bigint,
            });
            break;
          case "PartialWithdrawal":
            activity.push({
              id, kind: "partial-withdraw", vault: vault.address, txHash, timestamp: t,
              actor: args.user as Address,
              side: args.isYes ? "yes" : "no",
              amount: args.requested as bigint,
              secondary: args.served as bigint,
            });
            break;
          case "YieldClaimed":
            activity.push({
              id, kind: "claim", vault: vault.address, txHash, timestamp: t,
              actor: args.user as Address,
              amount: args.amount as bigint,
            });
            if (
              user &&
              (args.user as string)?.toLowerCase() === user.toLowerCase()
            ) {
              lifetimeClaimed += args.amount as bigint;
            }
            break;
          case "Harvested": {
            const distributed =
              (args.toYesSide as bigint) + (args.toNoSide as bigint);
            activity.push({
              id, kind: "harvest", vault: vault.address, txHash, timestamp: t,
              amount: distributed,
            });
            harvests.push({ t, amount: distributed });
            break;
          }
          case "Merged":
            activity.push({
              id, kind: "rebalance", vault: vault.address, txHash, timestamp: t,
              amount: args.pairs as bigint,
            });
            break;
          case "Settled":
            activity.push({
              id, kind: "settle", vault: vault.address, txHash, timestamp: t,
              amount: args.redeemed as bigint,
            });
            break;
        }
      }

      activity.sort((a, b) => b.timestamp - a.timestamp);

      harvests.sort((a, b) => a.t - b.t);
      let acc = 0n;
      const yieldSeries = harvests.map((h) => {
        acc += h.amount;
        return { t: h.t, cumulative: acc };
      });

      return { activity, yieldSeries, lifetimeClaimed, isLoading: false };
    },
  });

  if (data) return { ...data, isLoading: false };
  // A disabled query reports isLoading=false, so derive it from `enabled`
  // instead — otherwise the empty state flashes before the first result.
  return { ...EMPTY, isLoading: enabled || isLoading };
}

/** Every vault's activity, for the global feed. */
export function useAllVaultEvents(vaults: VaultView[]): VaultHistory {
  const chainId = useTargetChainId();
  // A dedicated client on the wide-range logs endpoint — see lib/rpc.ts. Also
  // pinned to the target chain, so log queries never follow the wallet onto a
  // network where the vault doesn't exist.
  const client = getLogsClient(chainId);
  const addresses = vaults.map((v) => v.address);

  const enabled = Boolean(client) && addresses.length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ["all-vault-events", chainId, addresses.join(",")],
    enabled,
    staleTime: 120_000,
    refetchInterval: 300_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!client) return EMPTY;
      const per = await Promise.all(
        vaults.map(async (v) => {
          const deployment = deploymentByVault(chainId, v.address);
          const logs = await getLogsResilient(
            client,
            v.address,
            deployment?.deployBlock ?? earliestBlock(chainId),
          );
          return { vault: v.address, logs };
        }),
      );

      const blocks = [
        ...new Set(per.flatMap((p) => p.logs.map((l) => l.blockNumber))),
      ];
      const times = new Map<bigint, number>();
      await Promise.all(
        blocks.map(async (bn) => {
          if (bn === null) return;
          const b = await client.getBlock({ blockNumber: bn });
          times.set(bn, Number(b.timestamp) * 1000);
        }),
      );

      const activity: ActivityEvent[] = [];
      for (const { vault, logs } of per) {
        for (const log of logs) {
          const name = (log as unknown as { eventName: string }).eventName;
          const args = (log as unknown as { args: Record<string, unknown> }).args;
          const kind = KIND_BY_EVENT[name];
          if (!kind) continue;
          activity.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            kind,
            vault,
            txHash: (log.transactionHash ?? "0x") as Hex,
            timestamp: times.get(log.blockNumber ?? 0n) ?? 0,
            actor: args.user as Address | undefined,
            side:
              args.isYes === undefined ? undefined : args.isYes ? "yes" : "no",
            amount:
              (args.amount as bigint) ??
              (args.requested as bigint) ??
              (args.pairs as bigint) ??
              ((args.toYesSide as bigint) ?? 0n) +
                ((args.toNoSide as bigint) ?? 0n),
            secondary: args.served as bigint | undefined,
          });
        }
      }
      activity.sort((a, b) => b.timestamp - a.timestamp);
      return { activity, yieldSeries: [], lifetimeClaimed: 0n, isLoading: false };
    },
  });

  if (data) return { ...data, isLoading: false };
  return { ...EMPTY, isLoading: enabled || isLoading };
}

const KIND_BY_EVENT: Record<string, ActivityEvent["kind"] | undefined> = {
  Deposited: "deposit",
  Withdrawn: "withdraw",
  PartialWithdrawal: "partial-withdraw",
  YieldClaimed: "claim",
  Harvested: "harvest",
  Merged: "rebalance",
  Settled: "settle",
};
