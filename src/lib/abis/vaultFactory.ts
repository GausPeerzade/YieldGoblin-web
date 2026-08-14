export const vaultFactoryAbi = [
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
  {
    type: "function",
    name: "isVault",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
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
    name: "FeeRecipientSet",
    inputs: [{ name: "recipient", type: "address", indexed: true }],
  },
] as const;
