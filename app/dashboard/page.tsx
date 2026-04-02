"use client";

// app/dashboard/page.tsx
// Main dashboard: premium fintech design with glass cards, generous spacing.

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
import SmartYieldAlert from "@/components/dashboard/SmartYieldAlert";
import LevelXPBar from "@/components/dashboard/LevelXPBar";

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
    }
  }, [isConnected, router]);

  useEffect(() => {
    if (!isConnected) return;

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

        // Record daily check-in
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
  }, [isConnected, address]);

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
    <div className="min-h-screen bg-mesh">
      {/* ─── Navigation ─── */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </span>
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={() => router.push("/dashboard/convert")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Convert
            </button>
            <button
              onClick={() => router.push("/dashboard/referral")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors hidden sm:block"
            >
              Referrals
            </button>
            <NotificationCenter />
            {/* Level & XP in nav */}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              href: "/dashboard/convert",
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
              className="card p-5 flex flex-col items-center gap-2.5 hover:scale-[1.02] transition-transform cursor-pointer"
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
          <div className="card p-8">
            <p className="text-[13px] text-text-muted mb-2">Cash Balance</p>
            <p className="text-3xl font-bold text-text-primary tracking-tight">
              ${userData?.cashBalanceUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[13px] text-text-dim mt-1">Available to stake</p>
          </div>
          <div className="card p-8 border-accent/10">
            <p className="text-[13px] text-text-muted mb-2">Staked Balance</p>
            <p className="text-3xl font-bold gradient-text-green tracking-tight">
              ${userData?.stakedBalanceUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[13px] text-text-dim mt-1">Earning yield now</p>
          </div>
        </div>

        {/* ─── Gains Projection ─── */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Gains Projection</h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                {bullMode
                  ? "Bull Market Mode — 2x price + yield (simulation)"
                  : "Realistic yield projection (APY only)"}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Current Portfolio"
              value={formatCents(totals.currentValueCents)}
              variant="muted"
            />
            <StatCard
              label="1-Year Yield"
              value={`+${formatCents(bullMode ? totals.bullMarketGainCents : totals.realisticGainCents)}`}
              variant="accent"
            />
            <StatCard
              label="Total After 1 Year"
              value={formatCents(bullMode ? totals.bullMarketTotal1yCents : totals.realisticTotal1yCents)}
              variant="highlight"
            />
          </div>

          {bullMode && (
            <p className="mt-5 text-[12px] text-text-dim border-t border-white/[0.04] pt-4">
              Simulation assumes 2x asset prices. Not financial advice. Past performance is not indicative of future results.
            </p>
          )}
        </div>

        {/* ─── Live Prices ─── */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-text-primary mb-5">Live Prices</h2>
          <div className="space-y-1">
            {prices.map((p) => (
              <div
                key={p.coinId}
                className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-[14px] font-medium text-text-secondary">{p.symbol}</span>
                <div className="flex items-center gap-4">
                  {p.change24hPct != null && (
                    <span
                      className={`text-[13px] font-medium ${
                        p.change24hPct >= 0 ? "text-[#34D399]" : "text-[#EF4444]"
                      }`}
                    >
                      {p.change24hPct >= 0 ? "+" : ""}
                      {p.change24hPct.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-[15px] font-semibold text-text-primary">
                    ${p.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  {p.isStale && (
                    <span className="text-[11px] text-[#F59E0B]">(stale)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Active Vaults ─── */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">Active Vaults</h2>
            <button
              onClick={() => router.push("/dashboard/vaults")}
              className="text-[13px] text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Browse Vaults
            </button>
          </div>
          {userData?.stakedAssets.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-muted text-[14px]">
                No active positions yet.
              </p>
              <p className="text-text-dim text-[13px] mt-1">
                Connect your assets to a vault to start earning.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userData?.stakedAssets.map((a) => (
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
          )}
        </div>
      </main>
    </div>
  );
}

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
