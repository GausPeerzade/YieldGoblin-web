import { getAddress, type Address, type Hex } from "viem";
import { base } from "viem/chains";

import { conditionalTokensAbi } from "@/lib/abis/conditionalTokens";
import { vaultFactoryAbi } from "@/lib/abis/vaultFactory";
import { addressesFor, CREATE_PARAMS, ZERO_ADDRESS, ZERO_BYTES32 } from "@/lib/addresses";
import { serverClient } from "./chain";

/**
 * Turns a Limitless market link into a verified, deployable vault proposal.
 *
 * Everything the factory needs is derived rather than typed by the user: the
 * conditionId comes from Limitless, the position ids are computed from the CTF,
 * and the venue addresses are constants. The only human input is the link.
 *
 * Every check below maps to a way creation would otherwise fail — either
 * reverting on-chain, or worse, succeeding and producing a vault that cannot
 * work (wrong collateral, multi-outcome, already resolved).
 */

export type CheckId =
  | "market-found"
  | "binary"
  | "usdc-collateral"
  | "unresolved"
  | "no-existing-vault"
  | "has-deadline"
  | "ids-match"
  | "venue-trusted"
  | "simulates";

export type Check = {
  id: CheckId;
  label: string;
  ok: boolean;
  /** Shown when the check fails; explains what the user can do about it. */
  detail?: string;
};

export type ResolvedMarket = {
  slug: string;
  title: string;
  ticker: string | null;
  conditionId: Hex;
  yesId: string;
  noId: string;
  /** Unix seconds. */
  deadline: number;
  yesPrice: number | null;
  noPrice: number | null;
  volume: string | null;
  marketUrl: string;
};

export type ResolveResult = {
  ok: boolean;
  market?: ResolvedMarket;
  /** Present when a vault already exists — the caller should link to it. */
  existingVault?: Address;
  checks: Check[];
  /** Exact `createVault` arguments, ready to sign. Only when ok. */
  deployArgs?: {
    conditionId: Hex;
    yesId: string;
    noId: string;
    deadline: string;
    exchange: Address;
    adapterImplementation: Address;
  };
  /** Fee the new vault will carry, read from the factory. */
  perfFeeBps?: number;
  error?: string;
};

/**
 * Accepts a full Limitless URL or a bare slug. Query strings and trailing
 * slashes are common when people copy from a share sheet.
 */
export function parseSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const slugPattern = /^[a-z0-9][a-z0-9-]{2,120}$/i;
  if (slugPattern.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.endsWith("limitless.exchange")) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    // /markets/<slug>  or  /market/<slug>
    const idx = segments.findIndex((s) => s === "markets" || s === "market");
    const slug = idx >= 0 ? segments[idx + 1] : segments[segments.length - 1];
    return slug && slugPattern.test(slug) ? slug.toLowerCase() : null;
  } catch {
    return null;
  }
}

type RawMarket = {
  conditionId?: string;
  slug?: string;
  title?: string;
  status?: string;
  prices?: number[];
  volumeFormatted?: string;
  expirationTimestamp?: number;
  collateralToken?: { address?: string } | string;
  priceOracleMetadata?: { ticker?: string };
  negRiskRequestId?: string | null;
  /** The CTFExchange this market trades on — several deployments exist. */
  venue?: { exchange?: string; adapter?: string | null };
  /** Position ids as the venue reports them, used only as a cross-check. */
  tokens?: { yes?: string; no?: string };
};

async function fetchMarket(slug: string): Promise<RawMarket | null> {
  const res = await fetch(`https://api.limitless.exchange/markets/${slug}`, {
    headers: {
      accept: "application/json",
      "User-Agent": "YieldGoblin/1.0 (+https://yieldgoblin.vercel.app)",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = await res.json();
  const market = Array.isArray(body) ? body[0] : (body?.data ?? body);
  return market?.conditionId ? (market as RawMarket) : null;
}

/** Limitless returns expiry in ms on the detail route, seconds on the list. */
function toUnixSeconds(value: number | undefined): number {
  if (!value) return 0;
  return value > 2e10 ? Math.floor(value / 1000) : value;
}

function collateralAddress(m: RawMarket): string | undefined {
  const c = m.collateralToken;
  return typeof c === "string" ? c : c?.address;
}

export async function resolveMarket(
  input: string,
  chainId: number = base.id,
): Promise<ResolveResult> {
  const slug = parseSlug(input);
  if (!slug) {
    return {
      ok: false,
      checks: [],
      error:
        "That doesn't look like a Limitless market link. Paste the full URL, e.g. https://limitless.exchange/markets/btc-up-or-down-weekly-…",
    };
  }

  const raw = await fetchMarket(slug);
  const checks: Check[] = [];
  const push = (id: CheckId, label: string, ok: boolean, detail?: string) =>
    checks.push({ id, label, ok, detail });

  push("market-found", "Market exists on Limitless", Boolean(raw),
    raw ? undefined : "Limitless has no market with that link. Check the URL and try again.");
  if (!raw) return { ok: false, checks };

  const conditionId = raw.conditionId as Hex;
  const { ctf, usdc, vaultFactory } = addressesFor(chainId);
  const client = serverClient(chainId);

  // Collateral must be plain USDC. This is also what rules out NegRisk
  // markets, whose positions sit under a different collateral wrapper.
  const collateral = collateralAddress(raw);
  const isUsdc =
    Boolean(collateral) &&
    getAddress(collateral as string) === getAddress(usdc) &&
    !raw.negRiskRequestId;
  push("usdc-collateral", "Settles in USDC", isUsdc,
    isUsdc ? undefined : "Vaults only support markets collateralised in plain USDC.");

  const [slots, denominator, existing] = await Promise.all([
    client.readContract({
      abi: conditionalTokensAbi, address: ctf,
      functionName: "getOutcomeSlotCount", args: [conditionId],
    }).catch(() => 0n),
    client.readContract({
      abi: conditionalTokensAbi, address: ctf,
      functionName: "payoutDenominator", args: [conditionId],
    }).catch(() => 0n),
    vaultFactory === ZERO_ADDRESS
      ? Promise.resolve(ZERO_ADDRESS as Address)
      : client.readContract({
          abi: vaultFactoryAbi, address: vaultFactory,
          functionName: "vaultOf", args: [conditionId],
        }).catch(() => ZERO_ADDRESS as Address),
  ]);

  const isBinary = slots === 2n;
  push("binary", "Binary market (YES / NO)", isBinary,
    isBinary ? undefined : `This market has ${slots} outcomes. Vaults only support two.`);

  const unresolved = denominator === 0n;
  push("unresolved", "Not yet resolved", unresolved,
    unresolved ? undefined : "This market has already resolved, so a vault would have nothing to earn on.");

  const vaultExists = existing !== ZERO_ADDRESS;
  push("no-existing-vault", "No vault yet", !vaultExists,
    vaultExists ? "A vault already exists for this market." : undefined);

  // The market's own exchange, not a guess — several CTFExchange deployments
  // exist and the factory rejects any it doesn't trust.
  const exchange = raw.venue?.exchange
    ? getAddress(raw.venue.exchange)
    : CREATE_PARAMS.fallbackExchange;

  const [adapterTrusted, exchangeTrusted] = await Promise.all(
    ([
      ["isTrustedAdapter", CREATE_PARAMS.adapterImplementation],
      ["isTrustedExchange", exchange],
    ] as const).map(([fn, addr]) =>
      vaultFactory === ZERO_ADDRESS
        ? Promise.resolve(false)
        : client
            .readContract({ abi: vaultFactoryAbi, address: vaultFactory, functionName: fn, args: [addr] })
            .catch(() => false),
    ),
  );
  const venueOk = adapterTrusted && exchangeTrusted;
  push("venue-trusted", "Exchange and yield venue are approved", venueOk,
    venueOk
      ? undefined
      : !exchangeTrusted
        ? "This market trades on an exchange the factory doesn't recognise."
        : "The Aave adapter isn't currently approved by the factory.");

  const deadline = toUnixSeconds(raw.expirationTimestamp);
  const hasDeadline = deadline > 0;
  push("has-deadline", "Has a close date", hasDeadline,
    hasDeadline ? undefined : "Limitless didn't report a close date for this market.");

  // Position ids are derived, never taken from the user — index set 1 is YES,
  // 2 is NO, both under USDC collateral.
  let yesId = 0n;
  let noId = 0n;
  if (isBinary && isUsdc) {
    const ids = await Promise.all(
      [1n, 2n].map(async (indexSet) => {
        const collection = await client.readContract({
          abi: conditionalTokensAbi, address: ctf,
          functionName: "getCollectionId",
          args: [ZERO_BYTES32, conditionId, indexSet],
        });
        return client.readContract({
          abi: conditionalTokensAbi, address: ctf,
          functionName: "getPositionId", args: [usdc, collection],
        });
      }),
    );
    [yesId, noId] = ids;
  }

  // The ids are always derived from the CTF — never taken from the API. This
  // only checks the two agree; a mismatch means the market is not the vanilla
  // USDC binary pair it appears to be, and creation would produce a vault
  // pointing at the wrong tokens.
  const apiYes = raw.tokens?.yes;
  const apiNo = raw.tokens?.no;
  const idsMatch =
    !apiYes || !apiNo
      ? true
      : BigInt(apiYes) === yesId && BigInt(apiNo) === noId;
  push("ids-match", "Outcome tokens verify against the venue", idsMatch,
    idsMatch ? undefined : "The venue reports different token ids than the chain derives for this market.");

  const market: ResolvedMarket = {
    slug,
    title: raw.title ?? slug,
    ticker: raw.priceOracleMetadata?.ticker ?? null,
    conditionId,
    yesId: yesId.toString(),
    noId: noId.toString(),
    deadline,
    yesPrice: raw.prices?.[0] ?? null,
    noPrice: raw.prices?.[1] ?? null,
    volume: raw.volumeFormatted ?? null,
    marketUrl: `https://limitless.exchange/markets/${slug}`,
  };

  const preflightOk = checks.every((c) => c.ok);
  if (!preflightOk) {
    return {
      ok: false,
      market,
      existingVault: vaultExists ? (existing as Address) : undefined,
      checks,
    };
  }

  // Final gate: ask the chain whether this exact call would succeed. Catches
  // anything the explicit checks miss, and is simulated from the factory admin
  // so a non-curator visitor still sees a true eligibility answer.
  const deployArgs = {
    conditionId,
    yesId: yesId.toString(),
    noId: noId.toString(),
    deadline: deadline.toString(),
    exchange,
    adapterImplementation: CREATE_PARAMS.adapterImplementation,
  };

  // Final gate: ask the chain whether this exact call would succeed. Creation
  // is permissionless, so simulating from a throwaway address gives the same
  // answer any visitor would get.
  let simulates = false;
  let simulateDetail: string | undefined;
  try {
    await client.simulateContract({
      abi: vaultFactoryAbi,
      address: vaultFactory,
      functionName: "createVault",
      args: [
        conditionId, yesId, noId, BigInt(deadline),
        exchange, CREATE_PARAMS.adapterImplementation,
      ],
      account: SIMULATION_PROBE,
    });
    simulates = true;
  } catch (err) {
    const named = (err as { cause?: { data?: { errorName?: string } } })?.cause?.data?.errorName;
    simulateDetail =
      FACTORY_ERROR_COPY[named ?? ""] ??
      (err instanceof Error
        ? err.message.split("\n")[0].slice(0, 160)
        : "The factory rejected this market.");
  }
  push("simulates", "Factory accepts this market", simulates, simulateDetail);

  const perfFeeBps = await client
    .readContract({ abi: vaultFactoryAbi, address: vaultFactory, functionName: "defaultPerfFeeBps" })
    .catch(() => undefined);

  return {
    ok: checks.every((c) => c.ok),
    market,
    checks,
    deployArgs: simulates ? deployArgs : undefined,
    perfFeeBps,
  };
}

/** Factory reverts, in the words a person pasting a link would want. */
const FACTORY_ERROR_COPY: Record<string, string> = {
  VaultExists: "A vault already exists for this market.",
  AdapterNotTrusted: "This yield venue isn't approved by the factory yet.",
  ExchangeNotTrusted: "This market trades on an exchange the factory doesn't recognise.",
  ExchangePairMismatch: "The YES/NO pair isn't registered as complementary on that exchange.",
  ConditionNotBinary: "This isn't a two-outcome market.",
  ConditionAlreadyResolved: "This market has already resolved.",
};

/**
 * Arbitrary `from` address for the eligibility simulation. Creation is
 * permissionless, so any address gives the same answer — this one is a
 * well-known burn address purely so the call has a sender.
 */
const SIMULATION_PROBE: Address = "0x000000000000000000000000000000000000dEaD";
