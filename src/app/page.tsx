import type { Metadata } from "next";
import { MarketsScreen } from "@/components/markets/markets-screen";

export const metadata: Metadata = {
  title: "Markets · Yield Goblin",
  description:
    "Earn USDC yield on your Limitless YES / NO shares. Matched pairs are merged and supplied to Aave v3 on Base.",
};

export default function MarketsPage() {
  return <MarketsScreen />;
}
