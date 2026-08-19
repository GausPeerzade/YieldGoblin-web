import type { Address, Hex } from "viem";

import type { ActivityEvent, YieldPoint } from "./activity";
import type { MarketMeta, UserPosition, VaultView } from "./protocol";

/**
 * JSON wire format for the read API.
 *
 * JSON has no bigint, and every on-chain amount in this app is a bigint by
 * rule — so the boundary converts explicitly, field by field. Explicit beats
 * a clever reviver: a missed field fails the type check instead of silently
 * arriving as a string and flowing through the maths.
 */

export type VaultWire = {
  address: Address;
  chainId: number;
  conditionId: Hex;
  yesId: string;
  noId: string;
  adapter: Address;
  deadline: string;
  deadlineDisputed?: boolean;
  perfFeeBps: number;
  market: MarketMeta;
  hasMetadata: boolean;
  totalYes: string;
  totalNo: string;
  mergedPairs: string;
  idleUsdc: string;
  idleYes: string;
  idleNo: string;
  unrealisedYield: string;
  yieldReserve: string;
  settled: boolean;
  resolved: boolean;
  yesPayoutWad: string;
  noPayoutWad: string;
  venueHealthy: boolean;
  aaveApr: number;
  constants: { minMerge: string; dust: string; roundingBuffer: string };
  adapterAssets?: string;
  testDeployment?: boolean;
  featured?: boolean;
};

export function vaultToWire(v: VaultView): VaultWire {
  return {
    address: v.address,
    chainId: v.chainId,
    conditionId: v.conditionId,
    yesId: v.yesId.toString(),
    noId: v.noId.toString(),
    adapter: v.adapter,
    deadline: v.deadline.toString(),
    deadlineDisputed: v.deadlineDisputed,
    perfFeeBps: v.perfFeeBps,
    market: v.market,
    hasMetadata: v.hasMetadata,
    totalYes: v.totalYes.toString(),
    totalNo: v.totalNo.toString(),
    mergedPairs: v.mergedPairs.toString(),
    idleUsdc: v.idleUsdc.toString(),
    idleYes: v.idleYes.toString(),
    idleNo: v.idleNo.toString(),
    unrealisedYield: v.unrealisedYield.toString(),
    yieldReserve: v.yieldReserve.toString(),
    settled: v.settled,
    resolved: v.resolved,
    yesPayoutWad: v.yesPayoutWad.toString(),
    noPayoutWad: v.noPayoutWad.toString(),
    venueHealthy: v.venueHealthy,
    aaveApr: v.aaveApr,
    constants: {
      minMerge: v.constants.minMerge.toString(),
      dust: v.constants.dust.toString(),
      roundingBuffer: v.constants.roundingBuffer.toString(),
    },
    adapterAssets: v.adapterAssets?.toString(),
    testDeployment: v.testDeployment,
    featured: v.featured,
  };
}

export function vaultFromWire(w: VaultWire): VaultView {
  return {
    address: w.address,
    chainId: w.chainId,
    conditionId: w.conditionId,
    yesId: BigInt(w.yesId),
    noId: BigInt(w.noId),
    adapter: w.adapter,
    deadline: BigInt(w.deadline),
    deadlineDisputed: w.deadlineDisputed,
    perfFeeBps: w.perfFeeBps,
    market: w.market,
    hasMetadata: w.hasMetadata,
    totalYes: BigInt(w.totalYes),
    totalNo: BigInt(w.totalNo),
    mergedPairs: BigInt(w.mergedPairs),
    idleUsdc: BigInt(w.idleUsdc),
    idleYes: BigInt(w.idleYes),
    idleNo: BigInt(w.idleNo),
    unrealisedYield: BigInt(w.unrealisedYield),
    yieldReserve: BigInt(w.yieldReserve),
    settled: w.settled,
    resolved: w.resolved,
    yesPayoutWad: BigInt(w.yesPayoutWad),
    noPayoutWad: BigInt(w.noPayoutWad),
    venueHealthy: w.venueHealthy,
    aaveApr: w.aaveApr,
    constants: {
      minMerge: BigInt(w.constants.minMerge),
      dust: BigInt(w.constants.dust),
      roundingBuffer: BigInt(w.constants.roundingBuffer),
    },
    adapterAssets:
      w.adapterAssets === undefined ? undefined : BigInt(w.adapterAssets),
    testDeployment: w.testDeployment,
    featured: w.featured,
  };
}

// ── History ─────────────────────────────────────────────────────────────────

export type ActivityWire = Omit<ActivityEvent, "amount" | "secondary"> & {
  amount: string;
  secondary?: string;
};

export type YieldPointWire = { t: number; cumulative: string };

export type HistoryWire = {
  activity: ActivityWire[];
  yieldSeries: YieldPointWire[];
};

export function activityToWire(e: ActivityEvent): ActivityWire {
  return { ...e, amount: e.amount.toString(), secondary: e.secondary?.toString() };
}

export function activityFromWire(w: ActivityWire): ActivityEvent {
  return {
    ...w,
    amount: BigInt(w.amount),
    secondary: w.secondary === undefined ? undefined : BigInt(w.secondary),
  };
}

export function yieldPointFromWire(w: YieldPointWire): YieldPoint {
  return { t: w.t, cumulative: BigInt(w.cumulative) };
}

/** Not used by the API today; kept so the shapes stay in one place. */
export type { UserPosition };
