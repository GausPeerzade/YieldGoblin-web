export const vaultFactoryAbi = [
  /**
   * Permissionless — anyone can create a vault for any eligible market.
   *
   * The two parameters a caller could otherwise abuse are constrained by the
   * factory itself: the adapter must be in the trusted set, and the fee is
   * taken from `defaultPerfFeeBps()` rather than passed in. `deadline` is the
   * exception — it is caller-supplied and unverified, so treat it as untrusted
   * display metadata and prefer the venue's own expiry.
   */
  {
    type: "function",
    name: "createVault",
    inputs: [
      { name: "conditionId", type: "bytes32" },
      { name: "yesId", type: "uint256" },
      { name: "noId", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "exchange", type: "address" },
      { name: "adapterImplementation", type: "address" },
    ],
    outputs: [
      { name: "vault", type: "address" },
      { name: "adapter", type: "address" },
    ],
    stateMutability: "nonpayable",
  },

  // ── Discovery ─────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "vaultCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaults",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaultOf",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  /**
   * Means "created by this factory with validated parameters" — *not*
   * "reviewed by anyone". Still the only defence against a byte-identical
   * clone, so never render a vault without it.
   */
  {
    type: "function",
    name: "isVault",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },

  // ── Creation parameters ───────────────────────────────────────────────────
  {
    type: "function",
    name: "isTrustedAdapter",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isTrustedExchange",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultPerfFeeBps",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeRecipient",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaultImplementation",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "conditionId", type: "bytes32", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "adapter", type: "address", indexed: true },
      { name: "yesId", type: "uint256" },
      { name: "noId", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "perfFeeBps", type: "uint16" },
    ],
  },
  {
    type: "event",
    name: "TrustedAdapterSet",
    inputs: [
      { name: "adapterImplementation", type: "address", indexed: true },
      { name: "trusted", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "DefaultPerfFeeSet",
    inputs: [{ name: "perfFeeBps", type: "uint16" }],
  },
  {
    type: "event",
    name: "FeeRecipientSet",
    inputs: [{ name: "recipient", type: "address", indexed: true }],
  },

  // ── Errors ────────────────────────────────────────────────────────────────
  { type: "error", name: "VaultExists", inputs: [] },
  { type: "error", name: "AdapterNotTrusted", inputs: [] },
  { type: "error", name: "ExchangeNotTrusted", inputs: [] },
  { type: "error", name: "ExchangePairMismatch", inputs: [] },
  { type: "error", name: "ConditionNotBinary", inputs: [] },
  { type: "error", name: "ConditionAlreadyResolved", inputs: [] },
] as const;
