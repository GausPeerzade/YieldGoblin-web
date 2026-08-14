"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { Address } from "viem";
import { toast } from "sonner";

import { pairYieldVaultAbi } from "@/lib/abis/pairYieldVault";
import { conditionalTokensAbi } from "@/lib/abis/conditionalTokens";
import { addressesFor } from "@/lib/addresses";
import { useTargetChainId } from "@/hooks/use-target-chain";
import { toFriendlyError } from "@/lib/errors";
import type { Side } from "@/lib/protocol";

type TxState = "idle" | "approving" | "pending" | "confirming" | "success" | "error";

/**
 * Write flows (guide §7). Every action funnels through here so revert decoding
 * and toasts stay consistent.
 */
export function useVaultActions(vault: Address | undefined) {
  // Writes are sent to the target chain explicitly — wagmi prompts the wallet
  // to switch rather than silently submitting on whatever network it is on.
  const chainId = useTargetChainId();
  const { address: user } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const { ctf } = addressesFor(chainId);

  const [state, setState] = useState<TxState>("idle");
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const receipt = useWaitForTransactionReceipt({ hash });

  const run = useCallback(
    async (label: string, fn: () => Promise<`0x${string}`>) => {
      setState("pending");
      try {
        const tx = await fn();
        setHash(tx);
        setState("confirming");
        await publicClient?.waitForTransactionReceipt({ hash: tx });
        setState("success");
        toast.success(`${label} confirmed`);
        return tx;
      } catch (err) {
        setState("error");
        const { title, detail } = toFriendlyError(err);
        toast.error(title, { description: detail });
        return undefined;
      }
    },
    [publicClient],
  );

  /**
   * ERC-1155 approval is all-or-nothing across every token id — there is no
   * per-amount variant. Worth saying out loud to anyone expecting ERC-20.
   */
  const approve = useCallback(async () => {
    if (!vault) return;
    return run("Approval", () =>
      writeContractAsync({
        abi: conditionalTokensAbi,
        address: ctf,
        functionName: "setApprovalForAll",
        args: [vault, true],
        chainId,
      }),
    );
  }, [vault, ctf, run, writeContractAsync, chainId]);

  const deposit = useCallback(
    async (side: Side, amount: bigint) => {
      if (!vault) return;
      return run("Deposit", () =>
        writeContractAsync({
          abi: pairYieldVaultAbi,
          address: vault,
          functionName: "deposit",
          args: [side === "yes", amount],
          chainId,
        }),
      );
    },
    [vault, run, writeContractAsync, chainId],
  );

  /**
   * `minServed` is the slippage guard: anyone can call rebalance() in the same
   * block and turn a full fill into a partial one. strict = all-or-nothing.
   */
  const withdraw = useCallback(
    async (side: Side, amount: bigint, minServed: bigint) => {
      if (!vault) return;
      return run("Withdrawal", () =>
        writeContractAsync({
          abi: pairYieldVaultAbi,
          address: vault,
          functionName: "withdraw",
          args: [side === "yes", amount, minServed],
          chainId,
        }),
      );
    },
    [vault, run, writeContractAsync, chainId],
  );

  /** Never blocked by Aave — yield is pulled out the moment it's recognised. */
  const claimYield = useCallback(async () => {
    if (!vault) return;
    return run("Yield claim", () =>
      writeContractAsync({
        abi: pairYieldVaultAbi,
        address: vault,
        functionName: "claimYield",
        chainId,
      }),
    );
  }, [vault, run, writeContractAsync, chainId]);

  const claimSettlement = useCallback(async () => {
    if (!vault) return;
    return run("Settlement claim", () =>
      writeContractAsync({
        abi: pairYieldVaultAbi,
        address: vault,
        functionName: "claimSettlement",
        chainId,
      }),
    );
  }, [vault, run, writeContractAsync, chainId]);

  /** Permissionless upkeep — no authority granted, no risk taken. */
  const keeper = useCallback(
    async (kind: "rebalance" | "harvest" | "settle") => {
      if (!vault) return;
      const labels = {
        rebalance: "Rebalance",
        harvest: "Harvest",
        settle: "Settle",
      } as const;
      return run(labels[kind], () =>
        writeContractAsync({
          abi: pairYieldVaultAbi,
          address: vault,
          functionName: kind,
          chainId,
        }),
      );
    },
    [vault, run, writeContractAsync, chainId],
  );

  return {
    state,
    hash,
    receipt,
    isBusy: state === "pending" || state === "confirming",
    user,
    approve,
    deposit,
    withdraw,
    claimYield,
    claimSettlement,
    keeper,
    reset: () => {
      setState("idle");
      setHash(undefined);
    },
  };
}
