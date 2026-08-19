import { NextResponse } from "next/server";

import { getMarketIndex } from "@/server/limitless";

/**
 * Market odds lookup, backed by the shared server-side Limitless index.
 *
 * Server-side because upstream 403s without a User-Agent and sends no CORS
 * headers. Odds are market context only — the vault's yield and principal do
 * not depend on them.
 */
export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=60, stale-while-revalidate=120";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conditionId = searchParams.get("conditionId")?.toLowerCase();
  const slug = searchParams.get("slug")?.toLowerCase();

  if (!conditionId && !slug) {
    return NextResponse.json(
      { error: "conditionId or slug is required" },
      { status: 400 },
    );
  }

  try {
    const index = await getMarketIndex();
    const match = conditionId
      ? index.get(conditionId)
      : [...index.values()].find((m) => m.slug?.toLowerCase() === slug);

    if (!match) {
      // Not being listed is normal — markets drop off `active` once closed.
      return NextResponse.json({ found: false }, { headers: { "Cache-Control": CACHE } });
    }

    return NextResponse.json(
      {
        found: true,
        title: match.title,
        slug: match.slug,
        yesPrice: match.yesPrice,
        noPrice: match.noPrice,
        volume: match.volume,
        expirationTimestamp: match.expirationTimestamp,
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch {
    return NextResponse.json({ error: "upstream unreachable" }, { status: 502 });
  }
}
