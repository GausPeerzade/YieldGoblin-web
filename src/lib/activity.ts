import type { Address, Hex } from "viem";

/** A point on the cumulative-yield curve, summed from `Harvested` events. */
export type YieldPoint = { t: number; cumulative: bigint };

export type ActivityKind =
  | "deposit"
  | "withdraw"
  | "partial-withdraw"
  | "claim"
  | "harvest"
  | "rebalance"
  | "settle";

/** One decoded vault log, normalised for display. */
export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  vault: Address;
  /** Who triggered it, where the event carries a user. */
  actor?: Address;
  side?: "yes" | "no";
  amount: bigint;
  /** Amount actually served, on a partial withdrawal. */
  secondary?: bigint;
  timestamp: number;
  txHash: Hex;
};
