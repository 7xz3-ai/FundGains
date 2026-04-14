"use client";

// app/dashboard/page.tsx
// Main dashboard: real-time blockchain balance, AI Autopilot, live prices for 8 assets,
// global vault opportunities, dynamic gains projection, Add Funds, Recent Activity,
// Gamification widgets. Chain abstraction — no network logos, users only see assets.
// Premium fintech design with Trust Blue accent.

import { useAccount, useBalance } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  calculatePortfolioProjections,
  formatCents,
  type Holding,
} from "@/services/projections.service";
import {
  fetchMarketPrices,
  getEthPrice,
  ASSET_REGISTRY,
  type MarketPrice,
} from "@/services/market.service";
import NotificationCenter from "@/components/notification-center";
import VaultRiskBadge from "@/components/vault-risk-badge";
import SmartYieldAlert from "@/components/dashboard/SmartYieldAlert";
import LevelXPBar from "@/components/dashboard/LevelXPBar";
import AddFundsModal from "@/components/dashboard/AddFundsModal";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AutopilotToggle from "@/components/dashboard/AutopilotToggle";
import YieldLottery from "@/components/games/YieldLottery";
import PredictionWidget from "@/components/games/PredictionWidget";
import { PortfolioDiversity } from "@/components/dashboard/PortfolioDiversity";
import PrestigeProvider from "@/components/PrestigeProvider";
import SecurityTicker from "@/components/SecurityTicker";

// ─── Types ───

interface UserData {
  displayName: string;
  walletAddress: string;
  cashBalanceUsd: number;
  stakedBalanceUsd: number;
  xp: number;
  level: number;
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

// ─── Global Vault Opportunities (Phase 5) ───
// No chain logos — users only see assets. Includes new BTC, USDT, TRX vaults.

const VAULT_OPPORTUNITIES = [
  {
    id: "vault-cbbtc-prime",
    name: "cbBTC Prime Yield",
    asset: "BTC",
    apyBps: 680,
    apyLabel: "6.80%",
    tvlUsd: 28_000_000,
    risk: "Very Safe",
    color: "#F7931A",
  },
  {
    id: "vault-usdt-stability",
    name: "USDT Stability Pool",
    asset: "USDT",
    apyBps: 1150,
    apyLabel: "11.50%",
    tvlUsd: 56_000_000,
    risk: "Very Safe",
    color: "#26A17B",
  },
  {
    id: "vault-trx-efficiency",
    name: "TRX High-Efficiency Stake",
    asset: "TRX",
    apyBps: 520,
    apyLabel: "5.20%",
    tvlUsd: 9_500_000,
    risk: "Low Risk",
    color: "#FF0013",
  },
  {
    id: "vault-base-eth",
    name: "Base ETH Yield",
    asset: "ETH",
    apyBps: 420,
    apyLabel: "4.20%",
    tvlUsd: 4_200_000,
    risk: "Low",
    color: "#627EEA",
  },
  {
    id: "vault-usdc-stable",
    name: "USDC Stable-Vault",
    asset: "USDC",
    apyBps: 850,
    apyLabel: "8.50%",
    tvlUsd: 12_500_000,
    risk: "Minimal",
    color: "#2775CA",
  },
  {
    id: "vault-sol-liquid",
    name: "Solana Liquid Stake",
    asset: "SOL",
    apyBps: 710,
    apyLabel: "7.10%",
    tvlUsd: 6_800_000,
    risk: "Low",
    color: "#9945FF",
  },
  {
    id: "vault-usdy-treasury",
    name: "U.S. Treasury Yield",
    asset: "USDY",
    apyBps: 520,
    apyLabel: "5.20%",
    tvlUsd: 250_000_000,
    risk: "AAA",
    color: "#10B981",
  },
  {
    id: "vault-paxg-gold",
    name: "Digital Gold",
    asset: "PAXG",
    apyBps: 120,
    apyLabel: "1.20%",
    tvlUsd: 50_000_000,
    risk: "AAA",
    color: "#C5A059",
  },
  {
    id: "vault-ref-rental",
    name: "Rental Income Fund",
    asset: "REF",
    apyBps: 740,
    apyLabel: "7.40%",
    tvlUsd: 8_500_000,
    risk: "A+",
    color: "#10B981",
  },
];

// ─── Component ───

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Hydration guard — prevents SSR/client mismatch for wallet data
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Target address for on-chain balance tracking
  const TARGET_ADDRESS = "0x8d69F2fF94376ae99A2aE87E0BF1039FC0d7Dc3f" as `0x${string}`;

  // Real on-chain ETH balance via wagmi — auto-refreshes every 10s
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useBalance({
    address: address || TARGET_ADDRESS,
    query: {
      enabled: mounted,
      refetchInterval: 10_000, // poll every 10s for real-time updates
    },
  });

  // Sync balance state
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const handleSyncBalance = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-balance", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastSyncTime(new Date().toLocaleTimeString());
        refetchBalance();
      }
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  const [userData, setUserData] = useState<UserData | null>(null);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [bullMode, setBullMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (mounted && !isConnected) router.push("/");
  }, [mounted, isConnected, router]);

  // Fetch user data + live prices (all 8 assets)
  useEffect(() => {
    if (!isConnected || !address) return;

    async function load() {
      setLoading(true);
      try {
        const [userRes, marketPrices] = await Promise.all([
          fetch("/api/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: address }),
          }),
          fetchMarketPrices(),
        ]);
        const user = await userRes.json();
        setUserData(user);
        setPrices(marketPrices);

        // Record daily check-in (fire and forget)
        fetch("/api/gamification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        }).catch(() => {});
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isConnected, address]);

  // Auto-refresh prices every 30s
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(async () => {
      const fresh = await fetchMarketPrices();
      setPrices(fresh);
    }, 30_000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // ─── Derived Values ───

  const ethPrice = useMemo(() => getEthPrice(prices), [prices]);

  // Real ETH balance formatted to 4 decimals
  const ethBalance = balanceData ? parseFloat(balanceData.formatted) : 0;
  const ethBalanceDisplay = ethBalance.toFixed(4);
  const ethBalanceUsd = ethBalance * ethPrice;

  // ─── Dynamic Gains Projection ───

  const { projectionTotals, diversityData } = useMemo(() => {
    const holdings: Holding[] = [];
    const apyBpsMap: Record<string, number> = {};

    if (ethBalance > 0) {
      holdings.push({
        coinId: "ethereum",
        symbol: "ETH",
        amount: ethBalance,
        priceCents: BigInt(Math.round(ethPrice * 100)),
      });
      apyBpsMap["ethereum"] = 500;
    }

    for (const a of userData?.stakedAssets ?? []) {
      const coinId =
        a.assetSymbol === "ETH"
          ? "ethereum"
          : a.assetSymbol === "USDC"
          ? "usd-coin"
          : a.assetSymbol === "USDT"
          ? "tether"
          : a.assetSymbol === "BTC" || a.assetSymbol === "cbBTC"
          ? "bitcoin"
          : a.assetSymbol === "TRX"
          ? "tron"
          : a.assetSymbol === "LINK"
          ? "chainlink"
          : a.assetSymbol === "AERO"
          ? "aerodrome-finance"
          : a.assetSymbol.toLowerCase();
      const price = prices.find((p) => p.coinId === coinId);
      const priceCents = price
        ? BigInt(Math.round(price.priceUsd * 100))
        : 1n;
      holdings.push({
        coinId,
        symbol: a.assetSymbol,
        amount: a.principalUsd / (Number(priceCents) / 100 || 1),
        priceCents,
      });
      apyBpsMap[coinId] = a.apyBps;
    }

    const diversityData = (userData?.stakedAssets ?? []).map((a) => {
      let category = "Growth";
      if (["USDC", "USDT", "USDY"].includes(a.assetSymbol)) category = "Stability";
      if (["PAXG", "REF"].includes(a.assetSymbol)) category = "Commodities";
      
      return {
        category,
        valueCents: BigInt(Math.round(a.principalUsd * 100)),
      };
    });

    const { totals } = calculatePortfolioProjections(holdings, apyBpsMap);
    return { projectionTotals: totals, diversityData };
  }, [ethBalance, ethPrice, prices, userData]);

  // ─── Render Guards ───

  if (!mounted || !isConnected) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* ─── Prestige Theme (Gold accents for high-value users) ─── */}
      <PrestigeProvider level={userData?.level ?? 1} ethPriceUsd={ethPrice} />

      {/* ─── Navigation ─── */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight">
              <span className="gradient-text">ApexYield</span>
            </span>
            {/* LIVE ON BASE indicator */}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#34D399]/10 border border-[#34D399]/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
              </span>
              <span className="text-[10px] font-semibold text-[#34D399] tracking-wider uppercase">
                Live on Base
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-5">
            <button
              onClick={() => router.push("/convert")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Convert
            </button>
            <button
              onClick={() => router.push("/liquidity")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Liquidity
            </button>
            <button
              onClick={() => router.push("/dashboard/referral")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Referrals
            </button>
            <button
              onClick={() => router.push("/launchpad")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Launchpad
            </button>
            <button
              onClick={() => router.push("/card")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Card
            </button>
            <button
              onClick={() => router.push("/governance")}
              className="text-[13px] hover:text-text-primary transition-colors hidden sm:block"
              style={{ color: "#FFD700" }}
            >
              DAO
            </button>
            {/* Recent Activity Button */}
            <button
              onClick={() => setShowActivity(true)}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors relative"
              title="Recent Activity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
            </button>
            <NotificationCenter />
            <LevelXPBar
              level={userData?.level ?? 1}
              xp={userData?.xp ?? 0}
            />
            <button
              onClick={() => router.push("/profile")}
              className="text-[13px] text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
            >
              {userData?.displayName ?? "..."}
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* ─── AI Autopilot ─── */}
        <AutopilotToggle
          walletAddress={address ?? ""}
          isConnected={isConnected}
        />

        {/* ─── Smart Yield Alert ─── */}
        <SmartYieldAlert walletAddress={address ?? ""} />

        {/* ─── Quick Actions ─── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {[
            {
              label: "Stake",
              href: "/dashboard/vaults",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#34D399]">
                  <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
                  <polyline points="16,7 22,7 22,13" />
                </svg>
              ),
            },
            {
              label: "Convert",
              href: "/convert",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#2D9FFF]">
                  <polyline points="17,1 21,5 17,9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7,23 3,19 7,15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              ),
            },
            {
              label: "Liquidity",
              href: "/liquidity",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C084FC]">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              ),
            },
            {
              label: "Deposit",
              href: "#",
              onClick: () => setShowDeposit(true),
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F59E0B]">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              ),
            },
            {
              label: "Refer",
              href: "/dashboard/referral",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#818CF8]">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
            {
              label: "Profile",
              href: "/profile",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#EC4899]">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() =>
                "onClick" in action && action.onClick
                  ? action.onClick()
                  : router.push(action.href)
              }
              className="card p-4 flex flex-col items-center gap-2 hover:border-accent/20"
            >
              {action.icon}
              <span className="text-[12px] font-medium text-text-primary">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* ─── Balance Overview ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cash Balance — Real on-chain ETH */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[13px] text-text-muted">Cash Balance</p>
                {/* Live indicator dot */}
                <span className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]" />
                  </span>
                  <span className="text-[10px] text-[#34D399] font-medium">LIVE</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncBalance}
                  disabled={syncing}
                  className="text-[12px] px-3 py-1.5 rounded-xl border border-white/[0.08] text-text-muted hover:text-text-primary hover:border-accent/30 transition-all disabled:opacity-50"
                  title="Sync on-chain balance"
                >
                  {syncing ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Syncing
                    </span>
                  ) : (
                    "Refresh"
                  )}
                </button>
                <button
                  onClick={() => setShowDeposit(true)}
                  className="btn-primary text-[12px] px-4 py-1.5 rounded-xl"
                >
                  Deposit
                </button>
              </div>
            </div>
            {balanceLoading || !mounted ? (
              <div className="space-y-2">
                <div className="h-9 w-48 rounded-xl bg-accent/10 animate-pulse" />
                <div className="h-4 w-32 rounded-lg bg-white/[0.04] animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold tracking-tight" style={{ color: '#2D9FFF' }}>
                  {ethBalanceDisplay}{" "}
                  <span className="text-lg text-text-muted font-medium">ETH</span>
                </p>
                <p className="text-[14px] text-text-secondary mt-1">
                  ≈ $
                  {ethBalanceUsd.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-[12px] text-text-dim mt-0.5">
                  @ $
                  {ethPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  / ETH
                  {" · "}
                  <span className="text-accent">Live on Base</span>
                  {lastSyncTime && (
                    <span className="text-text-dim ml-1">· Synced {lastSyncTime}</span>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Staked Balance */}
          <div className="card p-6 sm:p-8 border-accent/10">
            <p className="text-[13px] text-text-muted mb-2">Staked Balance</p>
            <p className="text-3xl font-bold gradient-text-green tracking-tight">
              ${userData?.stakedBalanceUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[13px] text-text-dim mt-1">Earning yield across global vaults</p>
          </div>
        </div>

        {/* ─── Gains Projection (Dynamic) ─── */}
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Gains Projection
              </h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                {bullMode
                  ? "Bull Market Mode — 2x price + yield (simulation)"
                  : "Realistic yield projection at 5% APY"}
              </p>
            </div>
            <button
              onClick={() => setBullMode(!bullMode)}
              className={`px-5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all ${
                bullMode
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "btn-secondary"
              }`}
            >
              {bullMode ? "Bull Mode On" : "Activate Bull Mode"}
            </button>
          </div>

          {projectionTotals.currentValueCents > 0n ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Current Portfolio"
                value={formatCents(projectionTotals.currentValueCents)}
                variant="muted"
              />
              <StatCard
                label="1-Year Yield"
                value={`+${formatCents(
                  bullMode
                    ? projectionTotals.bullMarketGainCents
                    : projectionTotals.realisticGainCents
                )}`}
                variant="accent"
              />
              <StatCard
                label="Total After 1 Year"
                value={formatCents(
                  bullMode
                    ? projectionTotals.bullMarketTotal1yCents
                    : projectionTotals.realisticTotal1yCents
                )}
                variant="highlight"
              />
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-text-muted text-[14px]">
                Deposit assets to see your yield projections.
              </p>
              <button
                onClick={() => setShowDeposit(true)}
                className="btn-primary text-[13px] px-5 py-2.5 mt-4"
              >
                Add Funds
              </button>
            </div>
          )}

          {bullMode && projectionTotals.currentValueCents > 0n && (
            <p className="mt-5 text-[12px] text-text-dim border-t border-white/[0.04] pt-4">
              Simulation assumes 2x asset prices. Not financial advice. Past
              performance is not indicative of future results.
            </p>
          )}
        </div>

        {/* ─── Live Prices (All 8 Global Assets) ─── */}
        <div className="card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">
              Live Prices
            </h2>
            <span className="text-[12px] text-text-dim">
              {prices.length} assets · Auto-refreshes
            </span>
          </div>
          {/* Horizontal scrolling ticker on mobile */}
          <div className="overflow-x-auto -mx-2 px-2 pb-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[600px] sm:min-w-0">
              {prices.map((p) => {
                const meta = ASSET_REGISTRY.find((a) => a.coinId === p.coinId);
                const color = meta?.color ?? "#6B7280";
                return (
                  <div
                    key={p.coinId}
                    className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {p.symbol.slice(0, 1)}
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold text-text-primary">
                          {p.symbol}
                        </span>
                        <span className="text-[11px] text-text-dim ml-1.5 hidden sm:inline">
                          {p.name}
                        </span>
                      </div>
                    </div>
                    <p className="text-[16px] font-bold text-text-primary">
                      $
                      {p.priceUsd >= 100
                        ? p.priceUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                        : p.priceUsd >= 1
                        ? p.priceUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : p.priceUsd.toFixed(4)}
                    </p>
                    {p.change24hPct != null && (
                      <span
                        className={`text-[12px] font-semibold ${
                          p.change24hPct >= 0
                            ? "text-[#34D399]"
                            : "text-[#EF4444]"
                        }`}
                      >
                        {p.change24hPct >= 0 ? "+" : ""}
                        {p.change24hPct.toFixed(2)}%
                      </span>
                    )}
                    {p.isStale && (
                      <span className="text-[10px] text-[#F59E0B] ml-1">(stale)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {prices.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-text-dim text-[13px]">Loading prices...</p>
            </div>
          )}
        </div>

        {/* ─── Vault Opportunities (Global — No Chain Logos) ─── */}
        <div className="card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Global Vault Opportunities
              </h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                Non-custodial yield across all assets
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/vaults")}
              className="text-[13px] text-accent hover:text-accent/80 transition-colors font-medium"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VAULT_OPPORTUNITIES.map((vault) => (
              <div
                key={vault.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white"
                      style={{ backgroundColor: vault.color }}
                    >
                      {vault.asset.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary">
                        {vault.name}
                      </p>
                      <p className="text-[11px] text-text-dim">{vault.asset}</p>
                    </div>
                  </div>
                  <VaultRiskBadge vaultId={vault.id} compact />
                </div>

                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-[11px] text-text-dim mb-0.5">APY</p>
                    <p className="text-xl font-bold gradient-text-green">
                      {vault.apyLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-text-dim mb-0.5">TVL</p>
                    <p className="text-[14px] font-semibold text-text-primary">
                      ${(vault.tvlUsd / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/dashboard/vaults")}
                  className="w-full py-2.5 rounded-xl btn-primary text-[12px]"
                >
                  Stake {vault.asset}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Gamification: Lottery + Prediction ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <YieldLottery
              walletAddress={address ?? ""}
              ticketCount={userData?.stakedAssets?.length ?? 0}
            />
            <PredictionWidget currentEthPrice={ethPrice || 3500} />
          </div>
          <PortfolioDiversity data={diversityData} />
        </div>

        {/* ─── Active Positions ─── */}
        {userData?.stakedAssets && userData.stakedAssets.length > 0 && (
          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-text-primary mb-5">
              Active Positions
            </h2>
            <div className="space-y-3">
              {userData.stakedAssets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <VaultRiskBadge vaultId={a.vaultId} compact />
                    <div>
                      <span className="text-[14px] font-semibold text-text-primary">
                        {a.assetSymbol}
                      </span>
                      <span className="text-[13px] text-text-muted ml-2">
                        {(a.apyBps / 100).toFixed(2)}% APY
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-text-primary">
                      ${a.principalUsd.toFixed(2)}
                    </p>
                    <p className="text-[13px] text-[#34D399]">
                      +${a.accruedYieldUsd.toFixed(4)} yield
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Mobile Nav (visible on small screens) ─── */}
        <div className="sm:hidden grid grid-cols-3 gap-2 pb-4">
          {[
            { label: "Convert", href: "/convert" },
            { label: "Liquidity", href: "/liquidity" },
            { label: "Referrals", href: "/dashboard/referral" },
            { label: "Card", href: "/card" },
            { label: "Withdraw", href: "/withdraw" },
            { label: "Profile", href: "/profile" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </main>

      {/* ─── Security Ticker Footer ─── */}
      <SecurityTicker />

      {/* ─── Modals & Drawers ─── */}
      <AddFundsModal
        isOpen={showDeposit}
        onClose={() => {
          setShowDeposit(false);
          refetchBalance();
        }}
        walletAddress={address ?? ""}
      />

      <RecentActivity
        isOpen={showActivity}
        onClose={() => setShowActivity(false)}
        walletAddress={address}
      />
    </div>
  );
}

// ─── Stat Card ───

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "muted" | "accent" | "highlight";
}) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
      <p className="text-[13px] text-text-muted mb-1.5">{label}</p>
      <p
        className={`text-xl font-bold tracking-tight ${
          variant === "accent"
            ? "gradient-text-green"
            : variant === "highlight"
            ? "text-text-primary"
            : "text-text-secondary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
