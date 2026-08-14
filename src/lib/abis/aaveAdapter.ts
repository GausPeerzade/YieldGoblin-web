/**
 * AaveV3Adapter — the vault's venue adapter. Its aUSDC balance is the live
 * principal, so `totalAssets()` is the truest read of what has accrued.
 */
export const aaveAdapterAbi = [
  {
    type: "function",
    name: "totalAssets",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxWithdrawable",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;
