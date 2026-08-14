"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { UsdcIcon } from "@/components/brand/token-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsdc } from "@/lib/format";
import {
  projectYield,
  sideRates,
  type UserPosition,
  type VaultView,
} from "@/lib/protocol";

/**
 * Claimable yield. `pendingYield` already includes unrecognised earnings and is
 * capped at what the venue can pay, so it is safe to show as "claimable".
 * We tick it forward between reads so the number visibly grows (guide §13).
 */
export function ClaimYieldCard({
  vault,
  position,
  onClaim,
  busy,
}: {
  vault: VaultView;
  position: UserPosition;
  onClaim: () => void;
  busy?: boolean;
}) {
  const live = useTickingYield(vault, position);

  return (
    <Card className="flex-row flex-wrap items-center gap-5 p-5 sm:p-6">
      <UsdcIcon size={44} />

      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Claimable yield</p>
        <p className="nums mt-0.5 text-3xl font-semibold tracking-tight">
          {formatUsdc(live, 3)}{" "}
          <span className="text-xl font-medium text-muted-foreground">USDC</span>
        </p>
      </div>

      <p className="max-w-[24ch] text-sm leading-snug text-muted-foreground sm:ml-auto">
        Rewards stream continuously while your shares remain in the vault.
      </p>

      <Button
        size="lg"
        onClick={onClaim}
        disabled={busy || position.pendingYield === 0n}
        className="w-full sm:w-auto"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Claim Yield
      </Button>
    </Card>
  );
}

const TICK_MS = 2000;

/**
 * Interpolates between chain reads at the position's own accrual rate, so the
 * claimable figure visibly grows instead of jumping once per refetch.
 *
 * Drift is tracked separately from `pendingYield` and reset during render when
 * a fresh read lands — the real value is always the anchor, never overwritten.
 */
export function useTickingYield(vault: VaultView, position: UserPosition) {
  const [drift, setDrift] = useState(0n);
  const [anchor, setAnchor] = useState(position.pendingYield);

  if (anchor !== position.pendingYield) {
    setAnchor(position.pendingYield);
    setDrift(0n);
  }

  const { yesApr, noApr } = sideRates(vault);
  const perHour =
    projectYield(position.yesBalance, yesApr, "hour") +
    projectYield(position.noBalance, noApr, "hour");

  useEffect(() => {
    if (perHour === 0n || vault.settled) return;
    const perTick = Number(perHour) / (3_600_000 / TICK_MS);
    // Below half a micro-USDC per tick there is nothing visible to animate.
    if (perTick < 0.5) return;
    const id = setInterval(
      () => setDrift((d) => d + BigInt(Math.round(perTick))),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [perHour, vault.settled]);

  return position.pendingYield + drift;
}
