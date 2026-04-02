"use client";

// app/dashboard/page.tsx
// Main dashboard: real-time blockchain balance, live prices, vault opportunities,
// dynamic gains projection, Add Funds, Recent Activity, Gamification widgets.
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
  type MarketPrice,
} from "@/services/market.service";
import NotificationCenter from "@/components/notification-center";
import VaultRiskBadge from "@/components/vault-risk-badge";
import SmartYieldAlert from "@/components/dashboard/SmartYieldAlert";
import LevelXPBar from "@/components/dashboard/LevelXPBar";
import AddFundsModal from "@/components/dashboard/AddFundsModal";
import RecentActivity from "@/components/dashboard/RecentActivity";
import YieldLottery from "@/components/games/YieldLottery";
import PredictionWidget from "@/components/games/PredictionWidget";

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

// ─── Static Vault Opportunities ───

const VAULT_OPPORTUNITIES = [
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
];

// ─── Component ───

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Real on-chain ETH balance via wagmi
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  const [userData, setUserData] = useState<UserData | null>(null);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [bullMode, setBullMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  // Fetch user data + live prices
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

  const { projectionTotals } = useMemo(() => {
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

    const { totals } = calculatePortfolioProjections(holdings, apyBpsMap);
    return { projectionTotals: totals };
  }, [ethBalance, ethPrice, prices, userData]);

  // ─── Render Guards ───

  if (!isConnected) return null;

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
      {/* ─── Navigation ─── */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </span>
          <div className="flex items-center gap-3 sm:gap-5">
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
              className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
            >
              {userData?.displayName ?? "..."}
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ─── Smart Yield Alert ─── */}
        <SmartYieldAlert walletAddress={address ?? ""} />

        {/* ─── Quick Actions ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: "Stake",
              href: "/dashboard/vaults",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#34D399]">
                  <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
                  <polyline points="16,7 22,7 22,13" />
                </svg>
              ),
            },
            {
              label: "Convert",
              href: "/convert",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#2D9FFF]">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C084FC]">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              ),
            },
            {
              label: "Refer & Earn",
              href: "/dashboard/referral",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#818CF8]">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F59E0B]">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="card p-5 flex flex-col items-center gap-2.5 hover:border-accent/20"
            >
              {action.icon}
              <span className="text-[13px] font-medium text-text-primary">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* ─── Balance Overview ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cash Balance — Real on-chain ETH */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] text-text-muted">Cash Balance</p>
              <button
                onClick={() => setShowDeposit(true)}
                className="btn-primary text-[12px] px-4 py-1.5 rounded-xl"
              >
                Deposit
              </button>
            </div>
            {balanceLoading ? (
              <div className="space-y-2">
                <div className="h-9 w-48 rounded-xl bg-accent/10 animate-pulse" />
                <div className="h-4 w-32 rounded-lg bg-white/[0.04] animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-text-primary tracking-tight">
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
                </p>
              </>
            )}
          </div>

          {/* Staked Balance */}
          <div className="card p-8 border-accent/10">
            <p className="text-[13px] text-text-muted mb-2">Staked Balance</p>
            <p className="text-3xl font-bold gradient-text-green tracking-tight">
              ${userData?.stakedBalanceUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[13px] text-text-dim mt-1">Earning yield now</p>
          </div>
        </div>

        {/* ─── Gains Projection (Dynamic) ─── */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
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
                Deposit ETH to see your yield projections.
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

        {/* ─── Live Prices ─── */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">
              Live Prices
            </h2>
            <span className="text-[12px] text-text-dim">
              Auto-refreshes every 30s
            </span>
          </div>
          <div className="space-y-1">
            {prices.map((p) => (
              <div
                key={p.coinId}
                className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white"
                    style={{
                      backgroundColor:
                        p.coinId === "ethereum"
                          ? "#627EEA"
                          : p.coinId === "usd-coin"
                          ? "#2775CA"
                          : p.coinId === "solana"
                          ? "#9945FF"
                          : "#6B7280",
                    }}
                  >
                    {p.symbol.slice(0, 1)}
                  </div>
                  <div>
                    <span className="text-[14px] font-semibold text-text-primary">
                      {p.symbol}
                    </span>
                    <span className="text-[12px] text-text-dim ml-2">
                      {p.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {p.change24hPct != null && (
                    <span
                      className={`text-[13px] font-semibold px-2.5 py-1 rounded-lg ${
                        p.change24hPct >= 0
                          ? "text-[#34D399] bg-[#34D399]/10"
                          : "text-[#EF4444] bg-[#EF4444]/10"
                      }`}
                    >
                      {p.change24hPct >= 0 ? "+" : ""}
                      {p.change24hPct.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-[15px] font-semibold text-text-primary min-w-[90px] text-right">
                    $
                    {p.priceUsd.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  {p.isStale && (
                    <span className="text-[11px] text-[#F59E0B]">(stale)</span>
                  )}
                </div>
              </div>
            ))}
            {prices.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-text-dim text-[13px]">Loading prices...</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Vault Opportunities ─── */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Vault Opportunities
              </h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                Non-custodial yield vaults on Base
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/vaults")}
              className="text-[13px] text-accent hover:text-accent/80 transition-colors font-medium"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VAULT_OPPORTUNITIES.map((vault) => (
              <div
                key={vault.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 hover:border-white/[0.08] transition-colors"
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
                      <p className="text-[14px] font-semibold text-text-primary">
                        {vault.name}
                      </p>
                      <p className="text-[12px] text-text-dim">{vault.asset}</p>
                    </div>
                  </div>
                  <VaultRiskBadge vaultId={vault.id} compact />
                </div>

                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-[12px] text-text-dim mb-0.5">APY</p>
                    <p className="text-2xl font-bold gradient-text-green">
                      {vault.apyLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-text-dim mb-0.5">TVL</p>
                    <p className="text-[15px] font-semibold text-text-primary">
                      ${(vault.tvlUsd / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/dashboard/vaults")}
                  className="w-full py-2.5 rounded-xl btn-primary text-[13px]"
                >
                  Stake {vault.asset}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Gamification: Lottery + Prediction ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <YieldLottery
            walletAddress={address ?? ""}
            ticketCount={userData?.stakedAssets?.length ?? 0}
          />
          <PredictionWidget currentEthPrice={ethPrice || 3500} />
        </div>

        {/* ─── Active Positions ─── */}
        {userData?.stakedAssets && userData.stakedAssets.length > 0 && (
          <div className="card p-8">
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
      </main>

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
