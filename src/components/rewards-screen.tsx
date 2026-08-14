"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Loader2, Wallet } from "lucide-react";

import { TokenIcon, UsdcIcon } from "@/components/brand/token-icon";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { YieldChart } from "@/components/vault/yield-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVaultActions } from "@/hooks/use-vault-actions";
import { usePosition, useVaults } from "@/hooks/use-vaults";
import { useVaultEvents } from "@/hooks/use-vault-events";
import { formatUsdc } from "@/lib/format";
import type { UserPosition, VaultView } from "@/lib/protocol";

export function RewardsScreen() {
  const { isConnected } = useAccount();
  const { vaults } = useVaults();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Rewards</h1>
        <p className="mt-1.5 text-muted-foreground">
          Yield is paid in USDC, separately from your principal, and is claimable
          at any time.
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
              Claimable rewards across your vaults will show up here.
            </p>
          </div>
          <ConnectWalletButton />
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {vaults.map((vault) => (
            <RewardRow key={vault.address} vault={vault} />
          ))}
        </div>
      )}
    </div>
  );
}

function RewardRow({ vault }: { vault: VaultView }) {
  const { position } = usePosition(vault);
  if (position.pendingYield === 0n && position.lifetimeClaimed === 0n) return null;
  return <RewardCard vault={vault} position={position} />;
}

function RewardCard({
  vault,
  position,
}: {
  vault: VaultView;
  position: UserPosition;
}) {
  const actions = useVaultActions(vault.address);
  const { yieldSeries } = useVaultEvents(vault);

  return (
    <Card className="gap-0 p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto_auto_auto] lg:items-center lg:gap-8">
        <div className="flex items-center gap-3.5">
          <TokenIcon symbol={vault.market.symbol} size={40} />
          <Link
            href={`/vault/${vault.address}`}
            className="text-[15px] font-semibold leading-snug tracking-tight hover:underline"
          >
            {vault.market.question}
          </Link>
        </div>

        <div className="max-w-[16rem]">
          <YieldChart data={yieldSeries} height={72} />
        </div>

        <Figure label="Claimable" value={formatUsdc(position.pendingYield, 3)} accent />
        <Figure label="Lifetime claimed" value={formatUsdc(position.lifetimeClaimed, 3)} />

        <Button
          onClick={actions.claimYield}
          disabled={actions.isBusy || position.pendingYield === 0n}
        >
          {actions.isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Claim
        </Button>
      </div>
    </Card>
  );
}

function Figure({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UsdcIcon size={13} />
        {label}
      </p>
      <p
        className={
          accent
            ? "nums mt-0.5 font-semibold text-usdc"
            : "nums mt-0.5 font-semibold"
        }
      >
        {value} USDC
      </p>
    </div>
  );
}
