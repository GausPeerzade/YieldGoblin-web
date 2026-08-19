import type { Address } from "viem";
import { base } from "wagmi/chains";

/**
 * Per-chain protocol facts, plus optional curated overrides for individual
 * vaults.
 *
 * Since creation went permissionless the registry is no longer the source of
 * truth for *which* vaults exist — the factory is, and Limitless supplies the
 * metadata. What remains here is chain-level configuration and a hook for
 * hand-authored copy on vaults that deserve it.
 */

/**
 * Thresholds compiled into a vault. Not readable on-chain, so they travel as
 * config; production values unless a specific deployment says otherwise.
 */
export type VaultConstants = {
  /** Idle-pair threshold at which `rebalance()` is worth prompting. */
  minMerge: bigint;
  /** Distribution floor — yield below this is earned but not yet distributed. */
  dust: bigint;
  /** Aave's aToken rounds against the supplier; tolerate this much slippage. */
  roundingBuffer: bigint;
};

export const DEFAULT_CONSTANTS: VaultConstants = {
  minMerge: 100_000_000n, // 100 USDC
  dust: 10_000n, // 0.01 USDC
  roundingBuffer: 1_000n, // 0.001 USDC
};

/** Block the current factory was deployed at — nothing exists before it. */
export const FACTORY_DEPLOY_BLOCK: Record<number, bigint> = {
  [base.id]: 50_179_016n,
};

export function earliestBlock(chainId: number): bigint {
  return FACTORY_DEPLOY_BLOCK[chainId] ?? 0n;
}

/**
 * Optional curated overrides, keyed by vault address. Only needed when a vault
 * should show different copy from what Limitless reports, or was compiled with
 * non-production constants. An absent entry is the normal case.
 */
export type Deployment = {
  chainId: number;
  vault: Address;
  title?: string;
  symbol?: string;
  limitlessSlug?: string;
  deployBlock?: bigint;
  constants?: VaultConstants;
  testDeployment?: boolean;
};

export const DEPLOYMENTS: Deployment[] = [];

const BY_VAULT = new Map(
  DEPLOYMENTS.map((d) => [`${d.chainId}:${d.vault.toLowerCase()}`, d]),
);

export function deploymentByVault(
  chainId: number,
  vault: string | undefined,
): Deployment | undefined {
  if (!vault) return undefined;
  return BY_VAULT.get(`${chainId}:${vault.toLowerCase()}`);
}
