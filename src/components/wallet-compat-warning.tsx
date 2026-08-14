"use client";

import { AlertTriangle } from "lucide-react";

import { useWalletCompat } from "@/hooks/use-wallet-compat";

/**
 * Contract wallets that don't implement the ERC-1155 receiver hooks cannot hold
 * outcome tokens, so both deposit and withdraw revert. Warn before the user
 * commits gas rather than after (guide §7).
 */
export function WalletCompatWarning() {
  const { mayFailTransfers } = useWalletCompat();
  if (!mayFailTransfers) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="text-sm">
        <p className="font-medium">This wallet is a smart contract</p>
        <p className="mt-1 text-muted-foreground">
          Outcome tokens are ERC-1155. Unless your wallet implements the
          ERC-1155 receiver hooks, deposits and withdrawals will revert. Connect
          a regular EOA to use this vault.
        </p>
      </div>
    </div>
  );
}
