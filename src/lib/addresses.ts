import { base, baseSepolia } from "wagmi/chains";
import type { Address, Hex } from "viem";
import { env } from "./env";

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

/** USDC and outcome tokens are both 6-decimal. See guide §3. */
export const USDC_DECIMALS = 6;
export const SHARE_DECIMALS = 6;

type ChainAddresses = {
  ctf: Address;
  usdc: Address;
  aavePool: Address;
  aUsdc: Address;
  /** VaultFactory is deployed per environment — override via env. */
  vaultFactory: Address;
};

const BASE_MAINNET: ChainAddresses = {
  ctf: "0xC9c98965297Bc527861c898329Ee280632B76e18",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  aUsdc: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
  // Live VaultFactory on Base mainnet. Override only to point at a redeploy.
  vaultFactory: (env(process.env.NEXT_PUBLIC_VAULT_FACTORY_BASE) ??
    "0x4200745262A978E09a82692931EcD96dA6d66a89") as Address,
};

const BASE_SEPOLIA: ChainAddresses = {
  ctf: (env(process.env.NEXT_PUBLIC_CTF_BASE_SEPOLIA) ?? ZERO_ADDRESS) as Address,
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  aavePool: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
  aUsdc: ZERO_ADDRESS,
  vaultFactory: (env(process.env.NEXT_PUBLIC_VAULT_FACTORY_BASE_SEPOLIA) ??
    ZERO_ADDRESS) as Address,
};

export const ADDRESSES = {
  [base.id]: BASE_MAINNET,
  [baseSepolia.id]: BASE_SEPOLIA,
} as const;

export type SupportedChainId = keyof typeof ADDRESSES;

export const SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const;

export const DEFAULT_CHAIN_ID: SupportedChainId = base.id;

export function isSupportedChain(id: number | undefined): id is SupportedChainId {
  return id === base.id || id === baseSepolia.id;
}

export function addressesFor(chainId: number | undefined): ChainAddresses {
  return ADDRESSES[isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID];
}

export const BLOCK_EXPLORERS: Record<SupportedChainId, string> = {
  [base.id]: "https://basescan.org",
  [baseSepolia.id]: "https://sepolia.basescan.org",
};

export function explorerUrl(
  chainId: number | undefined,
  kind: "address" | "tx",
  value: string,
) {
  const base_ =
    BLOCK_EXPLORERS[isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID];
  return `${base_}/${kind}/${value}`;
}
