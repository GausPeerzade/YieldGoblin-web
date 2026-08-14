import { formatUnits, parseUnits } from "viem";
import { SHARE_DECIMALS, USDC_DECIMALS } from "./addresses";

/**
 * Formatting helpers. Everything on-chain here is 6-decimal, so we go through
 * viem's formatUnits and then round for display — never assert exact equality
 * on a displayed value (guide §10, dust rounding).
 */

export function toUnits(input: string, decimals = SHARE_DECIMALS): bigint {
  const cleaned = input.trim().replace(/,/g, "");
  if (!cleaned || cleaned === "." || Number.isNaN(Number(cleaned))) return 0n;
  // Truncate excess precision rather than letting parseUnits throw.
  const [whole, frac = ""] = cleaned.split(".");
  return parseUnits(`${whole || "0"}.${frac.slice(0, decimals)}`, decimals);
}

function toNumber(value: bigint, decimals: number): number {
  return Number(formatUnits(value, decimals));
}

/** Share / outcome-token amounts, e.g. "1,240.56". */
export function formatShares(value: bigint | undefined, maxFrac = 2): string {
  if (value === undefined) return "—";
  return toNumber(value, SHARE_DECIMALS).toLocaleString("en-US", {
    // Intl throws if the minimum exceeds the maximum, so clamp rather than
    // assume callers only ever ask for two or more fraction digits.
    minimumFractionDigits: Math.min(2, maxFrac),
    maximumFractionDigits: maxFrac,
  });
}

/** USDC amounts. Yield is small, so allow more precision. */
export function formatUsdc(value: bigint | undefined, maxFrac = 2): string {
  if (value === undefined) return "—";
  return toNumber(value, USDC_DECIMALS).toLocaleString("en-US", {
    minimumFractionDigits: Math.min(2, maxFrac),
    maximumFractionDigits: maxFrac,
  });
}

/** Dollar figure with a leading $, e.g. "$1.42M" for TVL-scale numbers. */
export function formatUsdCompact(value: bigint | undefined): string {
  if (value === undefined) return "—";
  const n = toNumber(value, USDC_DECIMALS);
  if (n === 0) return "$0";
  if (n < 1000) return `$${n.toFixed(2)}`;
  return `$${n.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsd(value: bigint | undefined, maxFrac = 2): string {
  if (value === undefined) return "—";
  return `$${formatUsdc(value, maxFrac)}`;
}

/**
 * APR as a percentage string. `null` means "no rate yet" — a one-sided vault or
 * an empty side — and must never render as 0% or ∞ (guide §5).
 */
export function formatApr(apr: number | null | undefined, maxFrac = 1): string {
  if (apr === null || apr === undefined || !Number.isFinite(apr)) return "—";
  return `${(apr * 100).toFixed(maxFrac)}%`;
}

export function formatMultiple(x: number | null): string {
  if (x === null || !Number.isFinite(x) || x <= 1) return "—";
  return x >= 10 ? `${Math.round(x)}×` : `${x.toFixed(1)}×`;
}

export function shortenAddress(address: string | undefined, chars = 4): string {
  if (!address) return "—";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function shortenHex(hex: string | undefined, chars = 6): string {
  if (!hex) return "—";
  return `${hex.slice(0, 2 + chars)}…${hex.slice(-chars)}`;
}

const UTC_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const UTC_DATETIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** Market deadlines are quoted in UTC across the product. */
export function formatDeadline(unixSeconds: bigint | number | undefined): string {
  if (unixSeconds === undefined) return "—";
  const ms = Number(unixSeconds) * 1000;
  if (!Number.isFinite(ms) || ms === 0) return "—";
  return `${UTC_DATETIME.format(new Date(ms))} UTC`;
}

export function formatDate(unixSeconds: bigint | number | undefined): string {
  if (unixSeconds === undefined) return "—";
  return UTC_DATE.format(new Date(Number(unixSeconds) * 1000));
}

export function formatRelative(
  unixSeconds: bigint | number | undefined,
  nowMs: number,
): string {
  if (unixSeconds === undefined) return "—";
  const diff = Number(unixSeconds) * 1000 - nowMs;
  const abs = Math.abs(diff);
  const day = 86_400_000;
  const hour = 3_600_000;
  const suffix = diff < 0 ? "ago" : "";
  const prefix = diff < 0 ? "" : "in ";
  if (abs >= day) {
    const d = Math.round(abs / day);
    return `${prefix}${d}d ${suffix}`.trim();
  }
  if (abs >= hour) {
    const h = Math.round(abs / hour);
    return `${prefix}${h}h ${suffix}`.trim();
  }
  const m = Math.max(1, Math.round(abs / 60_000));
  return `${prefix}${m}m ${suffix}`.trim();
}

export function formatPercent(fraction: number, maxFrac = 0): string {
  if (!Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(maxFrac)}%`;
}

export function formatBps(bps: number | undefined): string {
  if (bps === undefined) return "—";
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
