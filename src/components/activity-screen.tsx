"use client";

import { useMemo } from "react";

import { ActivityList } from "@/components/vault/activity-list";
import { useTargetChainId } from "@/hooks/use-target-chain";
import { useAllVaultEvents } from "@/hooks/use-vault-events";
import { useVaults } from "@/hooks/use-vaults";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivityScreen() {
  const chainId = useTargetChainId();
  const { vaults } = useVaults();
  const { activity, isLoading } = useAllVaultEvents();

  const questionFor = useMemo(() => {
    const byAddress = new Map(
      vaults.map((v) => [v.address.toLowerCase(), v.market.question]),
    );
    return (addr: string) => byAddress.get(addr.toLowerCase()) ?? addr;
  }, [vaults]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1.5 text-muted-foreground">
          Deposits, withdrawals, harvests and claims across every vault.
        </p>
      </header>

      <div className="mt-8">
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : (
          <ActivityList
            events={activity}
            chainId={chainId}
            labelFor={(e) => questionFor(e.vault)}
          />
        )}
      </div>
    </div>
  );
}
