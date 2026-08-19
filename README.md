# Yield Goblin — frontend

Frontend for the Pair-Yield Vault protocol on **Base** (chainId 8453).

Users hold YES / NO outcome tokens from a Limitless prediction market. The vault
merges matched pairs back into USDC, supplies them to Aave v3, and streams the
interest back to both sides — without changing anyone's bet. A YES depositor
withdraws YES; yield arrives separately, in USDC.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Chain | wagmi v2 · viem · RainbowKit · TanStack Query |
| UI | Tailwind v4 · shadcn/ui (Base UI) · lucide |
| Theme | next-themes, light + dark |

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

It runs against **live Base mainnet** out of the box — the factory address is
built in. Set `NEXT_PUBLIC_BASE_RPC_URL` to a real RPC: the public endpoint
rate-limits hard and caps `eth_getLogs` at a 10,000-block span.

There is no mock or demo data. Every market, balance and event on screen is
read from chain — but through the server-side read API, not per-visitor RPC.

## Read architecture

Public vault state is identical for every visitor, so it is computed once on
the server and shared:

| Route | Source | Cache |
| --- | --- | --- |
| `/api/vaults` | factory enumeration + 2 multicalls + Limitless metadata | 12s TTL, CDN `s-maxage=15` |
| `/api/vault/[address]/history` | incremental chunked `eth_getLogs`, decoded | 60s TTL, CDN `s-maxage=60` |
| `/api/activity` | merged per-vault histories | CDN `s-maxage=30` |
| `/api/limitless` | shared Limitless index | CDN `s-maxage=60` |

A refresh costs three RPC round trips for the whole site, regardless of
visitor count. The browser talks to the chain directly only for wallet-scoped
data — balances, allowances, `maxWithdraw` — which must stay fresh and is
never cached anywhere shared. Writes go wallet → contract as always.

The vault list is discovered from the factory at runtime and titles come from
the Limitless API keyed by `conditionId`, so a permissionlessly-created vault
appears with its real title automatically; `deployments.ts` is only a curated
override. Moderation is `HIDDEN_VAULTS` / `FEATURED_VAULTS` env vars until the
list justifies a database.

## Live deployment

One vault is live on Base mainnet, registered in `src/lib/deployments.ts`:

| | |
| --- | --- |
| Market | BTC Up or Down — Weekly |
| Vault | [`0x5AA2…fBf2`](https://basescan.org/address/0x5AA2b5baEE8A3a23Ed05bF4A876E78Db2CBefBf2) |
| Factory | [`0x4200…6a89`](https://basescan.org/address/0x4200745262A978E09a82692931EcD96dA6d66a89) |
| Resolves | Aug 17, 2026 |

Question text, ticker and the Limitless slug are not on-chain, so they are
registered by `conditionId` in `deployments.ts`. So are `MIN_MERGE` / `DUST` /
`ROUNDING_BUFFER`, which are compiled per deployment — **never hard-code them**.
This vault ships with a 1 USDC merge threshold rather than the production 100.

### The distribution floor

A vault only credits yield to depositors once the accrued surplus passes `DUST`
(0.01 USDC). Below it, `pendingYield` and `unrealisedYield` read zero even though
interest is genuinely accruing inside Aave. The live vault holds 2 USDC, so it
will sit under the floor for ~55 days — its entire life.

Rendering that as "0.00% APY" makes a healthy vault look broken. Instead the UI
leads with the theoretical rate (`netApr / 2` ≈ 1.66%) and shows progress toward
the floor. See `distributionFloor()` in `src/lib/protocol.ts` and
`DistributionFloorNotice`. Any new or small vault hits this on day one.

## Layout

```
src/
  app/                    routes: markets (/), /vault/[address], /my-vaults,
                          /rewards, /activity
  components/
    brand/                logo + token/protocol icons
    protocol/             rate cards, balance bar, flow diagram, amount input,
                          market card, status banner
    vault/                overview / deposit / withdraw tabs, keeper panel,
                          yield chart, activity list
    markets/              market list + row
    ui/                   shadcn primitives
  hooks/
    use-vaults.ts         reads — vault list, single vault, user position, Aave APR
    use-vault-actions.ts  writes — approve, deposit, withdraw, claim, keeper calls
  lib/
    abis/                 PairYieldVault, VaultFactory, ConditionalTokens, Aave Pool
    protocol.ts           the read model + all derived maths (APR, status, keeper)
    addresses.ts          per-chain addresses, explorer links
    format.ts             6-decimal display helpers
    errors.ts             contract reverts → user-facing copy
    mock.ts               design-time data
```

`lib/protocol.ts` is the load-bearing file: pure functions, no React, so mock
data and chain data flow through identical derivations.

## Things the protocol makes true, which the UI reflects

- **Units are 6-decimal** for USDC *and* outcome tokens; payout rates are WAD
  (1e18). Everything is `bigint` end to end — never `Number` for maths.
- **APR, not APY.** Yield is withdrawn as it's recognised, so interest is simple.
  Quoting a compounded figure would overstate what depositors receive.
- **Only matched pairs earn.** The scarce side earns a flat `netApr / 2`; the
  abundant side earns that scaled by `scarce / abundant`. Two rate cards, always,
  with the scarce side visually dominant.
- **Depositing into the abundant side dilutes it** — the live preview shows this
  rather than hiding it. That honesty is what steers deposits to the scarce side.
- **Partial withdrawals are normal**, not errors. `minServed` is exposed as an
  "all or nothing" toggle.
- **Nothing locks, ever.** `deadline` is informational; there is no countdown
  implying funds become trapped.
- **Vault addresses are verified against the factory registry** before anything
  is rendered — the implementation is public bytecode, so clones are possible.

## Creating a vault

`/create` takes a Limitless market link and does the rest. The slug resolves
via `GET /markets/{slug}`, position ids are derived from the CTF, and the
venue addresses are constants — the visitor never types an address.

`POST /api/resolve-market` runs seven checks before offering the button:
market exists · settles in USDC (which also rules out NegRisk) · binary ·
unresolved · no existing vault · has a close date · **the factory accepts it
in a simulation**. The last one is the real gate; the others exist to give a
specific reason when it fails.

### Permissionless creation

`createVault(bytes32,uint256,uint256,uint64,address,address)` — selector
`0x46ec668e` — is open to anyone. Verified by simulation: two unrelated
addresses and the deployer all succeed on the same market.

The parameters a caller could otherwise abuse are constrained by the factory:
the adapter must satisfy `isTrustedAdapter`, the exchange `isTrustedExchange`,
and the fee comes from `defaultPerfFeeBps()` rather than being passed in.

**`deadline` is the exception.** It is caller-supplied and no contract logic
reads it, so the UI never trusts it — `deadline` is sourced from the venue's
`expirationTimestamp`, and a `deadlineDisputed` flag marks vaults where the
creator's on-chain value disagrees. The first live vault already disagrees by
twelve hours, so this is not hypothetical.

Likewise `isVault()` now means "created by this factory with validated
parameters", **not** "reviewed by anyone" — the copy reflects that.

## Registry overrides

1. Append a `Deployment` entry to `src/lib/deployments.ts` — vault address,
   deploy block, `conditionId`, title, ticker, Limitless slug, and the vault's
   compiled constants.
2. Nothing else. The factory registry is enumerated at runtime, so the vault
   appears in the list, on `/my-vaults`, and in the activity feed automatically.

A vault with no registry entry still renders; it just falls back to generic
market copy and the production constants.

## Known limits

- **Market odds** come from Limitless via `/api/limitless` (a server route,
  because upstream 403s without a User-Agent and sends no CORS headers). A
  market drops off `markets/active` once it closes, and the card hides itself.
- **Activity history** is read from logs at request time, chunked to 9,000
  blocks. A real indexer would be faster and would survive a much older deploy
  block; `MAX_CHUNKS` caps the scan at the 60 most recent chunks.
- **Contract wallets** are warned about but not blocked — outcome tokens are
  ERC-1155, so a wallet without the receiver hooks will revert on deposit.

Full protocol semantics live in the Pair-Yield Vault frontend integration guide
and the live-deployment note.

## Scripts

```bash
pnpm dev     # dev server
pnpm build   # production build + typecheck
pnpm lint    # eslint
```
