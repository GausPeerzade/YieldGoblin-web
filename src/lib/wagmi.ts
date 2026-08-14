import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";
import { env } from "./env";
import { callTransport } from "./rpc";

const walletConnectProjectId =
  env(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) ?? "";

if (!walletConnectProjectId && typeof window !== "undefined") {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Get one at https://cloud.reown.com",
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Yield Goblin",
  projectId: walletConnectProjectId || "demo",
  chains: [base, baseSepolia],
  transports: {
    [base.id]: callTransport(base.id),
    [baseSepolia.id]: callTransport(baseSepolia.id),
  },
  // Coalesce concurrent reads into a single Multicall3 call. The vault page is
  // a chain of dependent reads, so collapsing each level into one request is
  // what keeps the waterfall short.
  batch: { multicall: { wait: 40 } },
  ssr: true,
});
