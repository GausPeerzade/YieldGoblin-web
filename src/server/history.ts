import { parseAbiItem, type Address, type Hex } from "viem";
import { base } from "viem/chains";

import type { ActivityEvent, YieldPoint } from "@/lib/activity";
import { deploymentByVault, earliestBlock } from "@/lib/deployments";
import { keyedTtlCache, serverClient, serverLogsClient } from "./chain";
import { getReadModel } from "./registry";

/**
 * Vault history, decoded from logs server-side and cached — the scan happens
 * once per TTL for everyone instead of once per visitor. History is
 * append-only and changes a few times a day, so a 60s TTL is generous.
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

/** Public Base caps eth_getLogs at a 10,000-block span. */
const CHUNK = 9_000n;
/** Backstop so an unbounded range can't fan out into hundreds of requests. */
const MAX_CHUNKS = 120;
/**
 * The public logs endpoint rate-limits concurrent bursts — a Promise.all of
 * twenty getLogs comes back throttled. A few at a time completes reliably.
 */
const CONCURRENCY = 3;

async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export type VaultHistory = {
  activity: ActivityEvent[];
  yieldSeries: YieldPoint[];
};

// ── Deploy-block discovery ──────────────────────────────────────────────────

/**
 * Where to start scanning. Known deployments carry their block in config; for
 * a permissionlessly-created vault we bisect on "when did code appear at this
 * address" — ~25 archive getCode calls, once per vault per instance, constant
 * cost no matter how old the chain gets.
 */
const deployBlockCache = new Map<string, bigint>();

async function findDeployBlock(
  vault: Address,
  chainId: number,
): Promise<bigint> {
  const cached = deployBlockCache.get(vault.toLowerCase());
  if (cached !== undefined) return cached;

  const fromConfig = deploymentByVault(chainId, vault)?.deployBlock;
  if (fromConfig !== undefined) {
    deployBlockCache.set(vault.toLowerCase(), fromConfig);
    return fromConfig;
  }

  const client = serverClient(chainId);
  const latest = await client.getBlockNumber();
  // Nothing can predate the factory itself, so that bounds the search.
  let lo = earliestBlock(chainId);
  let hi = latest;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const code = await client.getBytecode({ address: vault, blockNumber: mid });
    if (code && code.length > 2) hi = mid;
    else lo = mid + 1n;
  }
  deployBlockCache.set(vault.toLowerCase(), lo);
  return lo;
}

// ── Scan + decode ───────────────────────────────────────────────────────────

const historyCache = keyedTtlCache<VaultHistory>(60_000);

/**
 * Incremental scan state, per vault per instance. Only the tail beyond
 * `scannedTo` is fetched on refresh, so steady-state cost is one small
 * getLogs regardless of how old the vault is. A failed chunk throws rather
 * than being swallowed — caching an empty history because the RPC throttled
 * once is exactly the silent failure this file must not have.
 */
const scanState = new Map<
  string,
  { scannedTo: bigint; logs: Awaited<ReturnType<PublicClientLogs>> }
>();
type PublicClientLogs = () => Promise<
  Awaited<ReturnType<ReturnType<typeof serverLogsClient>["getLogs"]>>
>;

export async function getVaultHistory(
  vault: Address,
  chainId: number = base.id,
): Promise<VaultHistory> {
  return historyCache(`${chainId}:${vault.toLowerCase()}`, async () => {
    const logsClient = serverLogsClient(chainId);
    const key = `${chainId}:${vault.toLowerCase()}`;
    const prior = scanState.get(key);
    const deployBlock = await findDeployBlock(vault, chainId);
    const fromBlock = prior ? prior.scannedTo + 1n : deployBlock;
    const latest = await logsClient.getBlockNumber();

    const spans: { from: bigint; to: bigint }[] = [];
    for (let start = fromBlock; start <= latest; start += CHUNK + 1n) {
      spans.push({ from: start, to: start + CHUNK > latest ? latest : start + CHUNK });
    }
    const scanned = spans.length > MAX_CHUNKS ? spans.slice(-MAX_CHUNKS) : spans;

    const batches = await mapLimited(scanned, CONCURRENCY, ({ from, to }) =>
      logsClient.getLogs({
        address: vault,
        events: Object.values(EVENTS),
        fromBlock: from,
        toBlock: to,
      }),
    );

    const logs = [...(prior?.logs ?? []), ...batches.flat()];
    scanState.set(key, { scannedTo: latest, logs });

    // Timestamps from a deduped block set, not one call per log.
    const blocks = [...new Set(logs.map((l) => l.blockNumber))];
    const times = new Map<bigint, number>();
    await Promise.all(
      blocks.map(async (bn) => {
        if (bn === null) return;
        const b = await logsClient.getBlock({ blockNumber: bn });
        times.set(bn, Number(b.timestamp) * 1000);
      }),
    );

    const activity: ActivityEvent[] = [];
    const harvests: { t: number; amount: bigint }[] = [];

    for (const log of logs) {
      const t = times.get(log.blockNumber ?? 0n) ?? 0;
      const id = `${log.transactionHash}-${log.logIndex}`;
      const txHash = (log.transactionHash ?? "0x") as Hex;
      const args = (log as unknown as { args: Record<string, unknown> }).args;
      const name = (log as unknown as { eventName: string }).eventName;

      switch (name) {
        case "Deposited":
        case "Withdrawn":
          activity.push({
            id,
            kind: name === "Deposited" ? "deposit" : "withdraw",
            vault,
            txHash,
            timestamp: t,
            actor: args.user as Address,
            side: args.isYes ? "yes" : "no",
            amount: args.amount as bigint,
          });
          break;
        case "PartialWithdrawal":
          activity.push({
            id,
            kind: "partial-withdraw",
            vault,
            txHash,
            timestamp: t,
            actor: args.user as Address,
            side: args.isYes ? "yes" : "no",
            amount: args.requested as bigint,
            secondary: args.served as bigint,
          });
          break;
        case "YieldClaimed":
          activity.push({
            id,
            kind: "claim",
            vault,
            txHash,
            timestamp: t,
            actor: args.user as Address,
            amount: args.amount as bigint,
          });
          break;
        case "Harvested": {
          const distributed =
            (args.toYesSide as bigint) + (args.toNoSide as bigint);
          activity.push({
            id, kind: "harvest", vault, txHash, timestamp: t, amount: distributed,
          });
          harvests.push({ t, amount: distributed });
          break;
        }
        case "Merged":
          activity.push({
            id, kind: "rebalance", vault, txHash, timestamp: t,
            amount: args.pairs as bigint,
          });
          break;
        case "Settled":
          activity.push({
            id, kind: "settle", vault, txHash, timestamp: t,
            amount: args.redeemed as bigint,
          });
          break;
      }
    }

    activity.sort((a, b) => b.timestamp - a.timestamp);
    harvests.sort((a, b) => a.t - b.t);

    let acc = 0n;
    const yieldSeries: YieldPoint[] = harvests.map((h) => {
      acc += h.amount;
      return { t: h.t, cumulative: acc };
    });

    return { activity, yieldSeries };
  });
}

/** Merged feed across every visible vault, for the Activity page. */
export async function getGlobalActivity(
  chainId: number = base.id,
): Promise<ActivityEvent[]> {
  const vaults = await getReadModel(chainId);
  const histories = await Promise.all(
    vaults.map((v) => getVaultHistory(v.address, chainId).catch(() => null)),
  );
  return histories
    .filter((h): h is VaultHistory => h !== null)
    .flatMap((h) => h.activity)
    .sort((a, b) => b.timestamp - a.timestamp);
}
