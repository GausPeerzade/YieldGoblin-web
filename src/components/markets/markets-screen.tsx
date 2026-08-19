"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { DollarSign, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { MarketRow } from "@/components/markets/market-row";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePosition, useVaults } from "@/hooks/use-vaults";
import { derivePool, sideRates, type VaultView } from "@/lib/protocol";
import type { UserPosition } from "@/lib/protocol";

type SortKey = "closing" | "tvl" | "best-rate";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "closing", label: "Closing Soon" },
  { value: "tvl", label: "Highest TVL" },
  { value: "best-rate", label: "Best Rate" },
];

export function MarketsScreen() {
  const { vaults, isLoading } = useVaults();
  const { isConnected } = useAccount();
  const [sort, setSort] = useState<SortKey>("closing");

  const sorted = useMemo(() => sortVaults(vaults, sort), [vaults, sort]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Hero />

      <section className="mt-12">
        <WrongNetworkBanner />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Eligible Markets</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deposit your shares and start earning USDC.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Sort by
            <Select
              items={SORTS}
              value={sort}
              onValueChange={(v) => setSort(v as SortKey)}
            >
              <SelectTrigger className="w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-[124px] w-full rounded-xl" />
              ))
            : sorted.map((vault) => (
                <MarketRowWithPosition
                  key={vault.address}
                  vault={vault}
                  connected={isConnected}
                />
              ))}
          {!isLoading && sorted.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              No vaults have been created yet.
            </Card>
          ) : null}
        </div>
      </section>

      <TrustStrip />
    </div>
  );
}

/** Position reads are per-vault, so each row owns its own hook. */
function MarketRowWithPosition({
  vault,
  connected,
}: {
  vault: VaultView;
  connected: boolean;
}) {
  const { position } = usePosition(vault);
  return <MarketRow vault={vault} position={position} connected={connected} />;
}

function Hero() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Earn yield on your
        <br />
        Limitless <span className="text-yes">YES</span> /{" "}
        <span className="text-no">NO</span> shares
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
        Deposit the shares you already hold and earn USDC on them,
        automatically. Your position stays yours — withdraw it any time.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Chip icon={<Sparkles className="size-3.5" />} label="Yield paid in USDC" />
        <Chip icon={<Lock className="size-3.5" />} label="No lock-up" />
        <Chip icon={<ShieldCheck className="size-3.5" />} label="Non-custodial" />
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 font-medium">
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </span>
  );
}

function Assurance({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <Card className="mt-8 grid gap-5 p-5 sm:grid-cols-3">
      <Assurance
        icon={<ShieldCheck className="size-4" />}
        title="Built on Limitless"
        body="Permissionless prediction markets"
      />
      <Assurance
        icon={<DollarSign className="size-4" />}
        title="Yield from Aave"
        body="USDC market on Aave v3"
      />
      <Assurance
        icon={<Lock className="size-4" />}
        title="You keep control"
        body="Non-custodial, auditable, transparent"
      />
    </Card>
  );
}

/**
 * Vaults we hold metadata for always come first, whatever the sort — a vault
 * the registry doesn't recognise can only show a generic label, so it should
 * never outrank a named market.
 */
function sortVaults(vaults: VaultView[], sort: SortKey): VaultView[] {
  const within =
    sort === "closing"
      ? (a: VaultView, b: VaultView) => Number(a.deadline - b.deadline)
      : sort === "tvl"
        ? (a: VaultView, b: VaultView) =>
            Number(derivePool(b).tvl - derivePool(a).tvl)
        : (a: VaultView, b: VaultView) => bestRate(b) - bestRate(a);

  return [...vaults].sort(
    (a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      Number(b.hasMetadata) - Number(a.hasMetadata) ||
      within(a, b),
  );
}

function bestRate(v: VaultView) {
  const { yesApr, noApr } = sideRates(v);
  return Math.max(yesApr ?? 0, noApr ?? 0);
}

export type { UserPosition };
