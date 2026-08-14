"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PROTOCOLS, tokenFor } from "@/lib/tokens";

/**
 * Coin logo with a coloured disc behind it. Falls back to the ticker's initial
 * if the CDN image fails, so a dead logo never leaves a hole in the layout.
 */
export function TokenIcon({
  symbol,
  size = 40,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const token = tokenFor(symbol);
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: token.bg }}
      aria-hidden
    >
      {token.logo && !failed ? (
        <Image
          src={token.logo}
          alt=""
          width={size}
          height={size}
          className="object-cover"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <span
          className="font-semibold text-white"
          style={{ fontSize: size * 0.42 }}
        >
          {token.symbol.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function AaveIcon({ size = 20, className }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: PROTOCOLS.aave.bg }}
      aria-hidden
    >
      {!failed ? (
        <Image
          src={PROTOCOLS.aave.logo}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <span className="font-semibold text-white" style={{ fontSize: size * 0.5 }}>
          A
        </span>
      )}
    </span>
  );
}

/** Limitless has no public logo CDN — a wordmark-style glyph stands in. */
export function LimitlessIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[4px] bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" style={{ width: size * 0.72, height: size * 0.72 }}>
        <path
          d="M8 2.5v11M2.5 8h11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function UsdcIcon({ size = 40, className }: { size?: number; className?: string }) {
  return <TokenIcon symbol="USDC" size={size} className={className} />;
}
