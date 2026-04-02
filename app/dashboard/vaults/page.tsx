"use client";

// app/dashboard/vaults/page.tsx
// Browse available staking vaults on Base — premium fintech design.

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
  Minimal: "text-[#34D399]",
  Low: "text-[#2D9FFF]",
  Medium: "text-[#F59E0B]",
  High: "text-[#EF4444]",
};

export default function VaultsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Dashboard
          </button>
          <span className="font-semibold gradient-text text-[15px]">Vaults</span>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Staking Vaults
          </h1>
          <p className="text-[14px] text-text-muted mt-1.5">
            Non-custodial vaults on Base. Deposit assets, earn yield.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MOCK_VAULTS.map((vault) => (
            <div
              key={vault.id}
              className="card p-7 cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-[16px] font-semibold text-text-primary">
                    {vault.name}
                  </h3>
                  <p className="text-[13px] text-text-muted mt-0.5">
                    {vault.chain} &middot; {vault.asset}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <VaultRiskBadge vaultId={vault.id} />
                  <span
                    className={`text-[12px] font-medium ${
                      RISK_COLORS[vault.risk] ?? "text-text-muted"
                    }`}
                  >
                    {vault.risk}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <p className="text-[12px] text-text-dim mb-1">APY</p>
                  <p className="text-2xl font-bold gradient-text-green">
                    {(vault.apyBps / 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-text-dim mb-1">TVL</p>
                  <p className="text-2xl font-bold text-text-primary">
                    ${(vault.tvlUsd / 1_000_000).toFixed(1)}M
                  </p>
                </div>
              </div>

              <button className="w-full py-3 rounded-2xl btn-primary text-[14px]">
                Stake into Vault
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
