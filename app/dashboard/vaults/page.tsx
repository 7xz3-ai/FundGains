"use client";

// app/dashboard/vaults/page.tsx
// Browse available staking vaults on Base.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import VaultRiskBadge from "@/components/vault-risk-badge";

const MOCK_VAULTS = [
  {
    id: "0xVaultETH",
    name: "ETH Liquid Vault",
    asset: "ETH",
    apyBps: 480,
    tvlUsd: 4_200_000,
    chain: "Base",
    risk: "Low",
  },
  {
    id: "0xVaultUSDC",
    name: "USDC Stable Vault",
    asset: "USDC",
    apyBps: 850,
    tvlUsd: 12_500_000,
    chain: "Base",
    risk: "Minimal",
  },
  {
    id: "0xVaultBTC",
    name: "cbBTC Growth Vault",
    asset: "cbBTC",
    apyBps: 320,
    tvlUsd: 8_100_000,
    chain: "Base",
    risk: "Low",
  },
];

const RISK_COLORS: Record<string, string> = {
  Minimal: "text-[#00ff88]",
  Low: "text-[#00aaff]",
  Medium: "text-[#ffaa00]",
  High: "text-[#ff4466]",
};

export default function VaultsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <div className="min-h-screen cyber-grid">
      <nav className="border-b border-[#1a1a2e] bg-[#050508]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-mono text-[#4a4a6a] hover:text-[#00ff88] transition-colors"
          >
            ← Dashboard
          </button>
          <span className="font-bold gradient-text">Vaults</span>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Staking Vaults</h1>
          <p className="text-sm text-[#4a4a6a] font-mono mt-1">
            Non-custodial vaults on Base — deposit assets, earn yield
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_VAULTS.map((vault) => (
            <div key={vault.id} className="card p-6 cursor-pointer hover:scale-[1.01] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{vault.name}</h3>
                  <p className="text-xs font-mono text-[#4a4a6a] mt-0.5">
                    {vault.chain} · {vault.asset}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <VaultRiskBadge vaultId={vault.id} />
                  <span
                    className={`text-xs font-mono font-semibold ${RISK_COLORS[vault.risk] ?? "text-[#8080a0]"}`}
                  >
                    {vault.risk} Risk
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-mono text-[#4a4a6a]">APY</p>
                  <p className="text-xl font-bold text-[#00ff88]">
                    {(vault.apyBps / 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono text-[#4a4a6a]">TVL</p>
                  <p className="text-xl font-bold text-white">
                    ${(vault.tvlUsd / 1_000_000).toFixed(1)}M
                  </p>
                </div>
              </div>

              <button className="mt-4 w-full py-2 rounded-lg border border-[#00ff88]/40 text-[#00ff88] text-sm font-mono hover:bg-[#00ff88]/10 transition-colors">
                Stake into Vault →
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
