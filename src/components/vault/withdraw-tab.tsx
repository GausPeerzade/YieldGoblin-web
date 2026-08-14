"use client";

import { useState } from "react";
import { Clock, Info, Loader2, Percent } from "lucide-react";

import { UsdcIcon } from "@/components/brand/token-icon";
import { AmountInput, StepLabel } from "@/components/protocol/amount-input";
import { SideDot } from "@/components/protocol/stat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { formatBps, formatShares, formatUsdc, toUnits } from "@/lib/format";
import {
  canWithdraw,
  isShortFill,
  type UserPosition,
  type VaultStatus,
  type VaultView,
} from "@/lib/protocol";
import { cn } from "@/lib/utils";

export function WithdrawTab({
  vault,
  position,
  status,
  connected,
  busy,
  onWithdraw,
  onClaimYield,
}: {
  vault: VaultView;
  position: UserPosition;
  status: VaultStatus;
  connected: boolean;
  busy: boolean;
  onWithdraw: (
    yes: bigint,
    no: bigint,
    opts: { strict: boolean; alsoClaim: boolean },
  ) => void;
  onClaimYield: () => void;
}) {
  const [yesInput, setYesInput] = useState("");
  const [noInput, setNoInput] = useState("");
  const [alsoClaim, setAlsoClaim] = useState(true);
  const [strict, setStrict] = useState(false);

  const yesAmount = toUnits(yesInput);
  const noAmount = toUnits(noInput);
  const allowed = canWithdraw(status);

  // Aave's aToken rounds against the supplier, so maxWithdraw can sit a unit or
  // two under the ledger claim. Only flag a genuine shortfall, never dust.
  const yesShort = isShortFill(yesAmount, position.maxWithdrawYes, vault.constants);
  const noShort = isShortFill(noAmount, position.maxWithdrawNo, vault.constants);
  // A short fill is normal, not an error — the unfilled claim stays yours.
  const anyShort = yesShort || noShort;
  const nothing = yesAmount === 0n && noAmount === 0n;

  const servedYes = yesShort ? position.maxWithdrawYes : yesAmount;
  const servedNo = noShort ? position.maxWithdrawNo : noAmount;

  return (
    <div className="space-y-4">
      <ClaimStrip
        pending={position.pendingYield}
        onClaim={onClaimYield}
        busy={busy}
      />

      <Card className="gap-5 p-5 sm:p-6">
        <p className="text-sm font-medium">Your current position</p>
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0">
          <Figure
            icon={<SideDot tone="yes" className="size-2.5" />}
            label="YES shares"
            value={formatShares(position.yesBalance)}
          />
          <Figure
            icon={<SideDot tone="no" className="size-2.5" />}
            label="NO shares"
            value={formatShares(position.noBalance)}
          />
          <Figure
            icon={<UsdcIcon size={16} />}
            label="Accrued USDC"
            value={formatUsdc(position.pendingYield)}
          />
        </div>
      </Card>

      <Card className="gap-5 p-5 sm:p-6">
        <div className="space-y-2.5">
          <StepLabel n={1} side="yes">
            Withdraw YES shares
          </StepLabel>
          <AmountInput
            side="yes"
            value={yesInput}
            onChange={setYesInput}
            max={position.yesBalance}
            disabled={!allowed || busy}
            presetLayout="row"
          />
        </div>
        <div className="space-y-2.5">
          <StepLabel n={2} side="no">
            Withdraw NO shares
          </StepLabel>
          <AmountInput
            side="no"
            value={noInput}
            onChange={setNoInput}
            max={position.noBalance}
            disabled={!allowed || busy}
            presetLayout="row"
          />
        </div>
      </Card>

      <Card className="flex-row items-start gap-3 p-4">
        <Checkbox
          id="also-claim"
          checked={alsoClaim}
          onCheckedChange={(v) => setAlsoClaim(v === true)}
          disabled={busy}
        />
        <div className="grid gap-1">
          <Label htmlFor="also-claim" className="font-medium">
            Also claim accrued USDC on withdraw
          </Label>
          <p className="text-sm text-muted-foreground">
            You will receive your accrued yield ({formatUsdc(position.pendingYield)}{" "}
            USDC) along with your withdrawal.
          </p>
        </div>
      </Card>

      {anyShort ? (
        <Card className="gap-3 border-amber-500/30 bg-amber-500/8 p-4">
          <p className="flex items-start gap-2 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>
              Aave can only return part of this right now. You&apos;d receive{" "}
              <strong className="font-semibold nums">
                {formatShares(servedYes)} YES
              </strong>{" "}
              and{" "}
              <strong className="font-semibold nums">
                {formatShares(servedNo)} NO
              </strong>{" "}
              — the rest stays deposited and keeps earning. This is normal, not
              an error.
            </span>
          </p>
          <div className="flex items-start gap-3 border-t border-amber-500/20 pt-3">
            <Checkbox
              id="strict"
              checked={strict}
              onCheckedChange={(v) => setStrict(v === true)}
              disabled={busy}
            />
            <div className="grid gap-1">
              <Label htmlFor="strict" className="font-medium">
                All or nothing
              </Label>
              <p className="text-sm text-muted-foreground">
                Cancel the transaction unless the full amount can be filled,
                allowing for {formatUsdc(vault.constants.roundingBuffer, 3)} USDC
                of Aave rounding. Protects you if someone rebalances the pool in
                the same block.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="gap-5 p-5 sm:p-6">
        <p className="text-sm font-medium">You will receive</p>
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0">
          <Figure
            icon={<SideDot tone="yes" className="size-2.5" />}
            label="YES shares"
            value={formatShares(servedYes)}
          />
          <Figure
            icon={<SideDot tone="no" className="size-2.5" />}
            label="NO shares"
            value={formatShares(servedNo)}
          />
          <Figure
            icon={<UsdcIcon size={16} />}
            label="USDC yield"
            value={alsoClaim ? `+${formatUsdc(position.pendingYield)}` : "—"}
            accent={alsoClaim}
          />
        </div>
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <Meta
            icon={<Percent className="size-4" />}
            label="Performance fee"
            value={`${formatBps(vault.perfFeeBps)} of yield earned`}
          />
          <Meta
            icon={<Clock className="size-4" />}
            label="Cooldown"
            value="None — withdrawals are always open"
          />
        </div>
      </Card>

      {!connected ? (
        <div className="flex justify-center pt-1">
          <ConnectWalletButton />
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            disabled={!allowed || busy || nothing}
            onClick={() => onWithdraw(yesAmount, noAmount, { strict, alsoClaim })}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Withdraw from Vault
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {!allowed
              ? "Withdrawals aren't available in this vault's current state."
              : "Your remaining claim is untouched by a partial fill."}
          </p>
        </div>
      )}
    </div>
  );
}

function ClaimStrip({
  pending,
  onClaim,
  busy,
}: {
  pending: bigint;
  onClaim: () => void;
  busy?: boolean;
}) {
  return (
    <Card className="flex-row flex-wrap items-center gap-4 p-5">
      <UsdcIcon size={40} />
      <div>
        <p className="text-sm text-muted-foreground">Claimable yield</p>
        <p className="nums mt-0.5 text-2xl font-semibold tracking-tight">
          {formatUsdc(pending)} <span className="text-lg font-medium">USDC</span>
        </p>
      </div>
      <p className="max-w-[26ch] text-sm leading-snug text-muted-foreground sm:ml-auto">
        Claiming is never blocked by Aave — this USDC already sits in the vault.
      </p>
      <Button onClick={onClaim} disabled={busy || pending === 0n}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Claim Yield
      </Button>
    </Card>
  );
}

function Figure({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "nums mt-1 text-2xl font-semibold tracking-tight",
          accent && "text-yes",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
