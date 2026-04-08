"use client";

// app/bots/page.tsx
// AI Trading Bot Marketplace — Grid Trading, DCA, Arbitrage.
// Each bot has a Backtest button simulating 30-day performance.
// Obsidian Liquid design.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface BotConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
  color: string;
  riskLevel: string;
  minCapital: number;
  monthlyReturn: { min: number; max: number };
  winRate: number;
  trades30d: number;
  features: string[];
}

const BOTS: BotConfig[] = [
  {
    id: "grid",
    name: "Grid Trading",
    type: "GRID",
    description:
      "Automatically places buy and sell orders at preset intervals within a price range. Profits from volatility without predicting direction.",
    icon: "|||",
    color: "#00F3FF",
    riskLevel: "Medium",
    minCapital: 500,
    monthlyReturn: { min: 3, max: 12 },
    winRate: 72,
    trades30d: 847,
    features: [
      "Auto grid placement",
      "Range-bound profit capture",
      "Stop-loss protection",
      "Dynamic grid rebalancing",
    ],
  },
  {
    id: "dca",
    name: "DCA Bot",
    type: "DCA",
    description:
      "Dollar-Cost Averaging on autopilot. Buys at regular intervals regardless of price, reducing average entry cost over time.",
    icon: "$\u2193",
    color: "#34D399",
    riskLevel: "Low",
    minCapital: 100,
    monthlyReturn: { min: 1, max: 8 },
    winRate: 85,
    trades30d: 120,
    features: [
      "Scheduled purchases",
      "Multi-asset support",
      "Safety orders on dips",
      "Portfolio auto-rebalance",
    ],
  },
  {
    id: "arb",
    name: "Arbitrage Bot",
    type: "ARB",
    description:
      "Exploits price differences across DEXs and pools in real-time. Near-zero directional risk with consistent micro-profits.",
    icon: "\u21C4",
    color: "#F59E0B",
    riskLevel: "Low-Medium",
    minCapital: 2000,
    monthlyReturn: { min: 2, max: 6 },
    winRate: 94,
    trades30d: 3200,
    features: [
      "Cross-DEX scanning",
      "Flash loan integration",
      "MEV protection",
      "Gas optimization",
    ],
  },
];

interface BacktestResult {
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  winRate: number;
  dailyReturns: number[];
}

function simulateBacktest(bot: BotConfig): BacktestResult {
  const avgReturn = (bot.monthlyReturn.min + bot.monthlyReturn.max) / 2;
  const dailyReturn = avgReturn / 30;
  const returns: number[] = [];
  let cumulative = 0;
  let maxDD = 0;
  let peak = 0;

  for (let i = 0; i < 30; i++) {
    const r = dailyReturn * (0.5 + Math.random()) - dailyReturn * 0.15;
    cumulative += r;
    returns.push(parseFloat(cumulative.toFixed(2)));
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    totalReturn: parseFloat(cumulative.toFixed(2)),
    maxDrawdown: parseFloat(maxDD.toFixed(2)),
    sharpeRatio: parseFloat((cumulative / Math.max(maxDD, 0.1) * 0.8).toFixed(2)),
    totalTrades: bot.trades30d + Math.floor(Math.random() * 100),
    winRate: bot.winRate + parseFloat((Math.random() * 4 - 2).toFixed(1)),
    dailyReturns: returns,
  };
}

export default function BotsPage() {
  const router = useRouter();
  const [backtestResults, setBacktestResults] = useState<Record<string, BacktestResult>>({});
  const [backtesting, setBacktesting] = useState<string | null>(null);

  async function handleBacktest(bot: BotConfig) {
    setBacktesting(bot.id);
    // Simulate computation delay
    await new Promise((r) => setTimeout(r, 1200));
    const result = simulateBacktest(bot);
    setBacktestResults((prev) => ({ ...prev, [bot.id]: result }));
    setBacktesting(null);
  }

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/trade")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Trade
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Bot Marketplace
          </h1>
          <p className="text-[14px] text-text-muted max-w-lg mx-auto">
            Deploy AI-powered trading strategies. Backtest before you commit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {BOTS.map((bot) => {
            const result = backtestResults[bot.id];

            return (
              <div key={bot.id} className="card p-6 space-y-5 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-[16px] font-bold"
                      style={{ backgroundColor: `${bot.color}15`, color: bot.color, border: `1px solid ${bot.color}30` }}
                    >
                      {bot.icon}
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-text-primary">{bot.name}</h2>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${bot.color}15`, color: bot.color }}
                      >
                        {bot.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  {bot.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                    <p className="text-[9px] text-text-dim">Monthly</p>
                    <p className="text-[13px] font-bold text-[#34D399]">
                      {bot.monthlyReturn.min}-{bot.monthlyReturn.max}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                    <p className="text-[9px] text-text-dim">Win Rate</p>
                    <p className="text-[13px] font-bold text-text-primary">{bot.winRate}%</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                    <p className="text-[9px] text-text-dim">Min</p>
                    <p className="text-[13px] font-bold text-text-primary">${bot.minCapital}</p>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1.5">
                  {bot.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[11px] text-text-muted">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: bot.color }} />
                      {f}
                    </div>
                  ))}
                </div>

                {/* Backtest result */}
                {result && (
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-3">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      30-Day Backtest
                    </p>
                    {/* Mini equity curve */}
                    <div className="h-12 flex items-end gap-[2px]">
                      {result.dailyReturns.map((r, i) => {
                        const maxR = Math.max(...result.dailyReturns.map(Math.abs), 1);
                        const height = Math.abs(r) / maxR * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm"
                            style={{
                              height: `${Math.max(4, height)}%`,
                              backgroundColor: r >= 0 ? "#34D399" : "#EF4444",
                              opacity: 0.6 + (i / 30) * 0.4,
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-text-dim">Return: </span>
                        <span className={result.totalReturn >= 0 ? "text-[#34D399] font-bold" : "text-[#EF4444] font-bold"}>
                          {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn}%
                        </span>
                      </div>
                      <div>
                        <span className="text-text-dim">Max DD: </span>
                        <span className="text-[#EF4444] font-bold">-{result.maxDrawdown}%</span>
                      </div>
                      <div>
                        <span className="text-text-dim">Sharpe: </span>
                        <span className="text-text-primary font-bold">{result.sharpeRatio}</span>
                      </div>
                      <div>
                        <span className="text-text-dim">Trades: </span>
                        <span className="text-text-primary font-bold">{result.totalTrades}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => handleBacktest(bot)}
                    disabled={backtesting === bot.id}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold border transition-all"
                    style={{
                      borderColor: `${bot.color}30`,
                      color: bot.color,
                      backgroundColor: `${bot.color}08`,
                    }}
                  >
                    {backtesting === bot.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div
                          className="w-3 h-3 border-2 rounded-full animate-spin"
                          style={{ borderColor: `${bot.color}30`, borderTopColor: bot.color }}
                        />
                        Simulating...
                      </span>
                    ) : (
                      "Backtest 30d"
                    )}
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white"
                    style={{ backgroundColor: bot.color }}
                  >
                    Deploy Bot
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
