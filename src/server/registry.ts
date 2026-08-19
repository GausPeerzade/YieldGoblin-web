import type { Address, ContractFunctionParameters, Hex } from "viem";
import { base } from "viem/chains";

import { aavePoolAbi } from "@/lib/abis/aavePool";
import { aaveAdapterAbi } from "@/lib/abis/aaveAdapter";
import { conditionalTokensAbi } from "@/lib/abis/conditionalTokens";
import { pairYieldVaultAbi } from "@/lib/abis/pairYieldVault";
import { vaultFactoryAbi } from "@/lib/abis/vaultFactory";
import { addressesFor, ZERO_ADDRESS } from "@/lib/addresses";
import { DEFAULT_CONSTANTS, deploymentByVault } from "@/lib/deployments";
import { env } from "@/lib/env";
import { shortenHex } from "@/lib/format";
import type { VaultView } from "@/lib/protocol";
import { serverClient, ttlCache } from "./chain";
import { getMarketIndex } from "./limitless";

/**
 * The server-side vault registry — the read model the whole site is served
 * from once vault creation is permissionless.
 *
 * The factory contract is the source of truth for *which* vaults exist; the
 * Limitless API supplies the off-chain metadata (title, ticker, slug) keyed by
 * conditionId; `deployments.ts` remains only as a hand-written override for
 * vaults that need special constants or curated copy. Nothing on this path
 * depends on a database — the durable store is the chain itself, and this
 * module is a cache in front of it.
 *
 * Refresh cost is independent of visitor count: one enumeration multicall,
 * one state multicall, one dependent multicall — three RPC round trips per
 * TTL for the entire site.
 */

const VAULT_FIELDS = [
  "totalYes",
  "totalNo",
  "mergedPairs",
  "idleUsdc",
  "unrealisedYield",
  "yieldReserve",
  "settled",
  "yesPayoutWad",
  "noPayoutWad",
  "conditionId",
  "yesId",
  "noId",
  "deadline",
  "perfFeeBps",
  "adapter",
] as const;

// ── Moderation ──────────────────────────────────────────────────────────────

/**
 * Permissionless creation means anyone can point a vault at any market, and
 * the UI will render whatever title Limitless returns — including junk. These
 * env-var lists are the day-one moderation lever: comma-separated addresses.
 * A database with per-vault flags replaces this when the list outgrows an env
 * var, but the enforcement point (here, server-side) stays the same.
 */
function envAddressSet(name: string | undefined): Set<string> {
  return new Set(
    (name ?? "")
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter((a) => /^0x[0-9a-f]{40}$/.test(a)),
  );
}

const hidden = () => envAddressSet(env(process.env.HIDDEN_VAULTS));
const featured = () => envAddressSet(env(process.env.FEATURED_VAULTS));

// ── Enumeration ─────────────────────────────────────────────────────────────

const addressCache = ttlCache<Address[]>(30_000);

async function getVaultAddresses(chainId: number): Promise<Address[]> {
  const { vaultFactory } = addressesFor(chainId);
  if (vaultFactory === ZERO_ADDRESS) return [];
  const client = serverClient(chainId);

  return addressCache(async () => {
    const count = await client.readContract({
      abi: vaultFactoryAbi,
      address: vaultFactory,
      functionName: "vaultCount",
    });
    if (count === 0n) return [];
    const reads = await client.multicall({
      contracts: Array.from({ length: Number(count) }, (_, i) => ({
        abi: vaultFactoryAbi,
        address: vaultFactory,
        functionName: "vaults" as const,
        args: [BigInt(i)] as const,
      })),
      allowFailure: true,
    });
    return reads
      .map((r) => (r.status === "success" ? (r.result as Address) : undefined))
      .filter((a): a is Address => Boolean(a));
  });
}

/** On-chain registry check, used by the `ensure` path for brand-new vaults. */
export async function isRegisteredVault(
  address: Address,
  chainId: number = base.id,
): Promise<boolean> {
  const { vaultFactory } = addressesFor(chainId);
  if (vaultFactory === ZERO_ADDRESS) return false;
  try {
    return await serverClient(chainId).readContract({
      abi: vaultFactoryAbi,
      address: vaultFactory,
      functionName: "isVault",
      args: [address],
    });
  } catch {
    return false;
  }
}

// ── State assembly ──────────────────────────────────────────────────────────

type ReadResult = { result?: unknown; status: "success" | "failure" };

/** Limitless reports expiry in ms on the detail route, seconds on the list. */
function toUnixSeconds(value: number): number {
  return value > 2e10 ? Math.floor(value / 1000) : value;
}

const modelCache = ttlCache<VaultView[]>(12_000);

export async function getReadModel(chainId: number = base.id): Promise<VaultView[]> {
  return modelCache(() => buildReadModel(chainId));
}

/**
 * Single-vault view. Serves vaults created moments ago that the cached list
 * has not picked up yet: verify against the factory, then build state for
 * just that address.
 */
export async function getVault(
  address: Address,
  chainId: number = base.id,
): Promise<VaultView | undefined> {
  const list = await getReadModel(chainId);
  const found = list.find(
    (v) => v.address.toLowerCase() === address.toLowerCase(),
  );
  if (found) return found;

  if (hidden().has(address.toLowerCase())) return undefined;
  if (!(await isRegisteredVault(address, chainId))) return undefined;
  const [vault] = await assembleVaults([address], chainId);
  return vault;
}

async function buildReadModel(chainId: number): Promise<VaultView[]> {
  const addresses = await getVaultAddresses(chainId);
  const hide = hidden();
  const visible = addresses.filter((a) => !hide.has(a.toLowerCase()));
  return assembleVaults(visible, chainId);
}

async function assembleVaults(
  addresses: Address[],
  chainId: number,
): Promise<VaultView[]> {
  if (addresses.length === 0) return [];
  const client = serverClient(chainId);
  const { ctf, aavePool, usdc } = addressesFor(chainId);

  // Phase 1: identity + pool state for every vault, one multicall.
  const phase1 = (await client.multicall({
    contracts: addresses.flatMap((address) =>
      VAULT_FIELDS.map((functionName) => ({
        abi: pairYieldVaultAbi,
        address,
        functionName,
      })),
    ),
    allowFailure: true,
  })) as ReadResult[];

  const per = addresses.map((address, i) => {
    const slice = phase1.slice(i * VAULT_FIELDS.length, (i + 1) * VAULT_FIELDS.length);
    const get = (name: (typeof VAULT_FIELDS)[number]) =>
      slice[VAULT_FIELDS.indexOf(name)]?.result;
    const big = (name: (typeof VAULT_FIELDS)[number]) =>
      (get(name) as bigint | undefined) ?? 0n;
    return { address, get, big };
  });

  // A vault whose core reads failed is dropped rather than half-rendered.
  const sound = per.filter((p) => Boolean(p.get("conditionId")));

  // Phase 2: everything that depends on phase-1 values, plus the Aave rate.
  // `harvest()` runs as a staticcall inside the multicall — a `false` return
  // means the venue can't currently pay out (degraded); a revert is not
  // treated as unhealthy.
  const phase2Contracts: ContractFunctionParameters[] = sound.flatMap((p) => [
    {
      abi: conditionalTokensAbi,
      address: ctf,
      functionName: "payoutDenominator",
      args: [p.get("conditionId") as Hex],
    },
    {
      abi: aaveAdapterAbi,
      address: p.get("adapter") as Address,
      functionName: "totalAssets",
    },
    {
      abi: pairYieldVaultAbi,
      address: p.address,
      functionName: "harvest",
    },
  ]);

  const [reserveRead, phase2] = await Promise.all([
    client
      .readContract({
        abi: aavePoolAbi,
        address: aavePool,
        functionName: "getReserveData",
        args: [usdc],
      })
      .catch(() => undefined),
    client.multicall({ contracts: phase2Contracts, allowFailure: true }) as Promise<ReadResult[]>,
  ]);

  const aaveApr = reserveRead
    ? Number(reserveRead.currentLiquidityRate) / 1e27
    : 0;

  const marketIndex = await getMarketIndex().catch(
    () => new Map<string, never>(),
  );
  const feature = featured();

  return sound.map((p, i) => {
    const at = (offset: number) => phase2[i * 3 + offset];
    const payoutDenominator =
      at(0)?.status === "success" ? (at(0).result as bigint) : 0n;
    const adapterAssets =
      at(1)?.status === "success" ? (at(1).result as bigint) : undefined;
    const harvest = at(2);
    const venueHealthy = !(harvest?.status === "success" && harvest.result === false);

    const conditionId = p.get("conditionId") as Hex;
    const deployment = deploymentByVault(chainId, p.address);
    const meta = marketIndex.get(conditionId.toLowerCase());

    // Metadata precedence: curated override, then Limitless, then an honest
    // generic identifier — a title is never invented (AGENTS.md rule).
    const question =
      deployment?.title ?? meta?.title ?? `Market ${shortenHex(conditionId, 8)}`;
    const symbol = deployment?.symbol ?? meta?.ticker ?? "USDC";
    const slug = deployment?.limitlessSlug ?? meta?.slug ?? undefined;

    const settled = p.get("settled") === true;

    // Limitless is the authority on when its own market closes; the vault's
    // `deadline()` is caller-supplied and unverified, so it is only a fallback.
    const venueDeadline = meta?.expirationTimestamp
      ? BigInt(toUnixSeconds(meta.expirationTimestamp))
      : null;

    return {
      address: p.address,
      chainId,
      conditionId,
      yesId: p.big("yesId"),
      noId: p.big("noId"),
      adapter: (p.get("adapter") as Address) ?? ZERO_ADDRESS,
      /**
       * The venue's expiry wins over the vault's own `deadline()`.
       *
       * Since creation went permissionless, `deadline` is caller-supplied and
       * no contract logic verifies it — whoever created the vault could put
       * anything there. Limitless is the authority on when its own market
       * closes, so the on-chain value is only a fallback for vaults whose
       * market we can't resolve.
       */
      deadline: venueDeadline ?? p.big("deadline"),
      /** True when the creator's `deadline()` disagrees with the venue. */
      deadlineDisputed:
        venueDeadline !== null &&
        p.big("deadline") > 0n &&
        venueDeadline !== p.big("deadline"),
      perfFeeBps: Number((p.get("perfFeeBps") as number | undefined) ?? 0),
      market: {
        question,
        symbol,
        venue: "limitless" as const,
        venueUrl: slug ? `https://limitless.exchange/markets/${slug}` : undefined,
      },
      hasMetadata: Boolean(deployment || meta?.title),
      totalYes: p.big("totalYes"),
      totalNo: p.big("totalNo"),
      mergedPairs: p.big("mergedPairs"),
      idleUsdc: p.big("idleUsdc"),
      idleYes: 0n,
      idleNo: 0n,
      unrealisedYield: p.big("unrealisedYield"),
      yieldReserve: p.big("yieldReserve"),
      settled,
      resolved: settled || payoutDenominator !== 0n,
      yesPayoutWad: p.big("yesPayoutWad"),
      noPayoutWad: p.big("noPayoutWad"),
      venueHealthy,
      aaveApr,
      constants: deployment?.constants ?? DEFAULT_CONSTANTS,
      adapterAssets,
      testDeployment: deployment?.testDeployment,
      featured: feature.has(p.address.toLowerCase()) || undefined,
    } satisfies VaultView;
  });
}
