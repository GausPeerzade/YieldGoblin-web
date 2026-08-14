"use client";

import { formatUnits } from "viem";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SHARE_DECIMALS } from "@/lib/addresses";
import { formatShares } from "@/lib/format";
import type { Side } from "@/lib/protocol";
import { cn } from "@/lib/utils";

const PRESETS = [25, 50, 75] as const;

/**
 * Amount field with quick fractions. Values are kept as strings while typing
 * and converted to bigint only at the edges — never round-trip through Number.
 */
export function AmountInput({
  side,
  value,
  onChange,
  max,
  maxLabel = "Max",
  disabled,
  presetLayout = "inline",
  className,
}: {
  side: Side;
  value: string;
  onChange: (next: string) => void;
  max: bigint;
  maxLabel?: string;
  disabled?: boolean;
  /** "inline" puts presets under the field; "row" puts them beside it. */
  presetLayout?: "inline" | "row";
  className?: string;
}) {
  const isYes = side === "yes";

  const setFraction = (pct: number) => {
    const amount = (max * BigInt(pct)) / 100n;
    onChange(formatUnits(amount, SHARE_DECIMALS));
  };

  const presets = (
    <div
      className={cn(
        "grid grid-cols-4 gap-2",
        presetLayout === "row" && "sm:w-[22rem]",
      )}
    >
      {PRESETS.map((pct) => (
        <Button
          key={pct}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || max === 0n}
          onClick={() => setFraction(pct)}
          className={cn(
            "font-medium",
            isYes
              ? "text-yes-foreground hover:bg-yes-muted"
              : "text-no-foreground hover:bg-no-muted",
          )}
        >
          {pct}%
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || max === 0n}
        onClick={() => setFraction(100)}
        className={cn(
          "font-medium",
          isYes
            ? "text-yes-foreground hover:bg-yes-muted"
            : "text-no-foreground hover:bg-no-muted",
        )}
      >
        {maxLabel}
      </Button>
    </div>
  );

  const field = (
    <div className="relative flex-1">
      <Input
        inputMode="decimal"
        placeholder="0.0"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          // Permit only a well-formed decimal so bigint conversion can't surprise us.
          if (next === "" || /^\d*\.?\d*$/.test(next)) onChange(next);
        }}
        className="h-14 pr-28 text-lg font-medium nums"
        aria-label={`${isYes ? "YES" : "NO"} amount`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Max</span>
        <span className={cn("nums font-medium", isYes ? "text-yes" : "text-no")}>
          {formatShares(max)}
        </span>
      </span>
    </div>
  );

  if (presetLayout === "row") {
    return (
      <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
        {field}
        {presets}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {field}
      {presets}
    </div>
  );
}

/** Numbered step label used to sequence the deposit / withdraw forms. */
export function StepLabel({
  n,
  side,
  children,
}: {
  n: number;
  side: Side;
  children: React.ReactNode;
}) {
  const isYes = side === "yes";
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full text-[11px] font-semibold text-white",
          isYes ? "bg-yes" : "bg-no",
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          isYes ? "text-yes-foreground" : "text-no-foreground",
        )}
      >
        {children}
      </span>
    </div>
  );
}
