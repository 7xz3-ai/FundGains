"use client";

// app/dashboard/page.tsx
// Main dashboard: wallet balance, live prices, and Bull Market projections.

import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  calculatePortfolioProjections,
  formatCents,
  type Holding,
} from "@/services/projections.service";
import NotificationCenter from "@/components/notification-center";
import VaultRiskBadge from "@/components/vault-risk-badge";

interface UserData {
  displayName: string;
  walletAddress: string;
  cashBalanceUsd: number;
  stakedBalanceUsd: number;
  stakedAssets: Array<{
    id: string;
    assetSymbol: string;
    vaultId: string;
    apyBps: number;
    principalUsd: number;
    accruedYieldUsd: number;
    stakedAt: string;
  }>;
}

interface Price {
  coinId: string;
  symbol: string;
  priceUsd: number;
  change24hPct: number | null;
  isStale: boolean;
}

const SUPPORTED_COINS = ["ethereum", "bitcoin", "usd-coin"];

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [bullMode, setBullMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    async function load() {
      if (!address) return;
      setLoading(true);
      try {
        const [userRes, priceRes] = await Promise.all([
          fetch("/api/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: address }),
          }),
          fetch(`/api/prices?coins=${SUPPORTED_COINS.join(",")}`),
        ]);
        const user = await userRes.json();
        const priceData = await priceRes.json();
        setUserData(user);
        setPrices(priceData.prices ?? []);

        // Record daily check-in (for streak tracking)
        fetch("/api/gamification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        }).catch(() => {});
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isConnected, address, router]);

  if (!isConnected) return null;
  if (loading) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-[#00ff88] font-mono animate-pulse text-lg">
          // Syncing chain data...
        </div>
      </div>
    );
  }

  // Build mock holdings from staked assets + live prices for projections
  const holdings: Holding[] = (userData?.stakedAssets ?? []).map((a) => {
    const coinId =
      a.assetSymbol === "ETH"
        ? "ethereum"
        : a.assetSymbol === "BTC"
        ? "bitcoin"
        : a.assetSymbol.toLowerCase();
    const price = prices.find((p) => p.coinId === coinId);
    const priceCents = price ? BigInt(Math.round(price.priceUsd * 100)) : 1n;
    return {
      coinId,
      symbol: a.assetSymbol,
      amount: a.principalUsd / (Number(priceCents) / 100 || 1),
      priceCents,
    };
  });

  const apyBpsMap = Object.fromEntries(
    (userData?.stakedAssets ?? []).map((a) => {
      const coinId =
        a.assetSymbol === "ETH" ? "ethereum" : a.assetSymbol.toLowerCase();
      return [coinId, a.apyBps];
    })
  );

  const { totals } = calculatePortfolioProjections(holdings, apyBpsMap);

  return (
    <div className="min-h-screen cyber-grid">
      {/* Nav */}
      <nav className="border-b border-[#1a1a2e] bg-[#050508]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-lg">
            <span className="gradient-text">ApexYield</span>
            <span className="text-[#4a4a6a] text-sm font-mono ml-2">Anonymous</span>
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push("/dashboard/convert")}
              className="text-xs text-[#8080a0] hover:text-[#00ff88] transition-colors font-mono hidden sm:block"
            >
              Convert
            </button>
            <button
              onClick={() => router.push("/dashboard/referral")}
              className="text-xs text-[#8080a0] hover:text-[#00ff88] transition-colors font-mono hidden sm:block"
            >
              Referrals
            </button>
            <NotificationCenter />
            <button
              onClick={() => router.push("/profile")}
              className="text-sm text-[#8080a0] hover:text-[#00ff88] transition-colors font-mono"
            >
              {userData?.displayName ?? "..."}
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Stake", icon: "📈", href: "/dashboard/vaults" },
            { label: "Convert", icon: "🔄", href: "/dashboard/convert" },
            { label: "Refer & Earn", icon: "👥", href: "/dashboard/referral" },
            { label: "Profile", icon: "⚡", href: "/profile" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-xs font-mono font-semibold text-white">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-6">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-1">
              Cash Balance
            </p>
            <p className="text-3xl font-bold text-white">
              ${userData?.cashBalanceUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-xs text-[#4a4a6a] mt-1 font-mono">Available to stake</p>
          </div>
          <div className="card p-6 border-[#00ff88]/20">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-1">
              Staked Balance
            </p>
            <p className="text-3xl font-bold text-[#00ff88]">
              ${userData?.stakedBalanceUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-xs text-[#4a4a6a] mt-1 font-mono">Earning yield now</p>
          </div>
        </div>

        {/* Bull Market Mode Toggle + Projections */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-white">Gains Projection</h2>
              <p className="text-xs text-[#4a4a6a] font-mono">
                {bullMode
                  ? "⚡ Bull Market Mode — 2x price + yield (simulation only)"
                  : "Realistic yield projection (APY only)"}
              </p>
            </div>
            <button
              onClick={() => setBullMode(!bullMode)}
              className={`px-4 py-2 rounded-lg text-sm font-mono font-bold transition-all ${
                bullMode
                  ? "bg-[#00ff88] text-[#050508]"
                  : "border border-[#00ff88]/40 text-[#00ff88] hover:bg-[#00ff88]/10"
              }`}
            >
              {bullMode ? "🚀 BULL MODE ON" : "🐂 Activate Bull Mode"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat
              label="Current Portfolio"
              value={formatCents(totals.currentValueCents)}
              muted
            />
            <Stat
              label="1-Year Yield"
              value={`+${formatCents(bullMode ? totals.bullMarketGainCents : totals.realisticGainCents)}`}
              accent
            />
            <Stat
              label="Total After 1 Year"
              value={formatCents(bullMode ? totals.bullMarketTotal1yCents : totals.realisticTotal1yCents)}
              highlight
            />
          </div>

          {bullMode && (
            <p className="mt-4 text-xs text-[#4a4a6a] font-mono border-t border-[#1a1a2e] pt-3">
              ⚠ Simulation assumes 2x asset prices. Not financial advice. Past performance is not indicative of future results.
            </p>
          )}
        </div>

        {/* Live Prices */}
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">Live Prices</h2>
          <div className="space-y-3">
            {prices.map((p) => (
              <div
                key={p.coinId}
                className="flex items-center justify-between py-2 border-b border-[#1a1a2e] last:border-0"
              >
                <span className="font-mono text-sm text-[#8080a0]">{p.symbol}</span>
                <div className="flex items-center gap-3">
                  {p.change24hPct != null && (
                    <span
                      className={`text-xs font-mono ${
                        p.change24hPct >= 0 ? "text-[#00ff88]" : "text-[#ff4466]"
                      }`}
                    >
                      {p.change24hPct >= 0 ? "+" : ""}
                      {p.change24hPct.toFixed(2)}%
                    </span>
                  )}
                  <span className="font-semibold text-white">
                    ${p.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  {p.isStale && (
                    <span className="text-xs text-[#ffaa00] font-mono">(stale)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Vaults */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Active Vaults</h2>
            <button
              onClick={() => router.push("/dashboard/vaults")}
              className="text-xs font-mono text-[#00ff88] hover:underline"
            >
              Browse Vaults →
            </button>
          </div>
          {userData?.stakedAssets.length === 0 ? (
            <p className="text-sm text-[#4a4a6a] font-mono py-4 text-center">
              // No active positions. Connect your assets to a vault.
            </p>
          ) : (
            <div className="space-y-3">
              {userData?.stakedAssets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0d0d14] border border-[#1a1a2e]"
                >
                  <div className="flex items-center gap-2">
                    <VaultRiskBadge vaultId={a.vaultId} compact />
                    <span className="font-mono text-sm text-white font-semibold">
                      {a.assetSymbol}
                    </span>
                    <span className="text-xs text-[#4a4a6a] font-mono">
                      {(a.apyBps / 100).toFixed(2)}% APY
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      ${a.principalUsd.toFixed(2)}
                    </p>
                    <p className="text-xs text-[#00ff88] font-mono">
                      +${a.accruedYieldUsd.toFixed(4)} yield
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#0d0d14] rounded-lg p-4 border border-[#1a1a2e]">
      <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-xl font-bold ${
          accent
            ? "text-[#00ff88]"
            : highlight
            ? "text-white"
            : "text-[#8080a0]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
