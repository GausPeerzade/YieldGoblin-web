"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowRight, Wallet } from "lucide-react";

import { TokenIcon } from "@/components/brand/token-icon";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { SideDot } from "@/components/protocol/stat";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { usePosition, useVaults } from "@/hooks/use-vaults";
import { formatApr, formatShares, formatUsd, formatUsdc } from "@/lib/format";
import {
  positionValue,
  sideRates,
  type UserPosition,
  type VaultView,
} from "@/lib/protocol";

export function MyVaultsScreen() {
  const { isConnected } = useAccount();
  const { vaults } = useVaults();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">My Vaults</h1>
        <p className="mt-1.5 text-muted-foreground">
          Your deposited shares and the USDC they have earned.
        </p>
      </header>

      {!isConnected ? (
        <Card className="mt-8 items-center gap-4 p-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted">
            <Wallet className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="font-medium">Connect your wallet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your positions will appear here once connected.
            </p>
          </div>
          <ConnectWalletButton />
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {vaults.map((vault) => (
            <PositionRow key={vault.address} vault={vault} />
          ))}
        </div>
      )}
    </div>
  );
}

function PositionRow({ vault }: { vault: VaultView }) {
  const { position } = usePosition(vault);
  if (position.yesBalance === 0n && position.noBalance === 0n) return null;
  return <PositionCard vault={vault} position={position} />;
}

function PositionCard({
  vault,
  position,
}: {
  vault: VaultView;
  position: UserPosition;
}) {
  const { yesApr, noApr } = sideRates(vault);
  // Matched pairs redeem to $1 each; the two sides are not additive.
  const value = positionValue(position.yesBalance, position.noBalance);

  return (
    <Card className="gap-0 p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_auto_auto_auto_auto] lg:items-center lg:gap-8">
        <div className="flex items-center gap-3.5">
          <TokenIcon symbol={vault.market.symbol} size={40} />
          <Link
            href={`/vault/${vault.address}`}
            className="text-[15px] font-semibold leading-snug tracking-tight hover:underline"
          >
            {vault.market.question}
          </Link>
        </div>

        <Cell
          label="YES"
          value={formatShares(position.yesBalance)}
          sub={formatApr(yesApr)}
          dot="yes"
        />
        <Cell
          label="NO"
          value={formatShares(position.noBalance)}
          sub={formatApr(noApr)}
          dot="no"
        />
        <Cell label="Guaranteed" value={formatUsd(value.paired)} />
        <Cell
          label="Claimable"
          value={`${formatUsdc(position.pendingYield, 3)} USDC`}
          accent
        />

        <ButtonLink
          variant="outline"
          size="sm"
          className="lg:col-start-5"
          href={`/vault/${vault.address}`}
        >
          Manage
          <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
    </Card>
  );
}

function Cell({
  label,
  value,
  sub,
  dot,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  dot?: "yes" | "no";
  accent?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dot ? <SideDot tone={dot} /> : null}
        {label}
      </p>
      <p
        className={
          accent
            ? "nums mt-0.5 font-semibold text-usdc"
            : "nums mt-0.5 font-semibold"
        }
      >
        {value}
      </p>
      {sub ? <p className="nums text-xs text-muted-foreground">{sub} APR</p> : null}
    </div>
  );
}
