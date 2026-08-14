"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ShieldOff, Wallet2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/**
 * Risk disclosure shown before a wallet is ever connected.
 *
 * The protocol is unaudited and under active testing, so this gates the connect
 * flow rather than sitting somewhere a user might not read. Acknowledgement is
 * remembered per browser — nagging on every visit trains people to dismiss
 * warnings without reading them, which is worse than showing it once properly.
 */

const STORAGE_KEY = "yg.risk-ack.v1";

/** Bump when the terms change materially, so everyone re-acknowledges. */
export function hasAcknowledgedRisk() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing or blocked storage — show the warning again.
    return false;
  }
}

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function acknowledge() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* proceeding without persistence is fine; they'll see it again */
  }
  listeners.forEach((fn) => fn());
}

/** Reactive read, so the header badge and connect flow stay in step. */
export function useRiskAcknowledged() {
  return useSyncExternalStore(subscribe, hasAcknowledgedRisk, () => false);
}

export function RiskDisclosureDialog({
  open,
  onOpenChange,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the user accepts — continue whatever they were doing. */
  onAccept: () => void;
}) {
  const [checked, setChecked] = useState(false);

  const accept = useCallback(() => {
    acknowledge();
    setChecked(false);
    onOpenChange(false);
    onAccept();
  }, [onAccept, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setChecked(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <span className="mb-1 grid size-11 place-items-center rounded-full bg-amber-500/12">
            <AlertTriangle className="size-5 text-amber-600" />
          </span>
          <DialogTitle className="text-lg">
            Beta software — use a test wallet only
          </DialogTitle>
          <DialogDescription>
            Read this before connecting. It describes real ways you could lose
            money here.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-3">
          <Risk
            icon={<ShieldOff className="size-4" />}
            title="The contracts have not been audited"
            body="No third party has reviewed this code. A bug or an exploit could result in the permanent, unrecoverable loss of everything you deposit."
          />
          <Risk
            icon={<Wallet2 className="size-4" />}
            title="Do not connect your main wallet"
            body="Use a fresh wallet that holds nothing you would mind losing. Connecting is not itself dangerous, but a wallet you use for anything else does not belong here."
          />
          <Risk
            icon={<AlertTriangle className="size-4" />}
            title="Deposit only what you can write off"
            body="Treat anything you put in as spent. This is a test deployment — amounts are small, behaviour may change, and there is no recourse if funds are lost."
          />
        </ul>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3.5">
          <Checkbox
            id="risk-ack"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <Label
            htmlFor="risk-ack"
            className="text-sm font-normal leading-snug text-muted-foreground"
          >
            I understand this is unaudited beta software, I am connecting a
            wallet reserved for testing, and I accept that I may lose everything
            I deposit.
          </Label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!checked} onClick={accept}>
            I understand — connect wallet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Risk({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-500/12 text-amber-600">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
