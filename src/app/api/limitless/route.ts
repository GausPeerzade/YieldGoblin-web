import { NextResponse } from "next/server";

/**
 * Proxy for Limitless market metadata.
 *
 * Runs server-side for two reasons: the upstream API returns 403 without a
 * User-Agent, and it sends no CORS headers. Odds are market context only — the
 * vault's yield and principal do not depend on them.
 */

const UPSTREAM = "https://api.limitless.exchange/markets/active";
const PAGE_SIZE = 25;
const MAX_PAGES = 8;

type LimitlessMarket = {
  conditionId?: string;
  slug?: string;
  title?: string;
  prices?: number[];
  volumeFormatted?: string;
  expirationTimestamp?: number;
};

function unwrap(payload: unknown): LimitlessMarket[] {
  if (Array.isArray(payload)) return payload as LimitlessMarket[];
  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown; markets?: unknown }).data ??
      (payload as { markets?: unknown }).markets;
    if (Array.isArray(data)) return data as LimitlessMarket[];
  }
  return [];
}

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
    // The vault's market may not be on the first page, so walk a few.
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${UPSTREAM}?page=${page}&limit=${PAGE_SIZE}`, {
        headers: {
          accept: "application/json",
          // A missing User-Agent gets a 403 from upstream.
          "User-Agent": "YieldGoblin/1.0 (+https://yieldgoblin.xyz)",
        },
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `upstream ${res.status}` },
          { status: 502 },
        );
      }

      const markets = unwrap(await res.json());
      if (markets.length === 0) break;

      const match = markets.find(
        (m) =>
          (conditionId && m.conditionId?.toLowerCase() === conditionId) ||
          (slug && m.slug?.toLowerCase() === slug),
      );

      if (match) {
        return NextResponse.json(
          {
            found: true,
            title: match.title ?? null,
            slug: match.slug ?? null,
            // prices is [yes, no], each 0–1.
            yesPrice: match.prices?.[0] ?? null,
            noPrice: match.prices?.[1] ?? null,
            volume: match.volumeFormatted ?? null,
            expirationTimestamp: match.expirationTimestamp ?? null,
          },
          { headers: { "Cache-Control": "public, max-age=60" } },
        );
      }

      if (markets.length < PAGE_SIZE) break;
    }

    // Not being listed is normal — a market drops off `active` once it closes.
    return NextResponse.json({ found: false });
  } catch {
    return NextResponse.json({ error: "upstream unreachable" }, { status: 502 });
  }
}
