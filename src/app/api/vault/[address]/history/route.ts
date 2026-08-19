import { NextResponse } from "next/server";
import type { Address } from "viem";

import { activityToWire } from "@/lib/wire";
import { getVaultHistory } from "@/server/history";
import { getVault } from "@/server/registry";

/** Decoded event history for one vault. Append-only, so cached generously. */
export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=60, stale-while-revalidate=240";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  // Only registry-verified vaults get scanned — this endpoint must not be a
  // free log-scanning service for arbitrary contracts.
  const vault = await getVault(address as Address);
  if (!vault) return NextResponse.json({ error: "unknown vault" }, { status: 404 });

  try {
    const { activity, yieldSeries } = await getVaultHistory(address as Address);
    return NextResponse.json(
      {
        activity: activity.map(activityToWire),
        yieldSeries: yieldSeries.map((p) => ({
          t: p.t,
          cumulative: p.cumulative.toString(),
        })),
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch {
    return NextResponse.json({ error: "history unavailable" }, { status: 502 });
  }
}
