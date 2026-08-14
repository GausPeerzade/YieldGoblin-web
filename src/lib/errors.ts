import { BaseError, ContractFunctionRevertedError } from "viem";

/**
 * Maps contract reverts to user-facing copy (guide §8).
 * `YieldRealizationPending` and `SettlementLiquidityPending` are the two users
 * will actually hit, and both are temporary — never phrase them as failures.
 */
const MESSAGES: Record<string, { title: string; detail?: string }> = {
  ZeroAmount: { title: "Enter an amount" },
  InsufficientBalance: { title: "You don't have that much deposited" },
  NothingAvailable: {
    title: "Aave liquidity is temporarily unavailable",
    detail: "Your deposit is safe — try again in a little while.",
  },
  SlippageExceeded: {
    title: "Less was available than you asked for",
    detail: "Retry with partial fills allowed, or try again shortly.",
  },
  MarketResolved: { title: "This market has resolved" },
  MarketNotResolved: { title: "This market hasn't resolved yet" },
  AlreadySettled: {
    title: "This vault has settled",
    detail: "Use Claim to collect your USDC.",
  },
  NotSettled: { title: "Settle this vault first" },
  NothingToClaim: { title: "Nothing to claim" },
  YieldRealizationPending: {
    title: "Yield is being recognised",
    detail: "The pool is catching up on earnings — try again shortly.",
  },
  SettlementLiquidityPending: {
    title: "Recovering funds from Aave",
    detail: "Run Settle once more to pull in the rest, then claim again.",
  },
};

export type FriendlyError = {
  title: string;
  detail?: string;
  /** Present when we decoded a named custom error. */
  name?: string;
};

export function toFriendlyError(error: unknown): FriendlyError {
  if (!error) return { title: "Something went wrong" };

  if (error instanceof BaseError) {
    const reverted = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null;

    const name = reverted?.data?.errorName;
    if (name && MESSAGES[name]) return { ...MESSAGES[name], name };
    if (name) return { title: name, name };

    // User rejections are not errors worth a scary message.
    if (/user rejected|denied transaction|rejected the request/i.test(error.message)) {
      return { title: "Transaction cancelled" };
    }
    return { title: error.shortMessage || "Transaction failed" };
  }

  if (error instanceof Error) {
    if (/user rejected|denied transaction/i.test(error.message)) {
      return { title: "Transaction cancelled" };
    }
    return { title: error.message };
  }

  return { title: "Something went wrong" };
}
