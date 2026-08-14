"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatUsdc } from "@/lib/format";
import { STATUS_COPY, type VaultStatus, type VaultView } from "@/lib/protocol";
import { cn } from "@/lib/utils";

/**
 * State banner. Degraded and pending states are the moments users panic, so
 * the copy leads with what is still safe and true, never with "failed".
 */
export function StatusBanner({
  status,
  onSettle,
  busy,
}: {
  status: VaultStatus;
  onSettle?: () => void;
  busy?: boolean;
}) {
  if (status === "open") return null;

  const copy = STATUS_COPY[status];
  const Icon =
    copy.tone === "warn" ? AlertTriangle : copy.tone === "ok" ? CheckCircle2 : Info;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border p-4",
        copy.tone === "warn" && "border-amber-500/30 bg-amber-500/8",
        copy.tone === "info" && "border-usdc/25 bg-usdc-muted/60",
        copy.tone === "neutral" && "bg-muted/60",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          copy.tone === "warn" ? "text-amber-600" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{copy.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.detail}</p>
        {status === "degraded" ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Claiming yield is unaffected — yield leaves Aave the moment it is
            recognised, so it is already sitting in the vault.
          </p>
        ) : null}
      </div>
      {status === "resolved-unsettled" && onSettle ? (
        <Button size="sm" variant="outline" onClick={onSettle} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Settle this vault
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Principal parked in the vault rather than Aave — fully safe and fully
 * withdrawable, just idle. A subtle note, not a warning (guide §10).
 */
export function IdleNotice({ vault }: { vault: VaultView }) {
  if (vault.idleUsdc === 0n || vault.settled) return null;
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Info className="size-3.5 shrink-0" />
      {formatUsdc(vault.idleUsdc)} USDC is waiting on Aave supply-cap space. It
      is fully withdrawable — it just isn&apos;t earning right now.
    </p>
  );
}
