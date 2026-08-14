import { ArrowUpRight, ExternalLink } from "lucide-react";

import { LimitlessIcon } from "@/components/brand/token-icon";
import { Card } from "@/components/ui/card";
import type { VaultView } from "@/lib/protocol";
import { cn } from "@/lib/utils";

/**
 * The vault pays yield on shares you already hold — it does not sell them.
 * Anyone without a position needs Limitless first, so link there plainly
 * rather than leaving a dead end at an empty balance.
 */
export function BuySharesCard({
  vault,
  hasShares,
  className,
}: {
  vault: VaultView;
  hasShares: boolean;
  className?: string;
}) {
  const url = vault.market.venueUrl;
  if (!url) return null;

  return (
    <Card
      className={cn(
        "flex-row flex-wrap items-center gap-4 p-5",
        !hasShares && "border-usdc/25 bg-usdc-muted/40",
        className,
      )}
    >
      <LimitlessIcon size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {hasShares
            ? "Need more YES or NO shares?"
            : "You don't hold any shares in this market yet"}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yield Goblin pays yield on shares you already own — buy them on
          Limitless first, then deposit them here.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Buy YES / NO on Limitless
        <ArrowUpRight className="size-4" />
      </a>
    </Card>
  );
}

/** Inline "on Limitless" attribution that links to the market. */
export function LimitlessBadge({
  vault,
  className,
}: {
  vault: VaultView;
  className?: string;
}) {
  const url = vault.market.venueUrl;
  const inner = (
    <>
      <LimitlessIcon size={15} />
      on Limitless
      {url ? <ExternalLink className="size-3" /> : null}
    </>
  );

  if (!url) {
    return (
      <span className={cn("flex items-center gap-1.5", className)}>{inner}</span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      // Stops the click bubbling to a parent link on the market row.
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-1.5 transition-colors hover:text-foreground",
        className,
      )}
    >
      {inner}
    </a>
  );
}
