"use client";

import { TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatApr } from "@/lib/format";
import { sideRates, type VaultView } from "@/lib/protocol";
import { cn } from "@/lib/utils";

/**
 * Live rate for each side.
 *
 * The rates are shown as figures only. How they are arrived at is deliberately
 * not explained in the UI — the numbers are what a depositor needs, and the
 * mechanism behind them is not something the product advertises.
 */
export function RateCards({ vault }: { vault: VaultView }) {
  const { yesApr, noApr } = sideRates(vault);
  const yesHigher = yesApr !== null && noApr !== null && yesApr > noApr;
  const noHigher = yesApr !== null && noApr !== null && noApr > yesApr;

  return (
    <Card className="grid gap-0 divide-y p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <RateCell side="yes" apr={yesApr} highlight={yesHigher} />
      <RateCell side="no" apr={noApr} highlight={noHigher} />
    </Card>
  );
}

function RateCell({
  side,
  apr,
  highlight,
}: {
  side: "yes" | "no";
  apr: number | null;
  highlight: boolean;
}) {
  const isYes = side === "yes";
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-6",
        highlight && (isYes ? "bg-yes-muted/50" : "bg-no-muted/50"),
      )}
    >
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-semibold tracking-wide",
            isYes ? "text-yes-foreground" : "text-no-foreground",
          )}
        >
          {isYes ? "YES" : "NO"} APR
        </p>
        <p
          className={cn(
            "nums mt-1 font-semibold tracking-tight",
            highlight ? "text-5xl" : "text-4xl",
            isYes ? "text-yes" : "text-no",
          )}
        >
          {formatApr(apr)}
        </p>
        <p className="mt-2 max-w-[24ch] text-sm leading-snug text-muted-foreground">
          {apr === null
            ? `No ${isYes ? "YES" : "NO"} deposited yet — be the first`
            : "Current rate, paid in USDC"}
        </p>
      </div>
      {highlight ? (
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            isYes ? "bg-yes-muted text-yes" : "bg-no-muted text-no",
          )}
          aria-hidden
        >
          <TrendingUp className="size-5" />
        </span>
      ) : null}
    </div>
  );
}
