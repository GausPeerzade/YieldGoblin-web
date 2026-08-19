"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { decodeEventLog, type Address, type Hex } from "viem";
import { toast } from "sonner";

import { vaultFactoryAbi } from "@/lib/abis/vaultFactory";
import { addressesFor, ZERO_ADDRESS } from "@/lib/addresses";
import { toFriendlyError } from "@/lib/errors";
import { useTargetChainId } from "@/hooks/use-target-chain";

/**
 * Vault creation — permissionless on the audited factory.
 *
 * The caller supplies only the market: the fee comes from
 * `defaultPerfFeeBps()`, and the adapter must already be in the factory's
 * trusted set, so neither is a lever an attacker can pull. `deadline` is the
 * one caller-supplied field the contract does not verify, which is why the UI
 * always sources it from Limitless rather than from user input.
 */

export type DeployArgs = {
  conditionId: Hex;
  yesId: string;
  noId: string;
  deadline: string;
  exchange: Address;
  adapterImplementation: Address;
};

/** The fee every new vault will carry, read from the factory. */
export function useDefaultPerfFeeBps(): number | undefined {
  const chainId = useTargetChainId();
  const { vaultFactory } = addressesFor(chainId);

  const { data } = useReadContract({
    abi: vaultFactoryAbi,
    address: vaultFactory,
    functionName: "defaultPerfFeeBps",
    chainId,
    query: { enabled: vaultFactory !== ZERO_ADDRESS, staleTime: 300_000 },
  });

  return data;
}

export function useCreateVault() {
  const chainId = useTargetChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const { vaultFactory } = addressesFor(chainId);

  const [isDeploying, setIsDeploying] = useState(false);

  const create = useCallback(
    async (args: DeployArgs): Promise<Address | null> => {
      setIsDeploying(true);
      try {
        const hash = await writeContractAsync({
          abi: vaultFactoryAbi,
          address: vaultFactory,
          functionName: "createVault",
          args: [
            args.conditionId,
            BigInt(args.yesId),
            BigInt(args.noId),
            BigInt(args.deadline),
            args.exchange,
            args.adapterImplementation,
          ],
          chainId,
        });

        const receipt = await publicClient?.waitForTransactionReceipt({ hash });

        // `createVault` returns (vault, adapter), but a receipt carries logs,
        // not return data — so the address comes from VaultCreated.
        let vault: Address | null = null;
        for (const log of receipt?.logs ?? []) {
          if (log.address.toLowerCase() !== vaultFactory.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({
              abi: vaultFactoryAbi,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "VaultCreated") {
              vault = (decoded.args as { vault: Address }).vault;
              break;
            }
          } catch {
            // Not the event we're after — keep looking.
          }
        }

        toast.success("Vault created", {
          description: vault ? `Deployed at ${vault.slice(0, 10)}…` : undefined,
        });
        return vault;
      } catch (err) {
        const { title, detail } = toFriendlyError(err);
        toast.error(title, { description: detail });
        return null;
      } finally {
        setIsDeploying(false);
      }
    },
    [chainId, publicClient, vaultFactory, writeContractAsync],
  );

  return { create, isDeploying };
}
