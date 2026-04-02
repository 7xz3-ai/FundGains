"use client";

// app/liquidity/page.tsx
// DeFi Liquidity page: deposit token pairs to create LP tokens,
// manage positions, and view accrued trading fees.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import TokenSelector, { type Token } from "@/components/trading/TokenSelector";

// ─── Types ───

interface LPPosition {
  id: string;
  tokenA: string;
  tokenB: string;
  colorA: string;
  colorB: string;
  amountA: number;
  amountB: number;
  lpTokens: number;
  sharePercent: number;
  feesEarnedUsd: number;
  valueUsd: number;
  apy: number;
  createdAt: string;
}

// ─── Simulated Positions ───

const MOCK_POSITIONS: LPPosition[] = [
  {
    id: "lp-1",
    tokenA: "ETH",
    tokenB: "USDC",
    colorA: "#627EEA",
    colorB: "#2775CA",
    amountA: 0.5,
    amountB: 1750,
    lpTokens: 29.58,
    sharePercent: 0.0012,
    feesEarnedUsd: 14.32,
    valueUsd: 3514.32,
    apy: 12.4,
    createdAt: "2026-03-15",
  },
  {
    id: "lp-2",
    tokenA: "ETH",
    tokenB: "SOL",
    colorA: "#627EEA",
    colorB: "#9945FF",
    amountA: 0.2,
    amountB: 5.0,
    lpTokens: 1.0,
    sharePercent: 0.0003,
    feesEarnedUsd: 3.18,
    valueUsd: 1403.18,
    apy: 8.7,
    createdAt: "2026-03-22",
  },
];

const DEFAULT_A: Token = { symbol: "ETH", name: "Ethereum", color: "#627EEA" };
const DEFAULT_B: Token = { symbol: "USDC", name: "USD Coin", color: "#2775CA" };

export default function LiquidityPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [tab, setTab] = useState<"add" | "manage">("add");
  const [tokenA, setTokenA] = useState<Token>(DEFAULT_A);
  const [tokenB, setTokenB] = useState<Token>(DEFAULT_B);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [positions, setPositions] = useState<LPPosition[]>(MOCK_POSITIONS);
  const [selectorOpen, setSelectorOpen] = useState<"a" | "b" | null>(null);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  // Auto-calculate paired amount (simplified 1:3500 ETH/USDC ratio)
  useEffect(() => {
    if (!amountA || parseFloat(amountA) <= 0) {
      setAmountB("");
      return;
    }
    const ratios: Record<string, number> = {
      "ETH/USDC": 3500,
      "ETH/SOL": 25,
      "USDC/ETH": 1 / 3500,
      "USDC/SOL": 1 / 140,
      "SOL/ETH": 1 / 25,
      "SOL/USDC": 140,
    };
    const pair = `${tokenA.symbol}/${tokenB.symbol}`;
    const ratio = ratios[pair] ?? 1;
    setAmountB((parseFloat(amountA) * ratio).toFixed(4));
  }, [amountA, tokenA.symbol, tokenB.symbol]);

  async function handleAddLiquidity() {
    if (!amountA || !amountB || parseFloat(amountA) <= 0) return;
    setAdding(true);
    setResult(null);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));

    const newPos: LPPosition = {
      id: `lp-${Date.now()}`,
      tokenA: tokenA.symbol,
      tokenB: tokenB.symbol,
      colorA: tokenA.color,
      colorB: tokenB.color,
      amountA: parseFloat(amountA),
      amountB: parseFloat(amountB),
      lpTokens: parseFloat((Math.sqrt(parseFloat(amountA) * parseFloat(amountB))).toFixed(4)),
      sharePercent: 0.0001,
      feesEarnedUsd: 0,
      valueUsd: parseFloat(amountA) * 3500 + parseFloat(amountB),
      apy: 10 + Math.random() * 5,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setPositions((prev) => [newPos, ...prev]);
    setResult({
      success: true,
      message: `Added ${amountA} ${tokenA.symbol} + ${amountB} ${tokenB.symbol} to pool. Received ${newPos.lpTokens.toFixed(4)} LP tokens.`,
    });
    setAmountA("");
    setAmountB("");
    setAdding(false);
  }

  function handleRemoveLiquidity(id: string) {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setResult({
      success: true,
      message: "Liquidity removed. Tokens returned to your wallet.",
    });
  }

  function handleTokenSelect(token: Token) {
    if (selectorOpen === "a") {
      if (token.symbol === tokenB.symbol) setTokenB(tokenA);
      setTokenA(token);
    } else {
      if (token.symbol === tokenA.symbol) setTokenA(tokenB);
      setTokenB(token);
    }
    setAmountA("");
    setAmountB("");
  }

  if (!isConnected) return null;

  const totalValueUsd = positions.reduce((s, p) => s + p.valueUsd, 0);
  const totalFeesUsd = positions.reduce((s, p) => s + p.feesEarnedUsd, 0);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Dashboard
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/convert")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Convert
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Liquidity
          </h1>
          <p className="text-[15px] text-text-muted">
            Provide liquidity, earn trading fees.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-6 text-center">
            <p className="text-[12px] text-text-dim mb-1">Total Value</p>
            <p className="text-xl font-bold text-text-primary">
              ${totalValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-[12px] text-text-dim mb-1">Fees Earned</p>
            <p className="text-xl font-bold gradient-text-green">
              +${totalFeesUsd.toFixed(2)}
            </p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-[12px] text-text-dim mb-1">Active Pools</p>
            <p className="text-xl font-bold text-text-primary">
              {positions.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-white/[0.03] border border-white/[0.04] p-1 mb-6">
          {(["add", "manage"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                tab === t
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t === "add" ? "Add Liquidity" : `Manage Positions (${positions.length})`}
            </button>
          ))}
        </div>

        {/* ─── Add Liquidity ─── */}
        {tab === "add" && (
          <div className="card p-8 space-y-5">
            {/* Token A */}
            <div>
              <label className="text-[13px] text-text-muted font-medium mb-3 block">
                First Token
              </label>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] focus-within:border-accent/30 transition-colors">
                <button
                  onClick={() => setSelectorOpen("a")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-colors flex-shrink-0"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: tokenA.color }}
                  >
                    {tokenA.symbol[0]}
                  </div>
                  <span className="text-[14px] font-semibold text-text-primary">
                    {tokenA.symbol}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </button>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  className="flex-1 bg-transparent text-right text-xl font-semibold text-text-primary placeholder-text-dim focus:outline-none min-w-0"
                />
              </div>
            </div>

            {/* Plus Icon */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-dim">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>

            {/* Token B */}
            <div>
              <label className="text-[13px] text-text-muted font-medium mb-3 block">
                Second Token
              </label>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <button
                  onClick={() => setSelectorOpen("b")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-colors flex-shrink-0"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: tokenB.color }}
                  >
                    {tokenB.symbol[0]}
                  </div>
                  <span className="text-[14px] font-semibold text-text-primary">
                    {tokenB.symbol}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </button>
                <div className="flex-1 text-right">
                  <span className="text-xl font-semibold text-text-secondary">
                    {amountB || "0.00"}
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-text-dim mt-2 ml-1">
                Auto-calculated based on current pool ratio
              </p>
            </div>

            {/* Pool Info */}
            {amountA && parseFloat(amountA) > 0 && (
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[13px] text-text-muted">Pool</span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {tokenA.symbol}/{tokenB.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-text-muted">LP Tokens</span>
                  <span className="text-[13px] font-medium text-text-primary">
                    ~{Math.sqrt(parseFloat(amountA) * parseFloat(amountB || "0")).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-text-muted">Est. APY</span>
                  <span className="text-[13px] font-medium gradient-text-green">
                    ~{(10 + Math.random() * 5).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-text-muted">Pool Share</span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {"<"}0.01%
                  </span>
                </div>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={handleAddLiquidity}
              disabled={!amountA || parseFloat(amountA) <= 0 || adding}
              className={`w-full py-4 rounded-2xl font-semibold text-[15px] transition-all ${
                amountA && parseFloat(amountA) > 0 && !adding
                  ? "btn-primary"
                  : "bg-white/[0.04] text-text-dim cursor-not-allowed"
              }`}
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding Liquidity...
                </span>
              ) : amountA && parseFloat(amountA) > 0 ? (
                `Add ${tokenA.symbol} + ${tokenB.symbol} Liquidity`
              ) : (
                "Enter an amount"
              )}
            </button>

            {result && (
              <div
                className={`text-center text-[14px] rounded-2xl p-4 ${
                  result.success
                    ? "text-[#34D399] bg-[#34D399]/5 border border-[#34D399]/10"
                    : "text-[#EF4444] bg-[#EF4444]/5 border border-[#EF4444]/10"
                }`}
              >
                {result.message}
              </div>
            )}
          </div>
        )}

        {/* ─── Manage Positions ─── */}
        {tab === "manage" && (
          <div className="space-y-4">
            {positions.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-text-muted text-[14px]">No active positions.</p>
                <p className="text-text-dim text-[13px] mt-1">
                  Add liquidity to start earning trading fees.
                </p>
                <button
                  onClick={() => setTab("add")}
                  className="btn-primary text-[13px] px-5 py-2.5 mt-4"
                >
                  Add Liquidity
                </button>
              </div>
            ) : (
              positions.map((pos) => (
                <div key={pos.id} className="card p-6">
                  {/* Pair Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white border-2 border-[#0d0d14] z-10"
                          style={{ backgroundColor: pos.colorA }}
                        >
                          {pos.tokenA[0]}
                        </div>
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white border-2 border-[#0d0d14]"
                          style={{ backgroundColor: pos.colorB }}
                        >
                          {pos.tokenB[0]}
                        </div>
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-text-primary">
                          {pos.tokenA}/{pos.tokenB}
                        </p>
                        <p className="text-[12px] text-text-dim">
                          Added {pos.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-text-primary">
                        ${pos.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[12px] font-medium gradient-text-green">
                        {pos.apy.toFixed(1)}% APY
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="rounded-xl bg-white/[0.02] p-3">
                      <p className="text-[11px] text-text-dim mb-0.5">{pos.tokenA}</p>
                      <p className="text-[14px] font-semibold text-text-primary">
                        {pos.amountA.toFixed(4)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] p-3">
                      <p className="text-[11px] text-text-dim mb-0.5">{pos.tokenB}</p>
                      <p className="text-[14px] font-semibold text-text-primary">
                        {pos.amountB.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] p-3">
                      <p className="text-[11px] text-text-dim mb-0.5">LP Tokens</p>
                      <p className="text-[14px] font-semibold text-text-primary">
                        {pos.lpTokens.toFixed(4)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#34D399]/5 p-3">
                      <p className="text-[11px] text-text-dim mb-0.5">Fees Earned</p>
                      <p className="text-[14px] font-semibold text-[#34D399]">
                        +${pos.feesEarnedUsd.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRemoveLiquidity(pos.id)}
                      className="flex-1 py-2.5 rounded-xl btn-secondary text-[13px]"
                    >
                      Remove Liquidity
                    </button>
                    <button className="flex-1 py-2.5 rounded-xl btn-primary text-[13px]">
                      Add More
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Token Selector */}
      <TokenSelector
        isOpen={selectorOpen !== null}
        onClose={() => setSelectorOpen(null)}
        onSelect={handleTokenSelect}
        excludeSymbol={selectorOpen === "a" ? tokenB.symbol : tokenA.symbol}
      />
    </div>
  );
}
