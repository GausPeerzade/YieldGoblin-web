"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { ThemeProvider, useTheme } from "next-themes";
import { wagmiConfig } from "@/lib/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKit>{children}</RainbowKit>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

/** Keeps RainbowKit's modal in step with the app's own theme. */
function RainbowKit({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const brand = { accentColor: "#0f9960", accentColorForeground: "#ffffff" };

  return (
    <RainbowKitProvider
      modalSize="compact"
      theme={
        resolvedTheme === "dark"
          ? darkTheme({ ...brand, borderRadius: "medium" })
          : lightTheme({ ...brand, borderRadius: "medium" })
      }
    >
      {children}
    </RainbowKitProvider>
  );
}
