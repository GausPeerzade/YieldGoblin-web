import type { Metadata } from "next";
import { MyVaultsScreen } from "@/components/my-vaults-screen";

export const metadata: Metadata = { title: "My Vaults · Yield Goblin" };

export default function MyVaultsPage() {
  return <MyVaultsScreen />;
}
