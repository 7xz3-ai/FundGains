// lib/wagmi.ts
// Wagmi + RainbowKit configuration — Base chain as default (low-fee L2)
// MetaMask + Trust Wallet + WalletConnect explicitly configured.

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
  rainbowWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "e03ef3474036bb3c9f998b0c5a1f7af4";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, trustWallet, coinbaseWallet],
    },
    {
      groupName: "Other",
      wallets: [walletConnectWallet, rainbowWallet],
    },
  ],
  {
    appName: "ApexYield Anonymous",
    projectId,
  }
);

const chains = [
  base,
  ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true"
    ? [baseSepolia]
    : []),
] as const;

export const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: {
    [base.id]: http(),
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true"
      ? { [baseSepolia.id]: http() }
      : {}),
  },
  ssr: true,
});

export { base as defaultChain };
