"use client";

import { Hourglass } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatApr, formatUsdc } from "@/lib/format";
import {
  distributionFloor,
  secondsToFloor,
  sideRates,
  type VaultView,
} from "@/lib/protocol";

/**
 * Yield is only credited to depositors once the accrued surplus crosses the
 * vault's DUST threshold. Below it `pendingYield` reads zero — which a naive UI
 * renders as "0.00% APY" and a broken-looking vault.
 *
 * It is not broken. The interest is real and compounding inside Aave; it simply
 * has not reached the distribution floor. Lead with the rate, then explain the
 * floor and show progress toward it (guide §5.2).
 */
export function DistributionFloorNotice({ vault }: { vault: VaultView }) {
  const floor = distributionFloor(vault);
  if (!floor.belowFloor) return null;

  const { yesApr, noApr } = sideRates(vault);
  const rate = Math.max(yesApr ?? 0, noApr ?? 0);
  const eta = secondsToFloor(vault);

  return (
    <Card className="gap-3 border-usdc/25 bg-usdc-muted/40 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background">
          <Hourglass className="size-4 text-usdc" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Earning {formatApr(rate)} — first distribution at{" "}
            {formatUsdc(floor.dust, 2)} USDC
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Interest is accruing inside Aave right now. The vault only credits it
            to depositors once it passes {formatUsdc(floor.dust, 2)} USDC, so
            your claimable balance reads zero until then. Nothing is lost — it is
            waiting, not missing.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-usdc transition-all"
            style={{ width: `${Math.max(1, floor.progress * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="nums">
            {floor.surplus === 0n
              ? "just started"
              : `${formatUsdc(floor.surplus, 6)} accrued`}
          </span>
          <span className="nums">
            {eta !== null && Number.isFinite(eta) && eta > 0
              ? `≈ ${formatDuration(eta)} to go`
              : `${formatUsdc(floor.dust, 2)} needed`}
          </span>
        </div>
      </div>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const day = 86_400;
  if (seconds >= day) return `${Math.round(seconds / day)} days`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/**
 * A vault deployed with non-production settings. Flagged plainly so nobody
 * treats its behaviour as representative, without naming the internal
 * thresholds involved.
 */
export function TestDeploymentNotice({ vault }: { vault: VaultView }) {
  if (!vault.testDeployment) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Test deployment — this vault runs with reduced thresholds, so it behaves
      differently from a production vault. Treat its figures as a demonstration.
    </p>
  );
}
