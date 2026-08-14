import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";

/**
 * Transport configuration.
 *
 * Two endpoints, because they are good at different things:
 *
 * - **Calls** (`eth_call`, Multicall3) go to the configured provider. This is
 *   the hot path — the vault page is a chain of dependent reads, so per-request
 *   latency is what the user actually feels.
 * - **Logs** (`eth_getLogs`) go to an endpoint that permits a wide block range.
 *   Alchemy's free tier caps getLogs at 10 blocks, which would turn this vault's
 *   history into hundreds of requests; the public Base endpoint allows 10,000
 *   and does it in one.
 *
 * Both fall back to the public endpoint so a single provider outage degrades
 * rather than blanking the page.
 */

const PUBLIC_RPC: Record<number, string> = {
  [base.id]: "https://mainnet.base.org",
  [baseSepolia.id]: "https://sepolia.base.org",
};

const TRANSPORT_OPTS = { batch: true, retryCount: 3, retryDelay: 250 } as const;

function callUrl(chainId: number) {
  return chainId === base.id
    ? env(process.env.NEXT_PUBLIC_BASE_RPC_URL)
    : env(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL);
}

function logsUrl(chainId: number) {
  return chainId === base.id
    ? env(process.env.NEXT_PUBLIC_BASE_LOGS_RPC_URL)
    : env(process.env.NEXT_PUBLIC_BASE_SEPOLIA_LOGS_RPC_URL);
}

/** Transport for contract calls: configured provider first, public as backup. */
export function callTransport(chainId: number) {
  const urls = [callUrl(chainId), PUBLIC_RPC[chainId]].filter(
    (u): u is string => Boolean(u),
  );
  // With nothing configured, viem falls back to the chain's default endpoint.
  if (urls.length === 0) return http(undefined, TRANSPORT_OPTS);
  return fallback(urls.map((url) => http(url, TRANSPORT_OPTS)));
}

const CHAINS = { [base.id]: base, [baseSepolia.id]: baseSepolia } as const;

const logsClients = new Map<number, PublicClient>();

/**
 * A client dedicated to log queries. Kept separate from wagmi's client so the
 * wide-range endpoint is used for history without giving up the fast provider
 * for everything else.
 */
export function getLogsClient(chainId: number) {
  const cached = logsClients.get(chainId);
  if (cached) return cached;

  const chain = CHAINS[chainId as keyof typeof CHAINS] ?? base;
  const url = logsUrl(chainId) ?? PUBLIC_RPC[chainId];

  const client = createPublicClient({
    chain,
    transport: http(url, { batch: true, retryCount: 2, retryDelay: 400 }),
  }) as PublicClient;
  logsClients.set(chainId, client);
  return client;
}

/**
 * Widest `eth_getLogs` span the logs endpoint accepts. The public Base endpoint
 * allows 10,000; stay just under it.
 */
export const LOG_CHUNK = 9_000n;
