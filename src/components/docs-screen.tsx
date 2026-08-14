"use client";

import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Clock,
  Coins,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { AaveIcon, LimitlessIcon } from "@/components/brand/token-icon";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";

/**
 * First-visit explainer. Written for someone who has never used the product and
 * wants to know what happens to their shares before they connect anything.
 *
 * Deliberately shallow: it answers what a depositor experiences, the fee, and
 * the risks. It does not document protocol internals.
 */
export function DocsScreen() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <p className="text-sm font-medium text-accent-foreground">Getting started</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight">
          How Yield Goblin works
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Prediction-market shares normally sit idle from the moment you buy them
          until the market resolves. Yield Goblin pays you USDC for that waiting
          time — without changing the position you took.
        </p>
      </header>

      {/* Three steps, because it genuinely is a sequence. */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">In three steps</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          <Step
            n={1}
            icon={<LimitlessIcon size={18} />}
            title="Get shares"
            body="Buy YES or NO on a Limitless market, the same as you would anyway."
          />
          <Step
            n={2}
            icon={<Wallet className="size-4" />}
            title="Deposit them"
            body="Put those shares into the vault for that market. You can deposit one side or both."
          />
          <Step
            n={3}
            icon={<Coins className="size-4" />}
            title="Earn USDC"
            body="Yield accrues continuously. Claim it whenever, and take your shares back whenever."
          />
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Common questions</h2>
        <div className="mt-5 divide-y overflow-hidden rounded-xl border bg-card">
          <Faq
            q="Does depositing change my bet?"
            defaultOpen
            a="No. Deposit YES and you get YES back — the same number of shares, with the same payoff when the market resolves. Your shares are held, never sold, traded or converted into something else. The yield is separate, and arrives in USDC."
          />
          <Faq
            q="Where does the yield actually come from?"
            a="Your deposit is put to work in Aave's USDC market on Base. The interest it earns there is passed back to depositors. Nothing is borrowed against your position, and no leverage is involved."
          />
          <Faq
            q="Can I withdraw whenever I want?"
            a="Yes. There is no lock-up and no cooldown — withdrawals are open at all times, including after the market's closing date and even if a market never resolves at all. The closing date shown on each vault is information, not a deadline for you."
          />
          <Faq
            q="Why does my claimable yield show 0.00?"
            a="Yield is credited to depositors only once it passes a small minimum. Below that it is still accruing, it just has not been distributed yet. New or small vaults sit in this state for a while — the vault page shows the progress toward that first payout so you can see it is working. Nothing is lost while you wait."
          />
          <Faq
            q="Why do YES and NO show different rates?"
            a="Each side has its own rate, and it depends on how much is currently deposited on each. Check both rate cards before you deposit — they update as the vault changes, and the difference between them can be significant."
          />
          <Faq
            q="What does it cost?"
            a="A 5% performance fee on the yield earned — nothing else. There is no fee to deposit and no fee to withdraw. If the vault earns nothing, you pay nothing."
          />
          <Faq
            q="Who holds my shares?"
            a="A smart contract on Base, not a company. Yield Goblin is non-custodial: nobody can move your shares, and every deposit, withdrawal and payout is visible on-chain. Each vault links to its contract on Basescan."
          />
          <Faq
            q="What happens when the market resolves?"
            a="The vault closes out and you claim your USDC — both the value your shares settled at and any yield they earned. Once that has happened, Claim replaces Withdraw on the vault page."
          />
          <Faq
            q="What do I need to get started?"
            a="A wallet on Base, and YES or NO shares from a Limitless market that has a vault. You will approve the vault once, then deposit. Given this is beta, use a wallet you keep separate from your main funds."
          />
        </div>
      </section>

      <section className="mt-12">
        <Card className="gap-3 border-amber-500/30 bg-amber-500/8 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Before you deposit anything</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Yield Goblin is unaudited beta software. No third party has
                reviewed the contracts, and a bug or an exploit could mean the
                permanent, unrecoverable loss of what you deposit. Connect a
                wallet reserved for testing, deposit only small amounts, and
                treat anything you put in as money you can afford to lose.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Fact
          icon={<ShieldCheck className="size-4" />}
          title="Non-custodial"
          body="Contracts on Base, verifiable on Basescan"
        />
        <Fact
          icon={<Clock className="size-4" />}
          title="No lock-up"
          body="Withdraw at any time, always"
        />
        <Fact
          icon={<AaveIcon size={16} />}
          title="Yield from Aave"
          body="USDC market on Aave v3"
        />
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t pt-8">
        <ButtonLink href="/">
          Browse markets
          <ArrowRight className="size-4" />
        </ButtonLink>
        <p className="text-sm text-muted-foreground">
          Still unsure? Open a vault and look around — nothing happens until you
          connect a wallet.
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li>
      <Card className="h-full gap-2 p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-accent-foreground">
            {icon}
          </span>
          <span className="nums text-xs font-semibold text-muted-foreground">
            Step {n}
          </span>
        </div>
        <p className="mt-1 font-medium">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </Card>
    </li>
  );
}

/** Native disclosure — accessible and keyboard-operable with no JS. */
function Faq({
  q,
  a,
  defaultOpen,
}: {
  q: string;
  a: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
        {a}
      </p>
    </details>
  );
}

function Fact({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
