"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import type { ActivityEvent, YieldPoint } from "@/lib/activity";
import type { VaultView } from "@/lib/protocol";
import {
  activityFromWire,
  yieldPointFromWire,
  type ActivityWire,
  type YieldPointWire,
} from "@/lib/wire";

/**
 * Vault history, from the server-side read API.
 *
 * The log scan and decode happen once on the server and are CDN-cached; the
 * browser downloads a small JSON feed instead of issuing chunked
 * `eth_getLogs` itself. Per-user figures (lifetime claimed) are derived here
 * from the shared feed rather than fetched separately.
 */

export type VaultHistory = {
  activity: ActivityEvent[];
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
  const { address: user } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ["vault-history", vault?.address.toLowerCase()],
    enabled: Boolean(vault),
    staleTime: 60_000,
    refetchInterval: 300_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await fetch(`/api/vault/${vault!.address}/history`);
      if (!res.ok) throw new Error(`history api ${res.status}`);
      const json = (await res.json()) as {
        activity: ActivityWire[];
        yieldSeries: YieldPointWire[];
      };
      return {
        activity: json.activity.map(activityFromWire),
        yieldSeries: json.yieldSeries.map(yieldPointFromWire),
      };
    },
  });

  return useMemo(() => {
    if (!data) return { ...EMPTY, isLoading: Boolean(vault) && isLoading };
    const lifetimeClaimed = user
      ? data.activity
          .filter(
            (e) =>
              e.kind === "claim" &&
              e.actor?.toLowerCase() === user.toLowerCase(),
          )
          .reduce((sum, e) => sum + e.amount, 0n)
      : 0n;
    return { ...data, lifetimeClaimed, isLoading: false };
  }, [data, user, vault, isLoading]);
}

/** Merged feed across every vault, for the Activity page. */
export function useAllVaultEvents(): {
  activity: ActivityEvent[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["global-activity"],
    staleTime: 30_000,
    refetchInterval: 120_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await fetch("/api/activity");
      if (!res.ok) throw new Error(`activity api ${res.status}`);
      const json = (await res.json()) as { activity: ActivityWire[] };
      return json.activity.map(activityFromWire);
    },
  });

  return { activity: data ?? [], isLoading: isLoading && !data };
}
