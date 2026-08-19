import { ttlCache } from "./chain";

/**
 * Limitless market metadata, keyed by conditionId.
 *
 * Question text, ticker and slug are not on-chain, so a permissionless vault
 * registry has to look them up here. One paged fetch serves every vault, and
 * resolved entries are kept for the life of the instance — a market drops off
 * `/markets/active` once it closes, but its title never changes, so the last
 * known metadata stays valid.
 */

const UPSTREAM = "https://api.limitless.exchange/markets/active";
const PAGE_SIZE = 25;
const MAX_PAGES = 8;

export type LimitlessMeta = {
  conditionId: string;
  title: string | null;
  slug: string | null;
  /** Oracle ticker, e.g. "BTC" — drives the logo. */
  ticker: string | null;
  /** [yes, no], each 0–1. Mark prices, not tradable quotes. */
  yesPrice: number | null;
  noPrice: number | null;
  volume: string | null;
  expirationTimestamp: number | null;
};

type RawMarket = {
  conditionId?: string;
  slug?: string;
  title?: string;
  prices?: number[];
  volumeFormatted?: string;
  expirationTimestamp?: number;
  priceOracleMetadata?: { ticker?: string };
};

function unwrap(payload: unknown): RawMarket[] {
  if (Array.isArray(payload)) return payload as RawMarket[];
  if (payload && typeof payload === "object") {
    const data =
      (payload as { data?: unknown }).data ??
      (payload as { markets?: unknown }).markets;
    if (Array.isArray(data)) return data as RawMarket[];
  }
  return [];
}

/** Sticky store: once a conditionId has metadata, it survives cache refreshes. */
const known = new Map<string, LimitlessMeta>();

const indexCache = ttlCache<Map<string, LimitlessMeta>>(120_000);

export async function getMarketIndex(): Promise<Map<string, LimitlessMeta>> {
  return indexCache(async () => {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${UPSTREAM}?page=${page}&limit=${PAGE_SIZE}`, {
        headers: {
          accept: "application/json",
          // A missing User-Agent gets a 403 from upstream.
          "User-Agent": "YieldGoblin/1.0 (+https://yieldgoblin.vercel.app)",
        },
        cache: "no-store",
      });
      if (!res.ok) break;

      const markets = unwrap(await res.json());
      for (const m of markets) {
        const id = m.conditionId?.toLowerCase();
        if (!id) continue;
        known.set(id, {
          conditionId: id,
          title: m.title ?? null,
          slug: m.slug ?? null,
          ticker: m.priceOracleMetadata?.ticker ?? null,
          yesPrice: m.prices?.[0] ?? null,
          noPrice: m.prices?.[1] ?? null,
          volume: m.volumeFormatted ?? null,
          expirationTimestamp: m.expirationTimestamp ?? null,
        });
      }
      if (markets.length < PAGE_SIZE) break;
    }
    // `known` accumulates across refreshes; the cache value is a snapshot view.
    return new Map(known);
  });
}

export async function metadataFor(
  conditionId: string,
): Promise<LimitlessMeta | undefined> {
  const index = await getMarketIndex();
  return index.get(conditionId.toLowerCase());
}
