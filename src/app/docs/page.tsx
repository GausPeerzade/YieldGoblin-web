import type { Metadata } from "next";
import { DocsScreen } from "@/components/docs-screen";

export const metadata: Metadata = {
  title: "How it works · Yield Goblin",
  description:
    "Earn USDC on the Limitless prediction-market shares you already hold, without changing your position.",
};

export default function DocsPage() {
  return <DocsScreen />;
}
