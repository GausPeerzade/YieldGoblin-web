import Link from "next/link";

import { GoblinMark } from "@/components/brand/goblin-mark";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <GoblinMark className="size-6" />
          <span className="text-sm font-medium">Yield Goblin</span>
          <span className="text-sm text-muted-foreground">on Base</span>
          <Link
            href="/docs"
            className="ml-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            How it works
          </Link>
        </div>
        <div className="max-w-lg space-y-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Unaudited beta. The contracts have not been reviewed by any third
            party — connect a test wallet only, and deposit nothing you cannot
            afford to lose permanently.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Yield Goblin never changes your position. Deposit YES and you get YES
            back, with yield paid separately in USDC. There is no lock-up —
            withdrawals stay open even if a market never resolves.
          </p>
        </div>
      </div>
    </footer>
  );
}
