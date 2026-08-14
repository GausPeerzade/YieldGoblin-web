import type { Address, Hex } from "viem";
import type { VaultConstants } from "./deployments";

/**
 * The protocol's read model and derived maths, per the frontend integration
 * guide. Pure functions only — no React, no wagmi, so everything derived from
 * vault state lives here rather than inside a component.
 */

export type Side = "yes" | "no";

/** Vault lifecycle, derived from three reads (guide §6). */
export type VaultStatus =
  | "open"
  | "degraded"
  | "resolved-unsettled"
  | "settled"
  | "settled-exit-pending";

export type MarketMeta = {
  /** Human question, e.g. "$BTC above $112,053.66 on Oct 1, 08:00 UTC?" */
  question: string;
  /** Ticker used to pick a logo: BTC, SOL, ETH, USDC… */
  symbol: string;
  /** Prediction-market venue. Currently always Limitless. */
  venue: "limitless";
  venueUrl?: string;
};

/** Everything the UI needs to render a vault. Assembled once, passed as props. */
export type VaultView = {
  address: Address;
  chainId: number;

  // Identity — immutable, cacheable forever.
  conditionId: Hex;
  yesId: bigint;
  noId: bigint;
  adapter: Address;
  /** Market close. Informational only — nothing locks (guide §4, §10). */
  deadline: bigint;
  perfFeeBps: number;
  market: MarketMeta;
  /**
   * True when this vault has an entry in `deployments.ts`. Question text and
   * ticker are off-chain, so a vault without one renders generic copy and is
   * ordered after the known ones.
   */
  hasMetadata: boolean;

  // Pool state.
  totalYes: bigint;
  totalNo: bigint;
  mergedPairs: bigint;
  idleUsdc: bigint;
  idleYes: bigint;
  idleNo: bigint;
  unrealisedYield: bigint;
  yieldReserve: bigint;

  // Settlement.
  settled: boolean;
  /** CTF reported an outcome — may be true while `settled` is still false. */
  resolved: boolean;
  yesPayoutWad: bigint;
  noPayoutWad: bigint;

  // Venue health: `harvest()` static-calls false when Aave can't pay out.
  venueHealthy: boolean;

  // Aave USDC supply APR, as a fraction (0.043 = 4.3%).
  aaveApr: number;

  /**
   * Thresholds compiled into this vault. They differ between deployments, so
   * they travel with the vault rather than being assumed anywhere in the UI.
   */
  constants: VaultConstants;

  /** Live principal held by the adapter in Aave. Undefined if not read. */
  adapterAssets?: bigint;

  /** True when this vault was deployed with non-production constants. */
  testDeployment?: boolean;
};

/** Per-user state for a vault. Separate so it can refresh independently. */
export type UserPosition = {
  yesBalance: bigint;
  noBalance: bigint;
  /** Claimable USDC, including yield earned but not yet recognised on-chain. */
  pendingYield: bigint;
  maxWithdrawYes: bigint;
  maxWithdrawNo: bigint;
  /** From the CTF, not the vault. */
  walletYes: bigint;
  walletNo: bigint;
  approved: boolean;
  /** Cumulative, from indexed `YieldClaimed` events. */
  lifetimeClaimed: bigint;
};

export const EMPTY_POSITION: UserPosition = {
  yesBalance: 0n,
  noBalance: 0n,
  pendingYield: 0n,
  maxWithdrawYes: 0n,
  maxWithdrawNo: 0n,
  walletYes: 0n,
  walletNo: 0n,
  approved: false,
  lifetimeClaimed: 0n,
};

// ── Derived pool figures (guide §4) ─────────────────────────────────────────

function min(a: bigint, b: bigint) {
  return a < b ? a : b;
}

export type PoolDerived = {
  /** Pairs that *could* be earning. */
  matched: bigint;
  /** Pairs actually earning right now. */
  earning: bigint;
  /** The overhang on the abundant side, earning nothing extra. */
  unmatched: bigint;
  /** Share of all deposited tokens that are matched, 0–1. */
  utilisation: number;
  /** Matched pairs waiting on a `rebalance()` call. */
  idlePairs: bigint;
  /** Which side is scarce — the side worth depositing into. */
  scarceSide: Side | null;
  /**
   * Dollars locked. One YES *plus* one NO merges into one USDC, so a matched
   * pair is worth $1, not $2 — summing both sides would double-count. The
   * unmatched overhang is excluded: an unpaired outcome token is worth its
   * market price, which is not on-chain, so this is a floor, never an overstate.
   */
  tvl: bigint;
  /** Raw outcome tokens on deposit across both sides. Not a dollar figure. */
  deposited: bigint;
};

export function derivePool(v: Pick<VaultView, "totalYes" | "totalNo" | "mergedPairs">): PoolDerived {
  const { totalYes, totalNo, mergedPairs } = v;
  const matched = min(totalYes, totalNo);
  const total = totalYes + totalNo;
  const unmatched = totalYes > totalNo ? totalYes - totalNo : totalNo - totalYes;

  return {
    matched,
    earning: mergedPairs,
    unmatched,
    utilisation: total === 0n ? 0 : Number(2n * matched) / Number(total),
    idlePairs: matched > mergedPairs ? matched - mergedPairs : 0n,
    scarceSide:
      total === 0n || totalYes === totalNo
        ? null
        : totalYes < totalNo
          ? "yes"
          : "no",
    tvl: matched,
    deposited: total,
  };
}

/**
 * What a YES/NO holding is worth in dollars.
 *
 * Matched pairs are exactly $1 each — they redeem to a dollar whichever way the
 * market resolves. The overhang is a directional bet whose value is the market
 * price of that side, which the vault neither knows nor depends on, so it is
 * reported separately rather than folded into a single misleading number.
 */
export function positionValue(yesBalance: bigint, noBalance: bigint) {
  const paired = min(yesBalance, noBalance);
  const unmatched =
    yesBalance > noBalance ? yesBalance - noBalance : noBalance - yesBalance;
  return {
    /** Guaranteed USDC at settlement, outcome-independent. */
    paired,
    unmatched,
    unmatchedSide: (unmatched === 0n
      ? null
      : yesBalance > noBalance
        ? "yes"
        : "no") as Side | null,
  };
}

// ── APR (guide §5) ──────────────────────────────────────────────────────────

/** Aave APR net of the vault's performance fee. */
export function netApr(aaveApr: number, perfFeeBps: number): number {
  return aaveApr * (1 - perfFeeBps / 10_000);
}

export type SideRates = {
  yesApr: number | null;
  noApr: number | null;
  /** How many times more the scarce side earns per token. */
  scarceMultiple: number | null;
};

/**
 * Only `mergedPairs` earns; each side takes half of that and shares it across
 * its whole balance. `null` means "no rate yet" — render as "—", never 0%.
 */
export function sideRates(v: VaultView): SideRates {
  const net = netApr(v.aaveApr, v.perfFeeBps);
  const annualYield = Number(v.mergedPairs) * net;

  const yesApr = v.totalYes === 0n ? null : annualYield / 2 / Number(v.totalYes);
  const noApr = v.totalNo === 0n ? null : annualYield / 2 / Number(v.totalNo);

  let scarceMultiple: number | null = null;
  if (yesApr !== null && noApr !== null && yesApr > 0 && noApr > 0) {
    scarceMultiple = yesApr > noApr ? yesApr / noApr : noApr / yesApr;
  }

  return { yesApr, noApr, scarceMultiple };
}

/** What *this user's* rate becomes after depositing `amount` (guide §5). */
export function previewApr(
  amount: bigint,
  side: Side,
  v: Pick<VaultView, "totalYes" | "totalNo" | "aaveApr" | "perfFeeBps">,
): number | null {
  const isYes = side === "yes";
  const newYes = isYes ? v.totalYes + amount : v.totalYes;
  const newNo = isYes ? v.totalNo : v.totalNo + amount;
  const newPairs = min(newYes, newNo);
  const annual = Number(newPairs) * netApr(v.aaveApr, v.perfFeeBps);
  const sideTotal = isYes ? newYes : newNo;
  return sideTotal === 0n ? null : annual / 2 / Number(sideTotal);
}

/** Projected USDC yield for a position, over a window. Display-only. */
export function projectYield(
  balance: bigint,
  apr: number | null,
  window: "month" | "year" | "hour",
): bigint {
  if (apr === null || !Number.isFinite(apr)) return 0n;
  const fraction =
    window === "year" ? 1 : window === "month" ? 1 / 12 : 1 / 8760;
  return BigInt(Math.max(0, Math.round(Number(balance) * apr * fraction)));
}

// ── Status (guide §6) ───────────────────────────────────────────────────────

export function deriveStatus(v: VaultView, settlementShortfall = false): VaultStatus {
  if (v.settled) {
    return settlementShortfall ? "settled-exit-pending" : "settled";
  }
  if (v.resolved) return "resolved-unsettled";
  if (!v.venueHealthy) return "degraded";
  return "open";
}

export const STATUS_COPY: Record<
  VaultStatus,
  { label: string; tone: "ok" | "warn" | "info" | "neutral"; detail: string }
> = {
  open: {
    label: "Open",
    tone: "ok",
    detail: "Deposits, withdrawals and yield claims are all available.",
  },
  degraded: {
    label: "Aave liquidity tight",
    tone: "warn",
    detail:
      "Aave can't return funds right now, so deposits are paused and withdrawals may fill partially. Your principal is not at risk and claiming yield still works.",
  },
  "resolved-unsettled": {
    label: "Resolved — awaiting settle",
    tone: "info",
    detail:
      "The market has an outcome but the vault has not been settled yet. You can still withdraw your shares, and anyone can settle it.",
  },
  settled: {
    label: "Settled",
    tone: "neutral",
    detail:
      "This vault has closed out. Claim your USDC at the rate the market reported.",
  },
  "settled-exit-pending": {
    label: "Settled — recovering funds",
    tone: "warn",
    detail:
      "Settlement is still pulling funds out of Aave. Claiming yield works now; call settle() again to recover the rest.",
  },
};

/** Whether deposits are allowed in this state (guide §6). */
export function canDeposit(status: VaultStatus) {
  return status === "open";
}

export function canWithdraw(status: VaultStatus) {
  return status === "open" || status === "degraded" || status === "resolved-unsettled";
}

export function canClaimSettlement(status: VaultStatus) {
  return status === "settled" || status === "settled-exit-pending";
}

// ── The distribution floor ──────────────────────────────────────────────────

/**
 * Yield is only distributed to depositors once the accrued surplus crosses the
 * vault's `DUST` threshold. Below it, `pendingYield` and `unrealisedYield` both
 * read zero even though interest is genuinely accruing inside Aave.
 *
 * A small or brand-new vault will spend its first hours here, and rendering
 * that as "0.00% APY" makes a healthy vault look broken. Show the theoretical
 * rate and the progress toward the floor instead (guide §5.2).
 */
export type DistributionFloor = {
  /** True while nothing has crossed the floor yet. */
  belowFloor: boolean;
  /** Progress toward the first distribution, 0–1. */
  progress: number;
  /** The threshold itself, for display. */
  dust: bigint;
  /** Surplus accrued but not yet distributed. */
  surplus: bigint;
};

export function distributionFloor(v: VaultView): DistributionFloor {
  const dust = v.constants.dust;
  // The adapter's live assets are the truest read of what has accrued; fall
  // back to the vault's own figure when the adapter hasn't been read.
  const fromAdapter =
    v.adapterAssets !== undefined && v.adapterAssets > v.mergedPairs
      ? v.adapterAssets - v.mergedPairs
      : 0n;
  const surplus =
    v.unrealisedYield > fromAdapter ? v.unrealisedYield : fromAdapter;

  return {
    belowFloor: surplus < dust && v.mergedPairs > 0n && !v.settled,
    progress: dust === 0n ? 1 : Math.min(1, Number(surplus) / Number(dust)),
    dust,
    surplus,
  };
}

/**
 * Interest a position accrues per second, for projecting when the floor will
 * be crossed. Returns null when there is no rate to project from.
 */
export function secondsToFloor(v: VaultView): number | null {
  const { surplus, dust } = distributionFloor(v);
  const perSecond =
    (Number(v.mergedPairs) * netApr(v.aaveApr, v.perfFeeBps)) / 31_536_000;
  if (perSecond <= 0) return null;
  return Number(dust - surplus) / perSecond;
}

// ── Withdrawal tolerance (guide §5.3) ───────────────────────────────────────

/**
 * Aave's aToken rounds against the supplier, so `maxWithdraw` can sit a unit or
 * two below the ledger claim right after a deposit. Never assert equality —
 * only treat a fill as short when it misses by more than the rounding buffer.
 */
export function isShortFill(
  requested: bigint,
  fillable: bigint,
  constants: VaultConstants,
): boolean {
  return requested > fillable + constants.roundingBuffer;
}

/**
 * `minServed` for an all-or-nothing withdrawal. Asking for the exact amount
 * reverts `SlippageExceeded` on dust rounding, so we allow the same buffer the
 * contract itself uses.
 */
export function strictMinServed(
  amount: bigint,
  constants: VaultConstants,
): bigint {
  return amount > constants.roundingBuffer
    ? amount - constants.roundingBuffer
    : 0n;
}

// ── Keeper thresholds (guide §7.5) ──────────────────────────────────────────

export type KeeperAction = {
  kind: "rebalance" | "harvest" | "settle";
  label: string;
  reason: string;
  amount?: bigint;
};

export function keeperActions(v: VaultView): KeeperAction[] {
  const out: KeeperAction[] = [];
  const { idlePairs } = derivePool(v);

  // The merge threshold is a per-deployment constant, not a fixed 100 USDC.
  if (!v.resolved && !v.settled && idlePairs >= v.constants.minMerge) {
    out.push({
      kind: "rebalance",
      label: "Rebalance",
      reason: "Some deposits are sitting idle instead of earning.",
      amount: idlePairs,
    });
  }
  if (v.unrealisedYield >= v.constants.dust) {
    out.push({
      kind: "harvest",
      label: "Harvest",
      reason: "Earned yield hasn't been distributed to depositors yet.",
      amount: v.unrealisedYield,
    });
  }
  if (v.resolved && !v.settled) {
    out.push({
      kind: "settle",
      label: "Settle vault",
      reason: "The market has resolved — redeem the pool's tokens for USDC.",
    });
  }
  return out;
}

/** Principal owed at settlement, in USDC (guide §7.4). */
export function settlementPrincipal(
  yesBalance: bigint,
  noBalance: bigint,
  yesPayoutWad: bigint,
  noPayoutWad: bigint,
): bigint {
  return (yesBalance * yesPayoutWad + noBalance * noPayoutWad) / 10n ** 18n;
}
