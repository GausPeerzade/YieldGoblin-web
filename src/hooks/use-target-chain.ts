"use client";

import { useAccount, useChainId } from "wagmi";

import { DEFAULT_CHAIN_ID, isSupportedChain, type SupportedChainId } from "@/lib/addresses";

/**
 * The chain the protocol is read from.
 *
 * `useChainId()` follows the connected wallet, so a user sitting on Ethereum —
 * or any network we don't deploy to — would send every read there and see an
 * empty app. Vault state is public, so reads are pinned to a supported chain
 * regardless of what the wallet is doing; only writes need the user to switch.
 */
export function useTargetChainId(): SupportedChainId {
  const walletChainId = useChainId();
  return isSupportedChain(walletChainId) ? walletChainId : DEFAULT_CHAIN_ID;
}

/** True when the wallet is connected but pointed at a chain we don't support. */
export function useIsWrongNetwork(): boolean {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  return isConnected && !isSupportedChain(walletChainId);
}
