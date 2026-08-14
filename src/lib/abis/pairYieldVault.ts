export const pairYieldVaultAbi = [
  // ── Writes ────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "isYes", type: "bool" },
      { name: "amount", type: "uint128" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "isYes", type: "bool" },
      { name: "amount", type: "uint128" },
      { name: "minServed", type: "uint128" },
    ],
    outputs: [{ name: "served", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimYield",
    inputs: [],
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimSettlement",
    inputs: [],
    outputs: [
      { name: "principalUsdc", type: "uint256" },
      { name: "yieldUsdc", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rebalance",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "harvest",
    inputs: [],
    outputs: [{ name: "caughtUp", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settle",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },

  // ── User reads ────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "pendingYield",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxWithdraw",
    inputs: [
      { name: "user", type: "address" },
      { name: "isYes", type: "bool" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "yesBalance",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noBalance",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },

  // ── Pool reads ────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "totalYes",
    inputs: [],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalNo",
    inputs: [],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mergedPairs",
    inputs: [],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "idleUsdc",
    inputs: [],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "idleTokens",
    inputs: [],
    outputs: [
      { name: "idleYes", type: "uint256" },
      { name: "idleNo", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unrealisedYield",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "yieldReserve",
    inputs: [],
    outputs: [{ type: "uint128" }],
    stateMutability: "view",
  },

  // ── Settlement ────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "settled",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "yesPayoutWad",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noPayoutWad",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },

  // ── Identity (immutable) ──────────────────────────────────────────────────
  {
    type: "function",
    name: "conditionId",
    inputs: [],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "yesId",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noId",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deadline",
    inputs: [],
    outputs: [{ type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "perfFeeBps",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "adapter",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ctf",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "isYes", type: "bool" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "isYes", type: "bool" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PartialWithdrawal",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "isYes", type: "bool" },
      { name: "requested", type: "uint256" },
      { name: "served", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "YieldClaimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Harvested",
    inputs: [
      { name: "gross", type: "uint256" },
      { name: "fee", type: "uint256" },
      { name: "toYesSide", type: "uint256" },
      { name: "toNoSide", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Merged",
    inputs: [{ name: "pairs", type: "uint256" }],
  },
  {
    type: "event",
    name: "Reconstituted",
    inputs: [{ name: "pairs", type: "uint256" }],
  },
  {
    type: "event",
    name: "SuppliedToVenue",
    inputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "event",
    name: "VenueSupplyDeferred",
    inputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "event",
    name: "FeeWaived",
    inputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "event",
    name: "VenueExited",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "remaining", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "yesPayoutWad", type: "uint256" },
      { name: "noPayoutWad", type: "uint256" },
      { name: "redeemed", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "SettlementClaimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "principalUsdc", type: "uint256" },
      { name: "yieldUsdc", type: "uint256" },
    ],
  },

  // ── Errors ────────────────────────────────────────────────────────────────
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "InsufficientBalance", inputs: [] },
  { type: "error", name: "NothingAvailable", inputs: [] },
  { type: "error", name: "SlippageExceeded", inputs: [] },
  { type: "error", name: "MarketResolved", inputs: [] },
  { type: "error", name: "MarketNotResolved", inputs: [] },
  { type: "error", name: "AlreadySettled", inputs: [] },
  { type: "error", name: "NotSettled", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "YieldRealizationPending", inputs: [] },
  { type: "error", name: "SettlementLiquidityPending", inputs: [] },
] as const;
