"use client";

import Link from "next/link";
import { CalendarClock, Lock, TrendingUp } from "lucide-react";

import { TokenIcon } from "@/components/brand/token-icon";
import { LimitlessBadge } from "@/components/protocol/limitless-link";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import {
  formatApr,
  formatDeadline,
  formatShares,
  formatUsdc,
  formatUsdCompact,
} from "@/lib/format";
import {
  derivePool,
  sideRates,
  type UserPosition,
  type VaultView,
} from "@/lib/protocol";
import { cn } from "@/lib/utils";

export function MarketRow({
  vault,
  position,
  connected,
}: {
  vault: VaultView;
  position: UserPosition;
  connected: boolean;
}) {
  const { tvl } = derivePool(vault);
  const { yesApr, noApr } = sideRates(vault);
  const yesHigher = yesApr !== null && noApr !== null && yesApr > noApr;
  const noHigher = yesApr !== null && noApr !== null && noApr > yesApr;
  const href = `/vault/${vault.address}`;
  const hasPosition = position.yesBalance > 0n || position.noBalance > 0n;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,2.1fr)_auto_auto_minmax(0,1.4fr)_auto] lg:items-center lg:gap-6">
        {/* Market */}
        <div className="flex items-start gap-3.5">
          <TokenIcon symbol={vault.market.symbol} size={40} />
          <div className="min-w-0">
            <Link
              href={href}
              className="text-[15px] font-semibold leading-snug tracking-tight hover:underline"
            >
              {vault.market.question}
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Closes {formatDeadline(vault.deadline)}
              </span>
              <LimitlessBadge vault={vault} />
            </div>
          </div>
        </div>

        {/* TVL */}
        <div className="lg:min-w-24">
          <p className="text-xs text-muted-foreground">Vault TVL</p>
          <p className="nums mt-0.5 font-semibold">{formatUsdCompact(tvl)}</p>
        </div>

        {/* Rates */}
        <div className="flex gap-6 lg:min-w-52">
          <RateCell label="YES APR" apr={yesApr} side="yes" highlight={yesHigher} />
          <RateCell label="NO APR" apr={noApr} side="no" highlight={noHigher} />
        </div>

        {/* Position */}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Your position</p>
          {!connected ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="size-3.5" />
              Connect wallet to see your position
            </p>
          ) : hasPosition ? (
            <dl className="mt-1 space-y-0.5 text-sm">
              <PositionLine label="YES deposited" value={`${formatShares(position.yesBalance)} YES`} />
              <PositionLine label="NO deposited" value={`${formatShares(position.noBalance)} NO`} />
              <PositionLine
                label="Claimable"
                value={`${formatUsdc(position.pendingYield)} USDC`}
                accent
              />
            </dl>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing deposited yet
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 lg:w-36 lg:flex-col">
          <ButtonLink className="flex-1" href={`${href}?tab=deposit`}>
            Deposit
          </ButtonLink>
          <ButtonLink variant="outline" className="flex-1" href={href}>
            View Vault
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

function RateCell({
  label,
  apr,
  side,
  highlight,
}: {
  label: string;
  apr: number | null;
  side: "yes" | "no";
  highlight: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "nums mt-0.5 text-lg font-semibold tracking-tight",
          side === "yes" ? "text-yes" : "text-no",
        )}
      >
        {formatApr(apr)}
      </p>
      {highlight ? (
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
            side === "yes"
              ? "bg-yes-muted text-yes-foreground"
              : "bg-no-muted text-no-foreground",
          )}
        >
          <TrendingUp className="size-3" />
          Higher yield
        </span>
      ) : null}
    </div>
  );
}

function PositionLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("nums font-medium", accent && "text-usdc")}>{value}</dd>
    </div>
  );
}
