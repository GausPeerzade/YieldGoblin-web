"use client";

import { ExternalLink, Info } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useLimitlessMarket } from "@/hooks/use-limitless-market";
import { formatPercent } from "@/lib/format";
import type { VaultView } from "@/lib/protocol";

/**
 * Live odds from Limitless. Context only — the vault does not care about them,
 * and a depositor's principal and yield are identical whichever way the market
 * is leaning. Said out loud here so nobody reads the bar as a risk indicator.
 */
export function MarketOdds({ vault }: { vault: VaultView }) {
  const { odds } = useLimitlessMarket(vault);
  if (!odds || odds.yesPrice === null || odds.noPrice === null) return null;

  const yes = odds.yesPrice;
  const no = odds.noPrice;
  const volume = formatVolume(odds.volume);

  return (
    <Card className="gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Market odds</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {volume ? <span className="nums">{volume} volume</span> : null}
          {vault.market.venueUrl ? (
            <a
              href={vault.market.venueUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Limitless
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        <div
          className="flex items-center justify-start bg-yes px-2.5 text-xs font-semibold text-white"
          style={{ width: `${Math.max(6, yes * 100)}%` }}
        >
          {formatPercent(yes, 1)}
        </div>
        <div
          className="flex items-center justify-end bg-no px-2.5 text-xs font-semibold text-white"
          style={{ width: `${Math.max(6, no * 100)}%` }}
        >
          {formatPercent(no, 1)}
        </div>
      </div>

      <div className="flex justify-between text-xs">
        <span className="font-medium text-yes-foreground">YES</span>
        <span className="font-medium text-no-foreground">NO</span>
      </div>

      <p className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" />
        Odds do not affect what you earn or what you get back. Your yield comes
        from Aave, and your shares are returned unchanged whichever way the
        market resolves.
      </p>
    </Card>
  );
}

/** Upstream returns volume as a raw decimal string, e.g. "49.986000". */
function formatVolume(raw: string | null): string | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
