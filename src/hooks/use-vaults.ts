"use client";

import { useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useSimulateContract,
} from "wagmi";
import type { Address, Hex } from "viem";

import { pairYieldVaultAbi } from "@/lib/abis/pairYieldVault";
import { vaultFactoryAbi } from "@/lib/abis/vaultFactory";
import { conditionalTokensAbi } from "@/lib/abis/conditionalTokens";
import { aavePoolAbi } from "@/lib/abis/aavePool";
import { aaveAdapterAbi } from "@/lib/abis/aaveAdapter";
import { addressesFor, ZERO_ADDRESS } from "@/lib/addresses";
import { shortenHex } from "@/lib/format";
import {
  DEFAULT_CONSTANTS,
  DEPLOYMENTS,
  deploymentByCondition,
  deploymentByVault,
} from "@/lib/deployments";
import {
  EMPTY_POSITION,
  type UserPosition,
  type VaultView,
} from "@/lib/protocol";
import { useVaultEvents } from "@/hooks/use-vault-events";
import { useTargetChainId } from "@/hooks/use-target-chain";

/**
 * Data layer. Everything here reads live chain state — the factory registry is
 * the source of truth for which vaults exist, and `src/lib/deployments.ts`
 * supplies only the off-chain metadata the contracts cannot hold.
 */

/** Aave v3 USDC supply APR as a fraction (guide §5, step 1). */
export function useAaveApr() {
  const chainId = useTargetChainId();
  const { aavePool, usdc } = addressesFor(chainId);

  const { data } = useReadContract({
    abi: aavePoolAbi,
    address: aavePool,
    functionName: "getReserveData",
    args: [usdc],
    chainId,
    query: { enabled: aavePool !== ZERO_ADDRESS, staleTime: 60_000 },
  });

  // currentLiquidityRate is an APR in RAY (1e27), not an APY — the vault
  // withdraws yield as it is recognised, so interest is simple, not compounded.
  return data ? Number(data.currentLiquidityRate) / 1e27 : null;
}

export function useVaultAddresses() {
  const chainId = useTargetChainId();
  const { vaultFactory } = addressesFor(chainId);
  const enabled = vaultFactory !== ZERO_ADDRESS;

  /**
   * Vaults we already know about, from our own compiled registry. Using these
   * for the first paint skips two dependent round trips — `vaultCount()` then
   * `vaults(i)` — before any vault state can even be requested.
   *
   * This is not a trust shortcut: the factory enumeration below still runs, and
   * once it lands it is the authority. A seeded address that the registry does
   * not confirm is dropped.
   */
  const seeded = useMemo(
    () =>
      DEPLOYMENTS.filter((d) => d.chainId === chainId).map((d) => d.vault),
    [chainId],
  );

  const { data: count, isLoading: countLoading } = useReadContract({
    abi: vaultFactoryAbi,
    address: vaultFactory,
    functionName: "vaultCount",
    chainId,
    query: { enabled },
  });

  const { data, isLoading } = useReadContracts({
    contracts: Array.from({ length: Number(count ?? 0n) }, (_, i) => ({
      abi: vaultFactoryAbi,
      address: vaultFactory,
      functionName: "vaults" as const,
      args: [BigInt(i)],
      chainId,
    })),
    query: { enabled: enabled && (count ?? 0n) > 0n },
  });

  return useMemo(() => {
    const onChain = (data ?? [])
      .map((r) => r.result as Address | undefined)
      .filter((a): a is Address => Boolean(a));

    // Once the registry has answered it wins outright; until then the seeds
    // give us something real to render.
    const resolved = data !== undefined;
    const addresses = resolved
      ? onChain
      : Array.from(new Set([...seeded, ...onChain]));

    // Only "loading" when we have nothing to show at all — seeded addresses
    // mean the page can paint immediately.
    const pending =
      enabled && addresses.length === 0 && (countLoading || count === undefined);

    return { addresses, isLoading: pending || (enabled && isLoading && !addresses.length) };
  }, [data, seeded, enabled, count, countLoading, isLoading]);
}

/**
 * The vault implementation is public bytecode, so anyone can deploy a
 * byte-identical clone. `factory.isVault()` is the only authoritative answer to
 * "is this ours" — never render a vault from a URL without it (guide §7).
 */
export function useIsRegisteredVault(address: Address | undefined) {
  const chainId = useTargetChainId();
  const { vaultFactory } = addressesFor(chainId);

  const { data, isLoading } = useReadContract({
    abi: vaultFactoryAbi,
    address: vaultFactory,
    functionName: "isVault",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: Boolean(address) && vaultFactory !== ZERO_ADDRESS },
  });

  // The vault must also point back at the factory we trust.
  const { data: claimedFactory } = useReadContract({
    abi: pairYieldVaultAbi,
    address,
    functionName: "factory",
    chainId,
    query: { enabled: Boolean(address) },
  });

  const registered = data === true;
  const pointsBack =
    claimedFactory === undefined ||
    (claimedFactory as Address)?.toLowerCase() === vaultFactory.toLowerCase();

  return { verified: registered && pointsBack, isLoading };
}

export function useVaults(): { vaults: VaultView[]; isLoading: boolean } {
  const chainId = useTargetChainId();
  const { addresses, isLoading: listLoading } = useVaultAddresses();
  const aaveApr = useAaveApr();

  const { data, isLoading } = useReadContracts({
    contracts: addresses.flatMap((address) =>
      VAULT_FIELDS.map((functionName) => ({
        abi: pairYieldVaultAbi,
        address,
        functionName,
        chainId,
      })),
    ),
    query: {
      enabled: addresses.length > 0,
      refetchInterval: 30_000,
      // Never blank a populated list while refetching.
      placeholderData: keepPreviousData,
    },
  });

  return useMemo(() => {
    // Addresses known but their state not fetched yet is still loading.
    const pending = listLoading || isLoading || (addresses.length > 0 && !data);
    if (!data) return { vaults: [], isLoading: pending };

    const vaults = addresses
      .map((address, i) =>
        assembleVault(
          address,
          chainId,
          data.slice(i * VAULT_FIELDS.length, (i + 1) * VAULT_FIELDS.length),
          aaveApr ?? 0,
        ),
      )
      .filter((v): v is VaultView => v !== null);

    return { vaults, isLoading: false };
  }, [data, addresses, chainId, aaveApr, listLoading, isLoading]);
}

export function useVault(address: string | undefined): {
  vault: VaultView | undefined;
  isLoading: boolean;
} {
  const chainId = useTargetChainId();
  const aaveApr = useAaveApr();
  const { address: user } = useAccount();
  const vaultAddress = address as Address | undefined;
  const { ctf } = addressesFor(chainId);
  const deployment = deploymentByVault(chainId, address);

  const { data, isLoading } = useReadContracts({
    contracts: VAULT_FIELDS.map((functionName) => ({
      abi: pairYieldVaultAbi,
      address: vaultAddress,
      functionName,
      chainId,
    })),
    query: {
      enabled: Boolean(vaultAddress),
      refetchInterval: 30_000,
      placeholderData: keepPreviousData,
    },
  });

  const conditionId = data?.[VAULT_FIELDS.indexOf("conditionId")]?.result as
    | Hex
    | undefined;
  const adapter = data?.[VAULT_FIELDS.indexOf("adapter")]?.result as
    | Address
    | undefined;

  /**
   * The CTF can report an outcome before anyone has called `settle()`. That
   * gap is a real UI state, so it is read directly rather than inferred from
   * `settled()` (guide §6).
   */
  const { data: payoutDenominator } = useReadContract({
    abi: conditionalTokensAbi,
    address: ctf,
    functionName: "payoutDenominator",
    args: conditionId ? [conditionId] : undefined,
    chainId,
    query: { enabled: Boolean(conditionId), refetchInterval: 60_000 },
  });

  /** Live principal sitting in Aave — the truest read of what has accrued. */
  const { data: adapterAssets } = useReadContract({
    abi: aaveAdapterAbi,
    address: adapter,
    functionName: "totalAssets",
    chainId,
    query: {
      enabled: Boolean(adapter) && adapter !== ZERO_ADDRESS,
      refetchInterval: 30_000,
    },
  });

  /**
   * `harvest()` static-calls false when Aave cannot currently return funds.
   * A simulation error is not treated as unhealthy — that would raise a false
   * alarm on an RPC hiccup.
   */
  const { data: harvestSim } = useSimulateContract({
    abi: pairYieldVaultAbi,
    address: vaultAddress,
    functionName: "harvest",
    account: user,
    chainId,
    query: {
      enabled: Boolean(vaultAddress),
      refetchInterval: 60_000,
      retry: false,
    },
  });

  return useMemo(() => {
    if (!data || !vaultAddress) return { vault: undefined, isLoading };

    const base_ = assembleVault(vaultAddress, chainId, data, aaveApr ?? 0);
    if (!base_) return { vault: undefined, isLoading: false };

    return {
      vault: {
        ...base_,
        resolved: base_.settled || (payoutDenominator ?? 0n) !== 0n,
        venueHealthy: harvestSim?.result !== false,
        adapterAssets: adapterAssets as bigint | undefined,
        // Config is authoritative for the deadline when the vault reports none.
        deadline:
          base_.deadline > 0n
            ? base_.deadline
            : BigInt(deployment?.resolvesAt ?? 0),
      },
      isLoading: false,
    };
  }, [
    data,
    vaultAddress,
    chainId,
    aaveApr,
    payoutDenominator,
    harvestSim,
    adapterAssets,
    deployment,
    isLoading,
  ]);
}

export function usePosition(vault: VaultView | undefined): {
  position: UserPosition;
  isLoading: boolean;
} {
  const chainId = useTargetChainId();
  const { address: user } = useAccount();
  const { ctf } = addressesFor(chainId);

  const enabled = Boolean(vault) && Boolean(user);

  const { data, isLoading } = useReadContracts({
    contracts:
      vault && user
        ? [
            { abi: pairYieldVaultAbi, address: vault.address, functionName: "yesBalance", args: [user] },
            { abi: pairYieldVaultAbi, address: vault.address, functionName: "noBalance", args: [user] },
            { abi: pairYieldVaultAbi, address: vault.address, functionName: "pendingYield", args: [user] },
            { abi: pairYieldVaultAbi, address: vault.address, functionName: "maxWithdraw", args: [user, true] },
            { abi: pairYieldVaultAbi, address: vault.address, functionName: "maxWithdraw", args: [user, false] },
            { abi: conditionalTokensAbi, address: ctf, functionName: "balanceOf", args: [user, vault.yesId] },
            { abi: conditionalTokensAbi, address: ctf, functionName: "balanceOf", args: [user, vault.noId] },
            { abi: conditionalTokensAbi, address: ctf, functionName: "isApprovedForAll", args: [user, vault.address] },
          ].map((c) => ({ ...c, chainId }))
        : [],
    query: {
      enabled,
      refetchInterval: 12_000,
      placeholderData: keepPreviousData,
    },
  });

  // Lifetime claims aren't stored on-chain — they're summed from events.
  const { lifetimeClaimed } = useVaultEvents(vault);

  return useMemo(() => {
    if (!vault) return { position: EMPTY_POSITION, isLoading: false };
    if (!user || !data) return { position: EMPTY_POSITION, isLoading };

    const n = (i: number) => (data[i]?.result as bigint | undefined) ?? 0n;
    return {
      position: {
        yesBalance: n(0),
        noBalance: n(1),
        pendingYield: n(2),
        maxWithdrawYes: n(3),
        maxWithdrawNo: n(4),
        walletYes: n(5),
        walletNo: n(6),
        approved: data[7]?.result === true,
        lifetimeClaimed,
      },
      isLoading: false,
    };
  }, [vault, user, data, lifetimeClaimed, isLoading]);
}

// ── internals ───────────────────────────────────────────────────────────────

const VAULT_FIELDS = [
  "totalYes",
  "totalNo",
  "mergedPairs",
  "idleUsdc",
  "unrealisedYield",
  "yieldReserve",
  "settled",
  "yesPayoutWad",
  "noPayoutWad",
  "conditionId",
  "yesId",
  "noId",
  "deadline",
  "perfFeeBps",
  "adapter",
] as const;

type ReadResult = { result?: unknown; status: "success" | "failure" };

/**
 * Turns a batch of reads into a `VaultView`. Returns null when the core reads
 * failed — a half-populated vault is worse than none.
 */
function assembleVault(
  address: Address,
  chainId: number,
  results: readonly ReadResult[],
  aaveApr: number,
): VaultView | null {
  const get = (name: (typeof VAULT_FIELDS)[number]) =>
    results[VAULT_FIELDS.indexOf(name)]?.result;
  const big = (name: (typeof VAULT_FIELDS)[number]) =>
    (get(name) as bigint | undefined) ?? 0n;

  const conditionId = get("conditionId") as Hex | undefined;
  if (!conditionId) return null;

  const deployment =
    deploymentByCondition(chainId, conditionId) ??
    deploymentByVault(chainId, address);

  return {
    address,
    chainId,
    conditionId,
    yesId: big("yesId"),
    noId: big("noId"),
    adapter: (get("adapter") as Address) ?? ZERO_ADDRESS,
    deadline:
      big("deadline") > 0n ? big("deadline") : BigInt(deployment?.resolvesAt ?? 0),
    perfFeeBps: Number((get("perfFeeBps") as number | undefined) ?? 0),
    // Question text and ticker live off-chain, in the Limitless market. Without
    // a registry entry, name the vault by its condition rather than inventing a
    // title — a wrong-looking question is worse than an honest identifier.
    market: {
      question: deployment?.title ?? `Market ${shortenHex(conditionId, 8)}`,
      symbol: deployment?.symbol ?? "USDC",
      venue: "limitless",
      venueUrl: deployment
        ? `https://limitless.exchange/markets/${deployment.limitlessSlug}`
        : undefined,
    },
    hasMetadata: Boolean(deployment),
    totalYes: big("totalYes"),
    totalNo: big("totalNo"),
    mergedPairs: big("mergedPairs"),
    idleUsdc: big("idleUsdc"),
    idleYes: 0n,
    idleNo: 0n,
    unrealisedYield: big("unrealisedYield"),
    yieldReserve: big("yieldReserve"),
    settled: get("settled") === true,
    resolved: get("settled") === true,
    yesPayoutWad: big("yesPayoutWad"),
    noPayoutWad: big("noPayoutWad"),
    venueHealthy: true,
    aaveApr,
    constants: deployment?.constants ?? DEFAULT_CONSTANTS,
    testDeployment: deployment?.testDeployment,
  };
}
