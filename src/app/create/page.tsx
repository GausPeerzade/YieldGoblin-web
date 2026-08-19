import type { Metadata } from "next";
import { CreateVaultScreen } from "@/components/create-vault-screen";

export const metadata: Metadata = {
  title: "Add a market · Yield Goblin",
  description:
    "Paste a Limitless market link to create a vault for it and start earning USDC on your shares.",
};

export default function CreatePage() {
  return <CreateVaultScreen />;
}
