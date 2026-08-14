"use client";

import { useSwitchChain } from "wagmi";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsWrongNetwork, useTargetChainId } from "@/hooks/use-target-chain";

/**
 * Vault state is public, so the app keeps reading Base whatever network the
 * wallet is on — but transactions still need the wallet there. Say so, rather
 * than letting a deposit fail at signing time.
 */
export function WrongNetworkBanner() {
  const wrongNetwork = useIsWrongNetwork();
  const targetChainId = useTargetChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!wrongNetwork) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Your wallet is on another network.</span>{" "}
        <span className="text-muted-foreground">
          You can browse freely, but depositing or withdrawing needs Base.
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => switchChain({ chainId: targetChainId })}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Switch to Base
      </Button>
    </div>
  );
}
