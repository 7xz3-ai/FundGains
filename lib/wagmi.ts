// lib/wagmi.ts
// Wagmi + RainbowKit configuration — Base chain as default (low-fee L2)

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "ApexYield Anonymous",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "3fcc6b4468bd9335c453c80775a61d1f", // Placeholder for build-time static generation
  chains: [
    base,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true"
      ? [baseSepolia]
      : []),
  ],
  ssr: true, // required for Next.js App Router
});

export { base as defaultChain };
