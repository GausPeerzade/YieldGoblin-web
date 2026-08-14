"use client";

import { useSyncExternalStore } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Gavel,
  RefreshCw,
  Sprout,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatRelative,
  formatShares,
  formatUsdc,
  shortenAddress,
} from "@/lib/format";
import { explorerUrl } from "@/lib/addresses";
import type { ActivityEvent } from "@/lib/activity";
import { cn } from "@/lib/utils";

/** Each event kind measures a different thing — label the unit accordingly. */
function describeAmount(e: ActivityEvent): string {
  switch (e.kind) {
    case "claim":
    case "harvest":
      return `${formatUsdc(e.amount, 4)} USDC`;
    case "rebalance":
      return `${formatUsdc(e.amount)} USDC`;
    case "settle":
      return `${formatUsdc(e.amount)} USDC redeemed`;
    default:
      return `${formatShares(e.amount)} ${e.side?.toUpperCase() ?? ""}`.trim();
  }
}

const META: Record<
  ActivityEvent["kind"],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  deposit: { label: "Deposit", icon: ArrowDownLeft },
  withdraw: { label: "Withdraw", icon: ArrowUpRight },
  "partial-withdraw": { label: "Withdraw", icon: ArrowUpRight },
  claim: { label: "Yield claim", icon: Sprout },
  harvest: { label: "Harvest", icon: Sprout },
  rebalance: { label: "Rebalance", icon: RefreshCw },
  settle: { label: "Settle", icon: Gavel },
};

export function ActivityList({
  events,
  chainId,
  labelFor,
  empty = "No activity yet.",
}: {
  events: ActivityEvent[];
  chainId: number;
  labelFor?: (e: ActivityEvent) => string;
  empty?: string;
}) {
  // Relative times depend on the clock, so resolve them after hydration.
  const now = useNow();

  if (events.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">{empty}</Card>
    );
  }

  return (
    <Card className="gap-0 divide-y p-0">
      {events.map((e) => {
        const meta = META[e.kind];
        const Icon = meta.icon;
        const isYield = e.kind === "claim" || e.kind === "harvest";
        return (
          <div key={e.id} className="flex flex-wrap items-center gap-4 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {meta.label}
                {e.side && !isYield ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-1.5 py-0 text-[11px]",
                      e.side === "yes"
                        ? "border-yes/30 text-yes-foreground"
                        : "border-no/30 text-no-foreground",
                    )}
                  >
                    {e.side.toUpperCase()}
                  </Badge>
                ) : null}
                {e.kind === "partial-withdraw" ? (
                  <Badge variant="outline" className="border-amber-500/40 px-1.5 py-0 text-[11px] text-amber-700 dark:text-amber-400">
                    Partially filled
                  </Badge>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {labelFor
                  ? labelFor(e)
                  : e.actor
                    ? `by ${shortenAddress(e.actor)}`
                    : "Vault upkeep"}
              </p>
            </div>

            <div className="text-right">
              <p className="nums text-sm font-medium">{describeAmount(e)}</p>
              {e.kind === "partial-withdraw" && e.secondary !== undefined ? (
                <p className="nums text-xs text-muted-foreground">
                  {formatShares(e.secondary)} served
                </p>
              ) : null}
            </div>

            <div className="w-24 text-right">
              <p className="text-xs text-muted-foreground">
                {now ? formatRelative(Math.floor(e.timestamp / 1000), now) : "—"}
              </p>
              <a
                href={explorerUrl(chainId, "tx", e.txHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Tx
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

const TICK_MS = 30_000;

/**
 * Wall-clock time, quantised to the tick so the snapshot is referentially
 * stable between renders. Returns null on the server — relative times can't be
 * rendered there without a hydration mismatch.
 */
function useNow() {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, TICK_MS);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / TICK_MS) * TICK_MS,
    () => null,
  );
}
