"use client";

import { useAccount, useBytecode } from "wagmi";

/**
 * Outcome tokens are ERC-1155, so a wallet that is a contract must implement
 * the receiver hooks or every deposit and withdrawal will revert.
 *
 * An EOA has no bytecode. An EIP-7702 delegated EOA carries a 23-byte
 * designator (0xef0100 + 20-byte address) — those usually *do* work, since the
 * delegate account still executes as the EOA, but it's worth flagging so a
 * user is warned before committing gas rather than after.
 */
export type WalletCompat = {
  /** Wallet holds code of any kind. */
  isContract: boolean;
  /** Code is exactly an EIP-7702 delegation designator. */
  isDelegatedEoa: boolean;
  /** Deposits and withdrawals are likely to revert. */
  mayFailTransfers: boolean;
  isLoading: boolean;
};

export function useWalletCompat(): WalletCompat {
  const { address, isConnected } = useAccount();
  const { data: code, isLoading } = useBytecode({
    address,
    query: { enabled: Boolean(address), staleTime: 300_000 },
  });

  if (!isConnected || !code || code.length <= 2) {
    return {
      isContract: false,
      isDelegatedEoa: false,
      mayFailTransfers: false,
      isLoading,
    };
  }

  // 0xef0100 + 20 bytes = 23 bytes = 48 hex chars after "0x".
  const isDelegatedEoa =
    code.length === 48 && code.toLowerCase().startsWith("0xef0100");

  return {
    isContract: true,
    isDelegatedEoa,
    mayFailTransfers: !isDelegatedEoa,
    isLoading,
  };
}
