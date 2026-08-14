import { CalendarClock } from "lucide-react";

import { TokenIcon } from "@/components/brand/token-icon";
import { LimitlessBadge } from "@/components/protocol/limitless-link";
import { Card } from "@/components/ui/card";
import { formatDeadline, formatUsdCompact } from "@/lib/format";
import { derivePool, type VaultView } from "@/lib/protocol";
import { cn } from "@/lib/utils";

/**
 * Market identity + TVL. Repeated at the top of every vault screen so the user
 * always knows which bet they're looking at.
 */
export function MarketCard({
  vault,
  size = "default",
  className,
}: {
  vault: VaultView;
  size?: "sm" | "default";
  className?: string;
}) {
  const { tvl } = derivePool(vault);
  const sm = size === "sm";

  return (
    <Card className={cn("flex-row items-center gap-6 p-5 sm:p-6", className)}>
      <TokenIcon symbol={vault.market.symbol} size={sm ? 44 : 56} />

      <div className="min-w-0 flex-1">
        <h2
          className={cn(
            "font-semibold leading-snug tracking-tight",
            sm ? "text-base" : "text-xl",
          )}
        >
          {vault.market.question}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            Closes {formatDeadline(vault.deadline)}
          </span>
          <LimitlessBadge vault={vault} />
        </div>
      </div>

      <div className="hidden shrink-0 border-l pl-6 sm:block">
        <p className="text-sm text-muted-foreground">Vault TVL</p>
        <p className={cn("nums font-semibold tracking-tight", sm ? "text-xl" : "text-2xl")}>
          {formatUsdCompact(tvl)}
        </p>
      </div>
    </Card>
  );
}
