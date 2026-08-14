import type { Metadata } from "next";
import { RewardsScreen } from "@/components/rewards-screen";

export const metadata: Metadata = { title: "Rewards · Yield Goblin" };

export default function RewardsPage() {
  return <RewardsScreen />;
}
