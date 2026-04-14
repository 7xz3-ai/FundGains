"use client";

// app/launchpool/page.tsx
// Apex Launchpool — Lock assets to earn Points or New Tokens.
// Live Reward Ticker with 60fps animation showing accruing rewards.
// Binance DNA meets Obsidian Liquid.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Pool {
  id: string;
  tokenName: string;
  ticker: string;
  color: string;
  totalPoolUsd: number;
  apyBps: number;
  lockDays: number;
  participants: number;
  rewardsPerDay: number;
  startsAt: string;
  endsAt: string;
  description: string;
}

const POOLS: Pool[] = [
  {
    id: "pool-apex",
    tokenName: "ApexToken",
    ticker: "APEX",
    color: "#2D9FFF",
    totalPoolUsd: 4_200_000,
    apyBps: 2400,
    lockDays: 30,
    participants: 12847,
    rewardsPerDay: 33333,
    startsAt: "2026-04-01",
    endsAt: "2026-05-01",
    description: "Lock USDC to earn APEX governance tokens. First community distribution event.",
  },
  {
    id: "pool-ybridge",
    tokenName: "YieldBridge",
    ticker: "YBDG",
    color: "#34D399",
    totalPoolUsd: 1_800_000,
    apyBps: 1800,
    lockDays: 14,
    participants: 5420,
    rewardsPerDay: 17857,
    startsAt: "2026-04-05",
    endsAt: "2026-04-19",
    description: "Stake ETH to earn YBDG tokens. Cross-chain yield aggregator launching on Base.",
  },
  {
    id: "pool-realstack",
    tokenName: "RealStack",
    ticker: "RSTK",
    color: "#F59E0B",
    totalPoolUsd: 8_500_000,
    apyBps: 1200,
    lockDays: 60,
    participants: 21300,
    rewardsPerDay: 8333,
    startsAt: "2026-03-15",
    endsAt: "2026-05-15",
    description: "Lock USDC for RSTK tokens. Tokenized real estate yield backed by commercial properties.",
  },
];

function RewardTicker({
  rewardsPerDay,
  ticker,
  color,
}: {
  rewardsPerDay: number;
  ticker: string;
  color: string;
}) {
  const [count, setCount] = useState(0);
  const startRef = useRef(Date.now());
  const frameRef = useRef<number>(0);

  const animate = useCallback(() => {
    const elapsed = (Date.now() - startRef.current) / 1000;
    const perSecond = rewardsPerDay / 86400;
    setCount(elapsed * perSecond);
    frameRef.current = requestAnimationFrame(animate);
  }, [rewardsPerDay]);

  useEffect(() => {
    startRef.current = Date.now();
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[20px] font-mono font-bold tabular-nums"
        style={{ color }}
      >
        {count.toFixed(4)}
      </span>
      <span className="text-[11px] font-medium text-white/40">{ticker}</span>
    </div>
  );
}

export default function LaunchpoolPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [lockAmount, setLockAmount] = useState("");

  useEffect(() => setMounted(true), []);

  function timeRemaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/launchpad")} className="text-[13px] text-text-muted hover:text-text-primary transition-colors">
              Launchpad
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Launchpool
          </h1>
          <p className="text-[14px] text-text-muted max-w-lg mx-auto">
            Lock your assets to earn new tokens before they launch. Zero fees, instant rewards.
          </p>
        </div>

        {/* Pool Cards */}
        <div className="space-y-5">
          {POOLS.map((pool) => {
            const isSelected = selectedPool === pool.id;
            const progress = Math.min(100, (pool.totalPoolUsd / 10_000_000) * 100);

            return (
              <div key={pool.id} className="card p-6 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Pool Info */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-[14px] font-bold text-white"
                        style={{ backgroundColor: pool.color }}
                      >
                        {pool.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <h2 className="text-[16px] font-bold text-text-primary">{pool.tokenName}</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-text-muted">${pool.ticker}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34D399]/10 text-[#34D399] font-bold">
                            {(pool.apyBps / 100).toFixed(0)}% APY
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[12px] text-text-secondary leading-relaxed">
                      {pool.description}
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
                        <p className="text-[9px] text-text-dim">Pool Size</p>
                        <p className="text-[13px] font-bold font-mono text-text-primary">
                          ${(pool.totalPoolUsd / 1_000_000).toFixed(1)}M
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
                        <p className="text-[9px] text-text-dim">Lock Period</p>
                        <p className="text-[13px] font-bold font-mono text-text-primary">
                          {pool.lockDays}d
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
                        <p className="text-[9px] text-text-dim">Stakers</p>
                        <p className="text-[13px] font-bold font-mono text-text-primary">
                          {pool.participants.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Rewards + Lock */}
                  <div className="lg:col-span-4 flex flex-col justify-center space-y-4">
                    {/* Live Reward Ticker */}
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 text-center">
                      <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">
                        Rewards Accruing Now
                      </p>
                      <RewardTicker
                        rewardsPerDay={pool.rewardsPerDay}
                        ticker={pool.ticker}
                        color={pool.color}
                      />
                      <p className="text-[10px] text-text-dim mt-2">
                        {pool.rewardsPerDay.toLocaleString()} {pool.ticker}/day distributed
                      </p>
                    </div>

                    {/* Pool progress */}
                    <div>
                      <div className="flex justify-between text-[10px] text-text-dim mb-1">
                        <span>Pool Progress</span>
                        <span>{timeRemaining(pool.endsAt)} remaining</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, backgroundColor: pool.color }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lock Action */}
                  <div className="lg:col-span-3 flex flex-col justify-center space-y-3">
                    {isSelected ? (
                      <>
                        <input
                          type="number"
                          placeholder="Amount (USD)"
                          className="input-field text-[14px] py-3"
                          value={lockAmount}
                          onChange={(e) => setLockAmount(e.target.value)}
                        />
                        <button
                          className="w-full py-3 rounded-xl text-[13px] font-bold text-white transition-all"
                          style={{ backgroundColor: pool.color }}
                        >
                          Lock for {pool.lockDays} Days
                        </button>
                        <button
                          onClick={() => setSelectedPool(null)}
                          className="text-[11px] text-text-dim hover:text-text-muted text-center"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {isConnected ? (
                          <button
                            onClick={() => {
                              setSelectedPool(pool.id);
                              setLockAmount("");
                            }}
                            className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: pool.color }}
                          >
                            Lock & Earn {pool.ticker}
                          </button>
                        ) : (
                          <ConnectButton />
                        )}
                        <p className="text-[10px] text-text-dim text-center">
                          Earn up to {(pool.apyBps / 100).toFixed(0)}% APY
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <button onClick={() => router.push("/dashboard")} className="text-[13px] text-text-muted hover:text-text-primary transition-colors">
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
