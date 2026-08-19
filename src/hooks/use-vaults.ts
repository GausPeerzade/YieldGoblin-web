"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { Address } from "viem";

import { conditionalTokensAbi } from "@/lib/abis/conditionalTokens";
import { pairYieldVaultAbi } from "@/lib/abis/pairYieldVault";
import { vaultFactoryAbi } from "@/lib/abis/vaultFactory";
import { addressesFor, ZERO_ADDRESS } from "@/lib/addresses";
import {
  EMPTY_POSITION,
  type UserPosition,
  type VaultView,
} from "@/lib/protocol";
import { vaultFromWire, type VaultWire } from "@/lib/wire";
import { useTargetChainId } from "@/hooks/use-target-chain";
import { useVaultEvents } from "@/hooks/use-vault-events";

/**
 * Data layer, API-first.
 *
 * Public vault state is identical for every visitor, so it is read from
 * `/api/vaults` — computed once server-side, CDN-cached, shared. The browser
 * talks to the chain directly only for what belongs to this wallet: balances,
 * allowances and the pre-flight checks that gate transactions. Those must
 * never be cached anywhere shared, and never go stale before a signature.
 */

async function fetchVaults(ensure?: string): Promise<VaultView[]> {
  const url = ensure ? `/api/vaults?ensure=${ensure}` : "/api/vaults";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`vaults api ${res.status}`);
  const json = (await res.json()) as { vaults: VaultWire[] };
  return json.vaults.map(vaultFromWire);
}

export function useVaults(): { vaults: VaultView[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["vaults-api"],
    queryFn: () => fetchVaults(),
    refetchInterval: 30_000,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
  return { vaults: data ?? [], isLoading: isLoading && !data };
}

export function useVault(address: string | undefined): {
  vault: VaultView | undefined;
  isLoading: boolean;
} {
  const { vaults, isLoading } = useVaults();

  const found = useMemo(
    () =>
      address
        ? vaults.find((v) => v.address.toLowerCase() === address.toLowerCase())
        : undefined,
    [vaults, address],
  );

  // A vault created moments ago may not be in the cached list yet — ask the
  // server to verify it against the factory and include it.
  const wantEnsure =
    Boolean(address) &&
    !isLoading &&
    !found &&
    /^0x[0-9a-fA-F]{40}$/.test(address ?? "");
  const { data: ensured, isLoading: ensuring } = useQuery({
    queryKey: ["vaults-api-ensure", address?.toLowerCase()],
    queryFn: () => fetchVaults(address),
    enabled: wantEnsure,
    staleTime: 15_000,
  });

  const ensuredVault = useMemo(
    () =>
      address && ensured
        ? ensured.find((v) => v.address.toLowerCase() === address.toLowerCase())
        : undefined,
    [ensured, address],
  );

  return {
    vault: found ?? ensuredVault,
    isLoading: isLoading || (wantEnsure && ensuring),
  };
}

/**
 * The factory registry is the only authoritative answer to "is this ours" —
 * the vault implementation is public bytecode, so byte-identical clones are
 * possible. Presence in the server list already implies registration (the
 * list is built from the factory); the direct chain read only runs for
 * addresses the list doesn't know, so a fresh vault still verifies instantly.
 */
export function useIsRegisteredVault(address: Address | undefined) {
  const chainId = useTargetChainId();
  const { vaultFactory } = addressesFor(chainId);
  const { vaults, isLoading: listLoading } = useVaults();

  const inList =
    Boolean(address) &&
    vaults.some((v) => v.address.toLowerCase() === address?.toLowerCase());

  const { data, isLoading } = useReadContract({
    abi: vaultFactoryAbi,
    address: vaultFactory,
    functionName: "isVault",
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled:
        Boolean(address) &&
        !inList &&
        !listLoading &&
        vaultFactory !== ZERO_ADDRESS,
    },
  });

  if (inList) return { verified: true, isLoading: false };
  return { verified: data === true, isLoading: listLoading || isLoading };
}

/**
 * Wallet-scoped reads. These stay in the browser on purpose: `maxWithdraw`
 * and the approval flag gate real transactions, so they must be fresh and
 * per-user — a cached pre-flight is how users get reverts they can't explain.
 */
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

  // Lifetime claims aren't stored on-chain — summed from the history feed.
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
