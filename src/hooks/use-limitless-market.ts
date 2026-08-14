"use client";

import { useQuery } from "@tanstack/react-query";

import { deploymentByVault } from "@/lib/deployments";
import { useTargetChainId } from "@/hooks/use-target-chain";
import type { VaultView } from "@/lib/protocol";

export type LimitlessOdds = {
  found: boolean;
  title: string | null;
  slug: string | null;
  /** 0–1. YES and NO sum to 1. */
  yesPrice: number | null;
  noPrice: number | null;
  volume: string | null;
  expirationTimestamp: number | null;
};

/**
 * Live market odds, via our own proxy route.
 *
 * Context only: the vault neither knows nor cares about the odds — they change
 * neither the yield nor the principal a depositor gets back. Never let them
 * imply anything about the deposit's value.
 */
export function useLimitlessMarket(vault: VaultView | undefined) {
  const chainId = useTargetChainId();
  const deployment = deploymentByVault(chainId, vault?.address);
  const conditionId = vault?.conditionId ?? deployment?.conditionId;

  const { data, isLoading } = useQuery<LimitlessOdds>({
    queryKey: ["limitless-market", conditionId, deployment?.limitlessSlug],
    enabled: Boolean(conditionId),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (conditionId) params.set("conditionId", conditionId);
      if (deployment?.limitlessSlug) params.set("slug", deployment.limitlessSlug);
      const res = await fetch(`/api/limitless?${params}`);
      if (!res.ok) throw new Error(`limitless ${res.status}`);
      return res.json();
    },
  });

  return { odds: data?.found ? data : undefined, isLoading };
}
