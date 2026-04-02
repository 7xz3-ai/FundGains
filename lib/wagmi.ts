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

// Always include both chains and transports to satisfy TypeScript
export const wagmiConfig = createConfig({
  connectors,
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

export { base as defaultChain };
