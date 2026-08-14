"use client";

import { useId } from "react";
import type { YieldPoint } from "@/lib/activity";
import { formatDate, formatUsdc } from "@/lib/format";

/**
 * Cumulative yield over time, built by summing `Harvested` events — real
 * history, not a projected rate (guide §9). Inline SVG so it stays sharp and
 * ships no charting library.
 */
export function YieldChart({
  data,
  height = 132,
}: {
  data: YieldPoint[];
  height?: number;
}) {
  const gradientId = useId();
  if (data.length < 2) {
    return (
      <div
        className="grid place-items-center rounded-lg bg-muted/50 text-xs text-muted-foreground"
        style={{ height }}
      >
        Not enough history yet
      </div>
    );
  }

  const W = 320;
  const H = height;
  const padL = 30;
  const padB = 18;
  const padT = 6;

  const values = data.map((d) => Number(d.cumulative) / 1e6);
  const maxV = Math.max(...values);
  // Round the axis up to a clean number so gridline labels read well.
  const top = niceCeil(maxV);

  const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - 4);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={`Cumulative yield: ${formatUsdc(data[data.length - 1].cumulative)} USDC to date`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--yes)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--yes)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - 4}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text
            x={padL - 6}
            y={y(t) + 3.5}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: 9 }}
          >
            {formatAxis(t)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--yes)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {[0, Math.floor(data.length / 2), data.length - 1].map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={H - 4}
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
          className="fill-muted-foreground"
          style={{ fontSize: 9 }}
        >
          {k === 2 ? "Now" : formatDate(Math.floor(data[i].t / 1000))}
        </text>
      ))}
    </svg>
  );
}

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

function formatAxis(v: number) {
  if (v === 0) return "0";
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}
