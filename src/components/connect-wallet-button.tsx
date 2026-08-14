"use client";

import { useCallback, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  RiskDisclosureDialog,
  hasAcknowledgedRisk,
} from "@/components/risk-disclosure";

/**
 * RainbowKit's connect flow, restyled to match the app. Uses ConnectButton.Custom
 * so the chrome is ours while RainbowKit still owns wallet discovery and the modal.
 *
 * The first connection on a browser is gated behind the risk disclosure — the
 * protocol is unaudited, and that is worth saying before someone picks a wallet,
 * not after.
 */
/** Matches the dialog's exit animation, so the handoff looks like one step. */
const CLOSE_ANIMATION_MS = 150;

export function ConnectWalletButton({ size = "default" }: { size?: "sm" | "default" }) {
  const [riskOpen, setRiskOpen] = useState(false);
  // Held so the dialog can resume the exact action the user started.
  const [pendingConnect, setPendingConnect] = useState<(() => void) | null>(null);

  const guardConnect = useCallback((openConnectModal: () => void) => {
    if (hasAcknowledgedRisk()) {
      openConnectModal();
      return;
    }
    setPendingConnect(() => openConnectModal);
    setRiskOpen(true);
  }, []);

  return (
    <>
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== "loading";
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === "authenticated");

          return (
            <div
              aria-hidden={!ready}
              className={!ready ? "pointer-events-none select-none opacity-0" : undefined}
            >
              {!connected ? (
                <Button
                  size={size}
                  variant="outline"
                  onClick={() => guardConnect(openConnectModal)}
                >
                  <Wallet className="size-4" />
                  Connect Wallet
                </Button>
              ) : chain.unsupported ? (
                <Button size={size} variant="destructive" onClick={openChainModal}>
                  <AlertTriangle className="size-4" />
                  Wrong network
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size={size}
                    variant="ghost"
                    onClick={openChainModal}
                    className="gap-2 px-2"
                  >
                    {chain.hasIcon && chain.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        src={chain.iconUrl}
                        className="size-5 rounded-full"
                        style={{ background: chain.iconBackground }}
                      />
                    ) : null}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </Button>
                  <Button size={size} variant="outline" onClick={openAccountModal}>
                    <span className="nums">{account.displayName}</span>
                    {account.displayBalance ? (
                      <span className="hidden text-muted-foreground sm:inline">
                        {account.displayBalance}
                      </span>
                    ) : null}
                  </Button>
                </div>
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>

      <RiskDisclosureDialog
        open={riskOpen}
        onOpenChange={setRiskOpen}
        onAccept={() => {
          const run = pendingConnect;
          setPendingConnect(null);
          // Let the disclosure finish closing before RainbowKit's modal opens.
          // Two modal dialogs mounted at once fight over focus, and the loser
          // stays on screen behind the winner.
          setTimeout(() => run?.(), CLOSE_ANIMATION_MS);
        }}
      />
    </>
  );
}
