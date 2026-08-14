import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled figure. The dot/icon carries the YES / NO / USDC semantics. */
export function Stat({
  label,
  value,
  icon,
  tone = "neutral",
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "yes" | "no" | "usdc" | "neutral";
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon ?? (tone !== "neutral" ? <SideDot tone={tone} /> : null)}
        <span>{label}</span>
      </div>
      <div className="nums text-2xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function SideDot({
  tone,
  className,
}: {
  tone: "yes" | "no" | "usdc";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "yes" && "bg-yes",
        tone === "no" && "bg-no",
        tone === "usdc" && "bg-usdc",
        className,
      )}
      aria-hidden
    />
  );
}

/** Row of stats separated by hairlines, as used across the vault screens. */
export function StatRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
