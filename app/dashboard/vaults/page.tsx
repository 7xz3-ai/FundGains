"use client";

// app/dashboard/vaults/page.tsx
// Browse all global staking vaults — chain abstraction (no network logos).
// Includes new Phase 5 vaults: cbBTC Prime Yield, USDT Stability Pool, TRX High-Efficiency.
// Intent-based routing: "Optimizing global route..." loading state.

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import VaultRiskBadge from "@/components/vault-risk-badge";

const ALL_VAULTS = [
  {
    id: "vault-cbbtc-prime",
    name: "cbBTC Prime Yield",
    asset: "BTC",
    apyBps: 680,
    tvlUsd: 28_000_000,
    risk: "Very Safe",
    color: "#F7931A",
    category: "yield",
  },
  {
    id: "vault-usdt-stability",
    name: "USDT Stability Pool",
    asset: "USDT",
    apyBps: 1150,
    tvlUsd: 56_000_000,
    risk: "Very Safe",
    color: "#26A17B",
    category: "stable",
  },
  {
    id: "vault-trx-efficiency",
    name: "TRX High-Efficiency Stake",
    asset: "TRX",
    apyBps: 520,
    tvlUsd: 9_500_000,
    risk: "Low Risk",
    color: "#FF0013",
    category: "high-efficiency",
  },
  {
    id: "vault-base-eth",
    name: "Base ETH Yield",
    asset: "ETH",
    apyBps: 420,
    tvlUsd: 4_200_000,
    risk: "Low",
    color: "#627EEA",
    category: "yield",
  },
  {
    id: "0xVaultETH_B",
    name: "ETH Growth Vault",
    asset: "ETH",
    apyBps: 720,
    tvlUsd: 1_500_000,
    risk: "Moderate",
    color: "#627EEA",
    category: "growth",
  },
  {
    id: "vault-usdc-stable",
    name: "USDC Stable-Vault",
    asset: "USDC",
    apyBps: 850,
    tvlUsd: 12_500_000,
    risk: "Minimal",
    color: "#2775CA",
    category: "stable",
  },
  {
    id: "0xVaultUSDC_B",
    name: "USDC High-Yield Vault",
    asset: "USDC",
    apyBps: 1100,
    tvlUsd: 800_000,
    risk: "Moderate",
    color: "#2775CA",
    category: "growth",
  },
  {
    id: "vault-sol-liquid",
    name: "Solana Liquid Stake",
    asset: "SOL",
    apyBps: 710,
    tvlUsd: 6_800_000,
    risk: "Low",
    color: "#9945FF",
    category: "yield",
  },
  {
    id: "vault-link-oracle",
    name: "LINK Oracle Staking",
    asset: "LINK",
    apyBps: 390,
    tvlUsd: 6_800_000,
    risk: "Low Risk",
    color: "#2A5ADA",
    category: "yield",
  },
  {
    id: "vault-aero-base",
    name: "AERO Base Ecosystem",
    asset: "AERO",
    apyBps: 1800,
    tvlUsd: 3_200_000,
    risk: "Moderate",
    color: "#0052FF",
    category: "growth",
  },
  {
    id: "0xVaultBTC",
    name: "cbBTC Growth Vault",
    asset: "BTC",
    apyBps: 320,
    tvlUsd: 8_100_000,
    risk: "Low",
    color: "#F7931A",
    category: "growth",
  },
];

const CATEGORIES = ["all", "yield", "stable", "growth", "high-efficiency"] as const;

export default function VaultsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [stakingVault, setStakingVault] = useState<string | null>(null);
  const [routeMessage, setRouteMessage] = useState("");

  const filtered =
    filter === "all"
      ? ALL_VAULTS
      : ALL_VAULTS.filter((v) => v.category === filter);

  const handleStake = (vault: typeof ALL_VAULTS[0]) => {
    setStakingVault(vault.id);
    setRouteMessage("Optimizing global route...");

    // Simulate intent-based routing steps
    setTimeout(() => setRouteMessage(`Preparing ${vault.asset} allocation...`), 1200);
    setTimeout(() => setRouteMessage("Confirming vault entry..."), 2400);
    setTimeout(() => {
      setStakingVault(null);
      setRouteMessage("");
    }, 3600);
  };

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Dashboard
          </button>
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">Global Vaults</span>
          </span>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Staking Vaults
          </h1>
          <p className="text-[14px] text-text-muted mt-1">
            Non-custodial yield opportunities across all supported assets.
            Routing is handled automatically.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-2xl text-[12px] font-medium transition-all ${
                filter === cat
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-white/[0.03] text-text-muted border border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              {cat === "all"
                ? "All Vaults"
                : cat === "high-efficiency"
                ? "High Efficiency"
                : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Vault Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vault) => (
            <div
              key={vault.id}
              className="card p-6 hover:border-white/[0.08] transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-[14px] font-bold text-white"
                    style={{ backgroundColor: vault.color }}
                  >
                    {vault.asset.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-text-primary">
                      {vault.name}
                    </p>
                    <p className="text-[12px] text-text-dim">{vault.asset}</p>
                  </div>
                </div>
                <VaultRiskBadge vaultId={vault.id} compact />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <p className="text-[11px] text-text-dim mb-0.5">APY</p>
                  <p className="text-xl font-bold gradient-text-green">
                    {(vault.apyBps / 100).toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-text-dim mb-0.5">TVL</p>
                  <p className="text-[15px] font-semibold text-text-primary">
                    ${(vault.tvlUsd / 1_000_000).toFixed(1)}M
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleStake(vault)}
                disabled={stakingVault === vault.id}
                className="w-full py-3 rounded-xl btn-primary text-[13px] font-semibold disabled:opacity-60"
              >
                {stakingVault === vault.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {routeMessage}
                  </span>
                ) : (
                  `Stake ${vault.asset}`
                )}
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-text-muted">No vaults in this category.</p>
          </div>
        )}
      </main>
    </div>
  );
}
