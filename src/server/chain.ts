import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";

import { env } from "@/lib/env";

/**
 * Server-side chain access. This file must only be imported from route
 * handlers and server components — the point of it is that the RPC key read
 * here never ships in the browser bundle.
 *
 * Env resolution order lets local dev keep working with the existing
 * NEXT_PUBLIC_ values while production uses server-only names:
 *   BASE_RPC_URL  >  NEXT_PUBLIC_BASE_RPC_URL  >  public endpoint
 */

const PUBLIC_RPC: Record<number, string> = {
  [base.id]: "https://mainnet.base.org",
  [baseSepolia.id]: "https://sepolia.base.org",
};

const CHAINS = { [base.id]: base, [baseSepolia.id]: baseSepolia } as const;

function callUrls(chainId: number): string[] {
  const primary =
    chainId === base.id
      ? (env(process.env.BASE_RPC_URL) ?? env(process.env.NEXT_PUBLIC_BASE_RPC_URL))
      : (env(process.env.BASE_SEPOLIA_RPC_URL) ??
        env(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL));
  return [primary, PUBLIC_RPC[chainId]].filter((u): u is string => Boolean(u));
}

function logsUrl(chainId: number): string {
  const configured =
    chainId === base.id
      ? (env(process.env.BASE_LOGS_RPC_URL) ??
        env(process.env.NEXT_PUBLIC_BASE_LOGS_RPC_URL))
      : (env(process.env.BASE_SEPOLIA_LOGS_RPC_URL) ??
        env(process.env.NEXT_PUBLIC_BASE_SEPOLIA_LOGS_RPC_URL));
  return configured ?? PUBLIC_RPC[chainId];
}

const callClients = new Map<number, PublicClient>();
const logsClients = new Map<number, PublicClient>();

/** Client for eth_call / multicall — low latency is what matters here. */
export function serverClient(chainId: number = base.id): PublicClient {
  const cached = callClients.get(chainId);
  if (cached) return cached;
  const chain = CHAINS[chainId as keyof typeof CHAINS] ?? base;
  const urls = callUrls(chainId);
  const client = createPublicClient({
    chain,
    transport:
      urls.length > 0
        ? fallback(urls.map((u) => http(u, { batch: true, retryCount: 3, retryDelay: 250 })))
        : http(undefined, { batch: true, retryCount: 3, retryDelay: 250 }),
    batch: { multicall: { wait: 20 } },
  }) as PublicClient;
  callClients.set(chainId, client);
  return client;
}

/**
 * Client for eth_getLogs — needs a WIDE block range, not low latency.
 * Alchemy's free tier caps getLogs at 10 blocks; public Base allows 10,000.
 */
export function serverLogsClient(chainId: number = base.id): PublicClient {
  const cached = logsClients.get(chainId);
  if (cached) return cached;
  const chain = CHAINS[chainId as keyof typeof CHAINS] ?? base;
  const client = createPublicClient({
    chain,
    transport: http(logsUrl(chainId), { batch: true, retryCount: 2, retryDelay: 400 }),
  }) as PublicClient;
  logsClients.set(chainId, client);
  return client;
}

// ── TTL memo, per serverless instance ───────────────────────────────────────

/**
 * Tiny stale-while-revalidate cache. Scope is one lambda instance — the shared
 * layer on Vercel is the CDN (s-maxage on the route responses); this exists to
 * collapse concurrent requests and protect the RPC when instances stay warm.
 *
 * On error it serves the last good value rather than nothing: a slow or
 * rate-limited chain should degrade to slightly stale data, never to an empty
 * screen. That mirrors the client-side keepPreviousData behaviour.
 */
export function ttlCache<T>(ttlMs: number) {
  let value: T | undefined;
  let fetchedAt = 0;
  let inflight: Promise<T> | null = null;

  return async (fn: () => Promise<T>): Promise<T> => {
    if (value !== undefined && Date.now() - fetchedAt < ttlMs) return value;
    if (inflight) return inflight;
    inflight = fn()
      .then((v) => {
        value = v;
        fetchedAt = Date.now();
        inflight = null;
        return v;
      })
      .catch((err) => {
        inflight = null;
        if (value !== undefined) return value; // stale beats broken
        throw err;
      });
    return inflight;
  };
}

/** Keyed variant of ttlCache, for per-vault data like history. */
export function keyedTtlCache<T>(ttlMs: number) {
  const entries = new Map<string, ReturnType<typeof ttlCache<T>>>();
  return (key: string, fn: () => Promise<T>): Promise<T> => {
    let entry = entries.get(key);
    if (!entry) {
      entry = ttlCache<T>(ttlMs);
      entries.set(key, entry);
    }
    return entry(fn);
  };
}
