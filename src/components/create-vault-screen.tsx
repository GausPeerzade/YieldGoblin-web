"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ExternalLink,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { LimitlessIcon, TokenIcon } from "@/components/brand/token-icon";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateVault, type DeployArgs } from "@/hooks/use-create-vault";
import { formatBps, formatDeadline, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Check = { id: string; label: string; ok: boolean; detail?: string };
type ResolvedMarket = {
  slug: string;
  title: string;
  ticker: string | null;
  conditionId: string;
  deadline: number;
  yesPrice: number | null;
  noPrice: number | null;
  volume: string | null;
  marketUrl: string;
};
type ResolveResult = {
  ok: boolean;
  market?: ResolvedMarket;
  existingVault?: string;
  checks: Check[];
  deployArgs?: DeployArgs;
  perfFeeBps?: number;
  error?: string;
};

/**
 * Paste a Limitless link, get a vault.
 *
 * Everything the factory needs is derived server-side from the link — the
 * visitor never types an address or a token id. Validation happens before the
 * button is offered, so a deploy that reaches the wallet is one the chain has
 * already agreed to.
 */
export function CreateVaultScreen() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { create, isDeploying } = useCreateVault();

  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [checking, setChecking] = useState(false);

  const resolve = useCallback(async () => {
    if (!url.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch("/api/resolve-market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      setResult((await res.json()) as ResolveResult);
    } catch {
      setResult({
        ok: false,
        checks: [],
        error: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setChecking(false);
    }
  }, [url]);

  const deploy = useCallback(async () => {
    if (!result?.deployArgs) return;
    const vault = await create(result.deployArgs);
    if (vault) router.push(`/vault/${vault}?tab=deposit`);
  }, [create, result, router]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <p className="text-sm font-medium text-accent-foreground">New vault</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight">
          Add a market
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Paste a Limitless market link. We&apos;ll check it can support a vault
          and set everything up — you don&apos;t need to enter any addresses.
          Anyone can create one; there&apos;s no approval step.
        </p>
      </header>

      <Card className="mt-8 gap-4 p-5 sm:p-6">
        <label htmlFor="market-url" className="text-sm font-medium">
          Limitless market link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="market-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") resolve();
            }}
            placeholder="https://limitless.exchange/markets/…"
            className="h-12 flex-1 text-base"
            spellCheck={false}
            autoComplete="off"
          />
          <Button
            size="lg"
            onClick={resolve}
            disabled={checking || !url.trim()}
            className="sm:w-36"
          >
            {checking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            {checking ? "Checking" : "Check market"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Open the market on Limitless and copy the address bar — anything like{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            limitless.exchange/markets/btc-up-or-down-weekly-…
          </code>
        </p>
      </Card>

      {result?.error ? (
        <Card className="mt-4 flex-row items-start gap-3 border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm">{result.error}</p>
        </Card>
      ) : null}

      {result?.market ? (
        <div className="mt-4 space-y-4">
          <MarketPreview market={result.market} />
          <ChecklistCard checks={result.checks} />

          {result.existingVault ? (
            <Card className="flex-row flex-wrap items-center gap-4 p-5">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-medium">This market already has a vault.</span>{" "}
                <span className="text-muted-foreground">
                  Go and deposit into it instead.
                </span>
              </p>
              <ButtonLink href={`/vault/${result.existingVault}`}>
                Open vault
                <ArrowRight className="size-4" />
              </ButtonLink>
            </Card>
          ) : result.ok ? (
            <DeployPanel
              isConnected={isConnected}
              isDeploying={isDeploying}
              onDeploy={deploy}
              perfFeeBps={result.perfFeeBps}
            />
          ) : (
            <Card className="flex-row items-start gap-3 p-5">
              <X className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm text-muted-foreground">
                This market can&apos;t support a vault yet. The failed checks
                above explain why — most are permanent properties of the market,
                so try a different one.
              </p>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MarketPreview({ market }: { market: ResolvedMarket }) {
  return (
    <Card className="flex-row items-start gap-5 p-5 sm:p-6">
      <TokenIcon symbol={market.ticker ?? "USDC"} size={52} />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold leading-snug tracking-tight">
          {market.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            Closes {formatDeadline(BigInt(market.deadline))}
          </span>
          <a
            href={market.marketUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <LimitlessIcon size={15} />
            on Limitless
            <ExternalLink className="size-3" />
          </a>
        </div>
        {market.yesPrice !== null && market.noPrice !== null ? (
          <div className="mt-3 flex h-6 w-full max-w-sm overflow-hidden rounded-md">
            <div
              className="flex items-center justify-start bg-yes px-2 text-[11px] font-semibold text-white"
              style={{ width: `${Math.max(8, market.yesPrice * 100)}%` }}
            >
              {formatPercent(market.yesPrice, 0)}
            </div>
            <div
              className="flex items-center justify-end bg-no px-2 text-[11px] font-semibold text-white"
              style={{ width: `${Math.max(8, market.noPrice * 100)}%` }}
            >
              {formatPercent(market.noPrice, 0)}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ChecklistCard({ checks }: { checks: Check[] }) {
  return (
    <Card className="gap-0 divide-y p-0">
      {checks.map((c) => (
        <div key={c.id} className="flex items-start gap-3 p-4">
          <span
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
              c.ok ? "bg-accent text-accent-foreground" : "bg-destructive/12 text-destructive",
            )}
          >
            {c.ok ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{c.label}</p>
            {!c.ok && c.detail ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{c.detail}</p>
            ) : null}
          </div>
        </div>
      ))}
    </Card>
  );
}

function DeployPanel({
  isConnected,
  isDeploying,
  onDeploy,
  perfFeeBps,
}: {
  isConnected: boolean;
  isDeploying: boolean;
  onDeploy: () => void;
  perfFeeBps?: number;
}) {
  if (!isConnected) {
    return (
      <Card className="items-center gap-4 p-8 text-center">
        <p className="text-sm font-medium">This market is eligible for a vault</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Connect a wallet to create it. Anyone can — there&apos;s no approval
          step.
        </p>
        <ConnectWalletButton />
      </Card>
    );
  }

  return (
    <Card className="gap-3 p-5">
      <p className="text-sm font-medium">Ready to deploy</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Every check passed and the factory has already accepted these settings
        in a simulation. Deploying creates the vault on Base and you pay only
        gas — you can deposit into it straight afterwards.
      </p>
      {perfFeeBps !== undefined ? (
        <p className="text-sm text-muted-foreground">
          The vault will carry the protocol&apos;s standard{" "}
          <span className="nums font-medium text-foreground">
            {formatBps(perfFeeBps)}
          </span>{" "}
          performance fee on yield earned. You don&apos;t set it — the factory
          does.
        </p>
      ) : null}
      <Button size="lg" onClick={onDeploy} disabled={isDeploying} className="mt-1">
        {isDeploying ? <Loader2 className="size-4 animate-spin" /> : null}
        {isDeploying ? "Deploying…" : "Deploy vault"}
      </Button>
    </Card>
  );
}
