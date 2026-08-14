"use client";

import { HeartHandshake, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsdc } from "@/lib/format";
import { keeperActions, type VaultStatus, type VaultView } from "@/lib/protocol";

/**
 * Permissionless upkeep, framed as community maintenance. None of these grant
 * any authority — calling one is doing the pool a favour, not taking a risk
 * (guide §7.5).
 */
export function KeeperPanel({
  vault,
  status,
  busy,
  onRun,
}: {
  vault: VaultView;
  status: VaultStatus;
  busy: boolean;
  onRun: (kind: "rebalance" | "harvest" | "settle") => void;
}) {
  const actions = keeperActions(vault);
  if (actions.length === 0) return null;

  return (
    <Card className="gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <HeartHandshake className="size-4 text-accent-foreground" />
        <p className="text-sm font-medium">Help this vault</p>
        <span className="text-sm text-muted-foreground">
          Anyone can run these — no permissions, no risk
        </span>
      </div>

      <ul className="divide-y">
        {actions.map((action) => (
          <li
            key={action.kind}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {action.kind === "harvest" && action.amount !== undefined
                  ? `${formatUsdc(action.amount, 3)} USDC of yield ready to distribute`
                  : action.kind === "rebalance" && action.amount !== undefined
                    ? `${formatUsdc(action.amount)} of deposits are not yet earning`
                    : "This market has resolved"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{action.reason}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRun(action.kind)}
              disabled={busy || status === "settled"}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {action.label}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
