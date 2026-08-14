"use client";

import { CircleCheck, CircleX, Clock, DollarSign, Loader2 } from "lucide-react";

import { UsdcIcon } from "@/components/brand/token-icon";
import { RateCards } from "@/components/protocol/rate-cards";
import { IdleNotice } from "@/components/protocol/status-banner";
import {
  DistributionFloorNotice,
  TestDeploymentNotice,
} from "@/components/vault/distribution-floor";
import { KeeperPanel } from "@/components/vault/keeper-panel";
import { MarketOdds } from "@/components/vault/market-odds";
import { YieldChart } from "@/components/vault/yield-chart";
import { useTickingYield } from "@/components/vault/claim-yield-card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { formatShares, formatUsd, formatUsdc } from "@/lib/format";
import {
  derivePool,
  positionValue,
  projectYield,
  sideRates,
  type UserPosition,
  type VaultStatus,
  type VaultView,
} from "@/lib/protocol";

export function OverviewTab({
  vault,
  position,
  status,
  yieldSeries,
  busy,
  onClaimYield,
  onKeeper,
}: {
  vault: VaultView;
  position: UserPosition;
  status: VaultStatus;
  /** Cumulative distributed yield, summed from `Harvested` events. */
  yieldSeries: { t: number; cumulative: bigint }[];
  busy: boolean;
  onClaimYield: () => void;
  onKeeper: (kind: "rebalance" | "harvest" | "settle") => void;
}) {
  const pool = derivePool(vault);
  const { yesApr, noApr } = sideRates(vault);
  const live = useTickingYield(vault, position);

  const hourly =
    projectYield(position.yesBalance, yesApr, "hour") +
    projectYield(position.noBalance, noApr, "hour");

  // A matched pair redeems to $1, not $2 — summing both sides double-counts.
  const value = positionValue(position.yesBalance, position.noBalance);
  const totalEarned = position.pendingYield + position.lifetimeClaimed;

  return (
    <div className="space-y-4">
      <DistributionFloorNotice vault={vault} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RateCards vault={vault} />

        <Card className="gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Total earned</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Claimable now</p>
              <p className="nums mt-2 text-3xl font-semibold tracking-tight">
                {formatUsdc(live, 3)}{" "}
                <span className="text-lg font-medium text-muted-foreground">
                  USDC
                </span>
              </p>
              <Button
                className="mt-3"
                onClick={onClaimYield}
                disabled={busy || position.pendingYield === 0n}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Claim Yield
              </Button>
            </div>
            <div className="min-w-[9rem] flex-1">
              <YieldChart data={yieldSeries} />
            </div>
          </div>
          <dl className="grid gap-1.5 border-t pt-3 text-sm">
            <Line label="Total earned" value={`${formatUsdc(totalEarned, 3)} USDC`} />
            <Line
              label="Lifetime claimed"
              value={`${formatUsdc(position.lifetimeClaimed, 3)} USDC`}
            />
          </dl>
        </Card>
      </div>

      <Card className="gap-5 p-5 sm:p-6">
        <p className="text-sm font-medium">Your holdings in this market</p>
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0">
          <Holding
            icon={<CircleCheck className="size-4 text-yes" />}
            label="YES deposited"
            value={`${formatShares(position.yesBalance)} YES`}
          />
          <Holding
            icon={<CircleX className="size-4 text-no" />}
            label="NO deposited"
            value={`${formatShares(position.noBalance)} NO`}
          />
          <Holding
            icon={<DollarSign className="size-4 text-usdc" />}
            label="Position value"
            value={formatUsd(value.paired)}
            sub="Your shares are returned unchanged"
          />
        </div>
        <p className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          Earning about {formatUsdc(hourly, 4)} USDC per hour — your shares
          themselves are unchanged.
        </p>
      </Card>

      <Card className="gap-4 p-5 sm:p-6">
        <p className="text-sm font-medium">Vault totals</p>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <PoolFigure
            label="YES deposited"
            value={formatShares(vault.totalYes, 2)}
            tone="yes"
          />
          <PoolFigure
            label="NO deposited"
            value={formatShares(vault.totalNo, 2)}
            tone="no"
          />
          <PoolFigure label="Value locked" value={formatUsd(pool.tvl)} />
        </div>
        <IdleNotice vault={vault} />
        <TestDeploymentNotice vault={vault} />
      </Card>

      <MarketOdds vault={vault} />

      <KeeperPanel vault={vault} status={status} busy={busy} onRun={onKeeper} />
    </div>
  );
}

function Holding({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="nums mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function PoolFigure({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "yes" | "no";
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "yes"
            ? "nums mt-0.5 font-semibold text-yes"
            : tone === "no"
              ? "nums mt-0.5 font-semibold text-no"
              : "nums mt-0.5 font-semibold"
        }
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="nums font-medium">{value}</dd>
    </div>
  );
}

export function SettlementPanel({
  vault,
  position,
  busy,
  onClaim,
}: {
  vault: VaultView;
  position: UserPosition;
  busy: boolean;
  onClaim: () => void;
}) {
  const principal =
    (position.yesBalance * vault.yesPayoutWad +
      position.noBalance * vault.noPayoutWad) /
    10n ** 18n;

  return (
    <Card className="gap-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <UsdcIcon size={40} />
        <div>
          <p className="text-sm font-medium">This vault has settled</p>
          <p className="text-sm text-muted-foreground">
            This vault has closed out at the rate the market reported.
          </p>
        </div>
      </div>
      <dl className="grid gap-1.5 border-t pt-4 text-sm">
        <Line label="Principal due" value={`${formatUsdc(principal)} USDC`} />
        <Line label="Yield due" value={`${formatUsdc(position.pendingYield, 3)} USDC`} />
      </dl>
      <Button
        size="lg"
        onClick={onClaim}
        disabled={busy || (principal === 0n && position.pendingYield === 0n)}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Claim settlement
      </Button>
      <p className="text-xs text-muted-foreground">
        The vault refuses rather than paying short. If it reports that funds are
        still being recovered, try again shortly — nothing is lost either way.
      </p>
      <ButtonLink variant="ghost" size="sm" href="/my-vaults">
        Back to my vaults
      </ButtonLink>
    </Card>
  );
}
