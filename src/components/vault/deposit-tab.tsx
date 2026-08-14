"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  Info,
  Loader2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { AaveIcon } from "@/components/brand/token-icon";
import { BuySharesCard } from "@/components/protocol/limitless-link";
import { AmountInput } from "@/components/protocol/amount-input";
import { SideDot } from "@/components/protocol/stat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { toUnits } from "@/lib/format";
import { formatApr, formatShares, formatUsdc } from "@/lib/format";
import {
  canDeposit,
  previewApr,
  projectYield,
  type UserPosition,
  type VaultStatus,
  type VaultView,
} from "@/lib/protocol";
import { cn } from "@/lib/utils";

export function DepositTab({
  vault,
  position,
  status,
  connected,
  busy,
  onApprove,
  onDeposit,
}: {
  vault: VaultView;
  position: UserPosition;
  status: VaultStatus;
  connected: boolean;
  busy: boolean;
  onApprove: () => void;
  onDeposit: (yes: bigint, no: bigint) => void;
}) {
  const [yesInput, setYesInput] = useState("");
  const [noInput, setNoInput] = useState("");

  const yesAmount = toUnits(yesInput);
  const noAmount = toUnits(noInput);
  const allowed = canDeposit(status);

  const preview = useMemo(
    () => buildPreview(vault, yesAmount, noAmount),
    [vault, yesAmount, noAmount],
  );

  const hasShares = position.walletYes > 0n || position.walletNo > 0n;
  const overYes = yesAmount > position.walletYes;
  const overNo = noAmount > position.walletNo;
  const nothing = yesAmount === 0n && noAmount === 0n;

  return (
    <div className="space-y-4">
      <Card className="flex-row flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 text-sm">
        <AaveIcon size={22} />
        <span className="font-medium">Powered by Aave v3</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          Deposits are routed into the USDC market
        </span>
      </Card>

      {connected && !hasShares ? (
        <BuySharesCard vault={vault} hasShares={false} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SideField
          side="yes"
          value={yesInput}
          onChange={setYesInput}
          balance={position.walletYes}
          disabled={!allowed || busy}
          error={overYes ? "More than your wallet balance" : undefined}
        />
        <SideField
          side="no"
          value={noInput}
          onChange={setNoInput}
          balance={position.walletNo}
          disabled={!allowed || busy}
          error={overNo ? "More than your wallet balance" : undefined}
        />
      </div>

      <Card className="gap-4 p-5">
        <p className="text-sm font-medium">Live preview</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:[&>*]:px-5 lg:[&>*:first-child]:pl-0 lg:[&>*:last-child]:pr-0">
          <PreviewCell
            icon={<CheckCircle2 className="size-4" />}
            tone="yes"
            label="YES deposited"
            value={`${formatShares(preview.yesAmount)} YES`}
          />
          <PreviewCell
            icon={<CheckCircle2 className="size-4" />}
            tone="no"
            label="NO deposited"
            value={`${formatShares(preview.noAmount)} NO`}
          />
          <PreviewCell
            icon={<TrendingUp className="size-4" />}
            tone="ok"
            label="Your rate"
            value={formatApr(preview.blendedApr)}
          />
          <PreviewCell
            icon={<DollarSign className="size-4" />}
            tone="usdc"
            label="Projected USDC yield"
            value={`${formatUsdc(preview.monthly)} / month`}
          />
        </div>
        {preview.belowBest ? (
          <p className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            This mix earns below the vault&apos;s best available rate. Rates move
            with what is already deposited on each side — check the rate cards
            before you confirm.
          </p>
        ) : null}
      </Card>

      {connected && hasShares ? (
        <BuySharesCard vault={vault} hasShares />
      ) : null}

      <Card className="flex-row items-start gap-3 p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            Your position is unchanged.
          </span>{" "}
          Deposit YES and you get YES back. Your shares are held, never traded or
          converted, and the yield arrives separately in USDC.
        </p>
      </Card>

      {!connected ? (
        <div className="flex justify-center pt-1">
          <ConnectWalletButton />
        </div>
      ) : !position.approved ? (
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={onApprove} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Approve Yield Goblin
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Outcome tokens are ERC-1155, so approval is all-or-nothing across
            every token id — there is no per-amount option. One transaction, once.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            disabled={!allowed || busy || nothing || overYes || overNo}
            onClick={() => onDeposit(yesAmount, noAmount)}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Deposit to Yield Goblin
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {!allowed
              ? "Deposits are paused in this vault's current state."
              : preview.txCount > 1
                ? `${preview.txCount} transactions — one per side.`
                : "Review and confirm in your wallet."}
          </p>
        </div>
      )}
    </div>
  );
}

function SideField({
  side,
  value,
  onChange,
  balance,
  disabled,
  error,
}: {
  side: "yes" | "no";
  value: string;
  onChange: (v: string) => void;
  balance: bigint;
  disabled?: boolean;
  error?: string;
}) {
  const isYes = side === "yes";
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <SideDot tone={side} className="size-2.5" />
          <span
            className={cn(
              "font-medium",
              isYes ? "text-yes-foreground" : "text-no-foreground",
            )}
          >
            {isYes ? "YES" : "NO"} shares
          </span>
        </span>
        <span className="nums text-sm text-muted-foreground">
          Balance: {formatShares(balance)} {isYes ? "YES" : "NO"}
        </span>
      </div>
      <AmountInput
        side={side}
        value={value}
        onChange={onChange}
        max={balance}
        disabled={disabled}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </Card>
  );
}

function PreviewCell({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ok" | "yes" | "no" | "usdc";
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
          tone === "ok" && "bg-accent text-accent-foreground",
          tone === "yes" && "bg-yes-muted text-yes",
          tone === "no" && "bg-no-muted text-no",
          tone === "usdc" && "bg-usdc-muted text-usdc",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="nums mt-0.5 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

/**
 * What this deposit earns, from the depositor's side.
 *
 * Reports the rate and the projected payout only. The pool-level arithmetic
 * behind the rate is intentionally not surfaced — `belowBest` warns when a mix
 * earns less than it could without explaining why.
 */
function buildPreview(vault: VaultView, yesAmount: bigint, noAmount: bigint) {
  const newYes = vault.totalYes + yesAmount;
  const newNo = vault.totalNo + noAmount;

  const yesApr = previewApr(yesAmount, "yes", { ...vault, totalNo: newNo });
  const noApr = previewApr(noAmount, "no", { ...vault, totalYes: newYes });

  const total = yesAmount + noAmount;
  const blendedApr =
    total === 0n
      ? null
      : (Number(yesAmount) * (yesApr ?? 0) + Number(noAmount) * (noApr ?? 0)) /
        Number(total);

  const monthly =
    projectYield(yesAmount, yesApr, "month") + projectYield(noAmount, noApr, "month");

  const best = Math.max(yesApr ?? 0, noApr ?? 0);

  return {
    yesAmount,
    noAmount,
    blendedApr,
    monthly,
    // Meaningfully under what the better side would pay — worth a nudge.
    belowBest: total > 0n && blendedApr !== null && best > 0 && blendedApr < best * 0.9,
    txCount: (yesAmount > 0n ? 1 : 0) + (noAmount > 0n ? 1 : 0),
  };
}
