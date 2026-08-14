<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Yield Goblin

Frontend for the Pair-Yield Vault protocol on Base. See [README.md](README.md)
for the stack, layout, and how mock mode works.

## Non-negotiables

- **All on-chain amounts are `bigint`.** USDC and outcome tokens are 6-decimal;
  payout rates are WAD (1e18); reward indexes are 1e27 and must never reach the
  UI. Never route an amount through `Number` except at the final display step.
- **Derived maths lives in `src/lib/protocol.ts`** — pure functions, no React.
  Anything computed from vault state belongs there, not inside a component.
- **No mock or placeholder market data.** Everything on screen is read from
  chain. Off-chain metadata (question text, ticker, per-deployment constants)
  is registered by `conditionId` in `src/lib/deployments.ts`; a vault with no
  entry renders a generic label and sorts last, it is never invented.
- **Never add YES and NO together as a dollar figure.** One YES *plus* one NO
  merges into one USDC, so a matched pair is worth $1, not $2. TVL is
  `min(totalYes, totalNo)`; the unmatched overhang is a directional bet whose
  value is its off-chain market price and is reported separately.
- **Quote APR, not APY.** Yield is withdrawn as it's recognised, so it is simple
  interest. A null rate means "no rate yet" and renders as "—", never 0% or ∞.
- **Never imply a lock-up.** `deadline` is informational; withdrawals are always
  open, even for a market that never resolves.
- **Verify a vault against the factory registry before rendering it.** The
  implementation is public bytecode; `isVault()` is the only authoritative check.
- **Temporary contract states are "not yet", not failures.** Partial withdrawals,
  `YieldRealizationPending` and `SettlementLiquidityPending` all get copy that
  leads with what is still safe. Revert copy belongs in `src/lib/errors.ts`.

## UI conventions

- shadcn here is the **Base UI** variant: composition uses a `render` prop, not
  `asChild`. For a link styled as a button use `ButtonLink`, which sets
  `nativeButton={false}` — passing `render={<Link/>}` to `Button` warns.
- Colour semantics are tokens, not literals: `yes` / `no` / `usdc` (plus
  `-muted` and `-foreground` variants) and `page` for the opaque page ground.
- Apply `nums` to any figure that updates in place so tabular figures keep the
  layout from jittering.
