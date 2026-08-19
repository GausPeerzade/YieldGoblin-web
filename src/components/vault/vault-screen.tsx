"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useAccount } from "wagmi";
import { AaveIcon } from "@/components/brand/token-icon";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";

import { MarketCard } from "@/components/protocol/market-card";
import { StatusBanner } from "@/components/protocol/status-banner";
import { WalletCompatWarning } from "@/components/wallet-compat-warning";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { ActivityList } from "@/components/vault/activity-list";
import { useTargetChainId } from "@/hooks/use-target-chain";
import { DepositTab } from "@/components/vault/deposit-tab";
import { OverviewTab, SettlementPanel } from "@/components/vault/overview-tab";
import { WithdrawTab } from "@/components/vault/withdraw-tab";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVaultActions } from "@/hooks/use-vault-actions";
import { useIsRegisteredVault, usePosition, useVault } from "@/hooks/use-vaults";
import { useVaultEvents } from "@/hooks/use-vault-events";
import { explorerUrl } from "@/lib/addresses";
import {
  canClaimSettlement,
  deriveStatus,
  strictMinServed,
} from "@/lib/protocol";
import type { Address } from "viem";

const TABS = ["overview", "deposit", "withdraw", "history"] as const;
type Tab = (typeof TABS)[number];

export function VaultScreen({ address }: { address: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const chainId = useTargetChainId();
  const { isConnected } = useAccount();

  const { vault, isLoading } = useVault(address);
  const { position } = usePosition(vault);
  const history = useVaultEvents(vault);
  const { verified, isLoading: verifying } = useIsRegisteredVault(
    address as Address,
  );
  const actions = useVaultActions(vault?.address);

  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "overview";

  const setTab = useCallback(
    (next: string) => {
      router.replace(`/vault/${address}?tab=${next}`, { scroll: false });
    },
    [router, address],
  );

  const handleDeposit = useCallback(
    async (yes: bigint, no: bigint) => {
      // One call per side — the contract takes a single side at a time.
      if (yes > 0n) await actions.deposit("yes", yes);
      if (no > 0n) await actions.deposit("no", no);
    },
    [actions],
  );

  const handleWithdraw = useCallback(
    async (
      yes: bigint,
      no: bigint,
      opts: { strict: boolean; alsoClaim: boolean },
    ) => {
      // minServed is the slippage guard. "Strict" still allows the vault's own
      // rounding buffer — asking for the exact amount reverts SlippageExceeded
      // on Aave's 1-2 unit dust (guide §5.3).
      const floor = (amount: bigint) =>
        opts.strict && vault ? strictMinServed(amount, vault.constants) : 0n;
      if (yes > 0n) await actions.withdraw("yes", yes, floor(yes));
      if (no > 0n) await actions.withdraw("no", no, floor(no));
      if (opts.alsoClaim) await actions.claimYield();
    },
    [actions, vault],
  );

  if (isLoading || verifying) {
    return (
      <Shell>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Shell>
    );
  }

  if (!vault) {
    return (
      <Shell>
        <Card className="items-center gap-3 p-12 text-center">
          <p className="font-medium">Vault not found</p>
          <p className="text-sm text-muted-foreground">
            No vault exists at this address on the current network.
          </p>
          <ButtonLink variant="outline" href="/">Back to markets</ButtonLink>
        </Card>
      </Shell>
    );
  }

  // The implementation is public bytecode, so anyone can deploy a byte-identical
  // clone. The factory registry is the only authoritative answer to "is this
  // ours" — though since creation went permissionless it means "created with
  // validated parameters", not "reviewed by anyone".
  if (!verified) {
    return (
      <Shell>
        <Card className="items-center gap-3 border-destructive/40 bg-destructive/5 p-12 text-center">
          <ShieldAlert className="size-8 text-destructive" />
          <p className="font-medium">This vault is not in the registry</p>
          <p className="max-w-md text-sm text-muted-foreground">
            The contract at this address was not created by the Yield Goblin
            factory. It may be an imitation — do not deposit into it.
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Vaults that <em>are</em> in the registry were created with validated
            parameters, but anyone can create one — being listed is not an
            endorsement of the underlying market.
          </p>
          <ButtonLink variant="outline" href="/">
            Back to markets
          </ButtonLink>
        </Card>
      </Shell>
    );
  }

  const status = deriveStatus(vault);
  const settled = canClaimSettlement(status);

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <ButtonLink variant="ghost" size="icon" aria-label="Back to markets" href="/">
          <ArrowLeft className="size-5" />
        </ButtonLink>
        <a
          href={explorerUrl(chainId, "address", vault.address)}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          View contract
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <MarketCard vault={vault} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <AaveIcon size={20} />
        <span className="font-medium">Powered by Aave v3</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Yield is earned in USDC</span>
      </div>

      <StatusBanner
        status={status}
        busy={actions.isBusy}
        onSettle={() => actions.keeper("settle")}
      />

      <WrongNetworkBanner />

      <WalletCompatWarning />

      {settled ? (
        <SettlementPanel
          vault={vault}
          position={position}
          busy={actions.isBusy}
          onClaim={actions.claimSettlement}
        />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <TabsList variant="line" className="h-auto w-full justify-start border-b">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              vault={vault}
              position={position}
              status={status}
              yieldSeries={history.yieldSeries}
              busy={actions.isBusy}
              onClaimYield={actions.claimYield}
              onKeeper={actions.keeper}
            />
          </TabsContent>

          <TabsContent value="deposit">
            <DepositTab
              vault={vault}
              position={position}
              status={status}
              connected={isConnected}
              busy={actions.isBusy}
              onApprove={actions.approve}
              onDeposit={handleDeposit}
            />
          </TabsContent>

          <TabsContent value="withdraw">
            <WithdrawTab
              vault={vault}
              position={position}
              status={status}
              connected={isConnected}
              busy={actions.isBusy}
              onWithdraw={handleWithdraw}
              onClaimYield={actions.claimYield}
            />
          </TabsContent>

          <TabsContent value="history">
            <ActivityList
              events={history.activity}
              chainId={chainId}
              empty="No activity in this vault yet."
            />
          </TabsContent>
        </Tabs>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6 sm:py-10">
      {children}
    </div>
  );
}
