import type { Address, Hex } from "viem";
import { base } from "wagmi/chains";

/**
 * Live deployments on Base mainnet.
 *
 * Question text, ticker and venue slug are not on-chain — they come from the
 * Limitless market — so they are registered here by `conditionId`. Everything
 * else is read from the contracts; nothing below is a substitute for a read.
 */

/**
 * Constants compiled into a vault. `MIN_MERGE` and `DUST` differ between
 * deployments, so the UI must read them from config rather than assume the
 * production values (guide §5).
 */
export type VaultConstants = {
  /** Idle-pair threshold at which `rebalance()` is worth prompting. */
  minMerge: bigint;
  /** Distribution floor — yield below this is earned but not yet distributed. */
  dust: bigint;
  /** Aave's aToken rounds against the supplier; tolerate this much slippage. */
  roundingBuffer: bigint;
};

/** Production defaults, used for any vault without a specific entry. */
export const DEFAULT_CONSTANTS: VaultConstants = {
  minMerge: 100_000_000n, // 100 USDC
  dust: 10_000n, // 0.01 USDC
  roundingBuffer: 1_000n, // 0.001 USDC
};

export type Deployment = {
  chainId: number;
  vault: Address;
  factory: Address;
  adapter: Address;
  /** Nothing exists before this — use as `fromBlock` for every event query. */
  deployBlock: bigint;
  conditionId: Hex;
  yesId: bigint;
  noId: bigint;
  title: string;
  /** Ticker used to pick a logo. */
  symbol: string;
  limitlessSlug: string;
  /** Unix seconds. Informational — the vault gates on nothing. */
  resolvesAt: number;
  perfFeeBps: number;
  constants: VaultConstants;
  /** Non-production constants worth surfacing to whoever is testing. */
  testDeployment?: boolean;
};

export const BTC_WEEKLY: Deployment = {
  chainId: base.id,

  vault: "0x5AA2b5baEE8A3a23Ed05bF4A876E78Db2CBefBf2",
  factory: "0x4200745262A978E09a82692931EcD96dA6d66a89",
  adapter: "0x189CaBd2A281C84a9289a46a60428F935E3F6f0e",
  deployBlock: 49_957_700n,

  conditionId:
    "0x871445f58c642865b9e06573467bec4aac844cb5c04a20b6caf72f178db8da9d",
  yesId: 27333488392498028930487442380984709247755975915187985780851313151732977721214n,
  noId: 22746277108006739713567391413502318879459943755852729419836421107799316018553n,

  title: "BTC Up or Down — Weekly",
  symbol: "BTC",
  limitlessSlug: "btc-up-or-down-weekly-1786334400",
  resolvesAt: 1_786_939_140, // Aug 17, 2026

  perfFeeBps: 500,

  // Lowered from the production 100 USDC so a 2 USDC test could actually merge.
  constants: {
    minMerge: 1_000_000n, // 1 USDC
    dust: 10_000n, // 0.01 USDC
    roundingBuffer: 1_000n, // 0.001 USDC
  },
  testDeployment: true,
};

export const DEPLOYMENTS: Deployment[] = [BTC_WEEKLY];

const BY_VAULT = new Map(
  DEPLOYMENTS.map((d) => [`${d.chainId}:${d.vault.toLowerCase()}`, d]),
);
const BY_CONDITION = new Map(
  DEPLOYMENTS.map((d) => [`${d.chainId}:${d.conditionId.toLowerCase()}`, d]),
);

export function deploymentByVault(
  chainId: number,
  vault: string | undefined,
): Deployment | undefined {
  if (!vault) return undefined;
  return BY_VAULT.get(`${chainId}:${vault.toLowerCase()}`);
}

export function deploymentByCondition(
  chainId: number,
  conditionId: string | undefined,
): Deployment | undefined {
  if (!conditionId) return undefined;
  return BY_CONDITION.get(`${chainId}:${conditionId.toLowerCase()}`);
}

/**
 * The earliest block worth scanning on a chain. Event queries over the whole
 * chain would be rejected by most RPCs and would return nothing useful anyway.
 */
export function earliestBlock(chainId: number): bigint {
  const blocks = DEPLOYMENTS.filter((d) => d.chainId === chainId).map(
    (d) => d.deployBlock,
  );
  return blocks.length ? blocks.reduce((a, b) => (a < b ? a : b)) : 0n;
}
