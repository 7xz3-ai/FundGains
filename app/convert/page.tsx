"use client";

// app/convert/page.tsx
// Pro-Trader Convert page with Market Swap, Limit Orders, Price Impact,
// Slippage Settings, Mini-Chart, and Token Selector.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import MiniChart from "@/components/trading/MiniChart";
import TokenSelector, { type Token } from "@/components/trading/TokenSelector";

// ─── Types ───

type OrderMode = "market" | "limit";
type SlippageOption = "auto" | "0.1" | "0.5" | "1.0";

interface Quote {
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fromValueUsd: number;
  toValueUsd: number;
  conversionImpact: string;
  fee: string;
}

const DEFAULT_FROM: Token = { symbol: "ETH", name: "Ethereum", color: "#627EEA" };
const DEFAULT_TO: Token = { symbol: "USDC", name: "USD Coin", color: "#2775CA" };

export default function ConvertPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // ─── State ───
  const [mode, setMode] = useState<OrderMode>("market");
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_FROM);
  const [toToken, setToToken] = useState<Token>(DEFAULT_TO);
  const [fromAmount, setFromAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState<SlippageOption>("auto");
  const [showChart, setShowChart] = useState(false);

  // Token selector
  const [selectorOpen, setSelectorOpen] = useState<"from" | "to" | null>(null);

  // ─── Redirect ───
  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  // ─── Fetch Quote ───
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setQuote(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/swap?fromAsset=${fromToken.symbol}&toAsset=${toToken.symbol}&fromAmount=${fromAmount}`
        );
        if (res.ok) setQuote(await res.json());
        else setQuote(null);
      } catch {
        setQuote(null);
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [fromToken.symbol, toToken.symbol, fromAmount]);

  // ─── Price Impact ───
  const priceImpact = quote
    ? Math.abs(
        ((quote.toValueUsd - quote.fromValueUsd) / quote.fromValueUsd) * 100
      )
    : 0;
  const highImpact = priceImpact > 2;

  // ─── Slippage value ───
  const slippageValue = slippage === "auto" ? 0.5 : parseFloat(slippage);

  // ─── Execute ───
  async function handleConvert() {
    if (!address || !quote) return;
    setExecuting(true);
    setResult(null);
    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          fromAsset: fromToken.symbol,
          toAsset: toToken.symbol,
          fromAmount: parseFloat(fromAmount),
          orderType: mode,
          limitPrice: mode === "limit" ? parseFloat(limitPrice) : undefined,
          slippageTolerance: slippageValue,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          message:
            mode === "limit"
              ? `Limit order placed: ${data.fromAmount ?? fromAmount} ${fromToken.symbol} → ${toToken.symbol} @ ${limitPrice}`
              : `Converted ${data.fromAmount} ${data.fromAsset} → ${data.toAmount?.toFixed(6) ?? "?"} ${data.toAsset}`,
        });
        setFromAmount("");
        setQuote(null);
      } else {
        setResult({ success: false, message: data.error ?? "Failed" });
      }
    } catch {
      setResult({ success: false, message: "Network error. Try again." });
    }
    setExecuting(false);
  }

  function handleFlip() {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuote(null);
  }

  const handleTokenSelect = useCallback(
    (token: Token) => {
      if (selectorOpen === "from") {
        if (token.symbol === toToken.symbol) {
          setToToken(fromToken);
        }
        setFromToken(token);
      } else {
        if (token.symbol === fromToken.symbol) {
          setFromToken(toToken);
        }
        setToToken(token);
      }
      setQuote(null);
    },
    [selectorOpen, fromToken, toToken]
  );

  if (!isConnected) return null;

  const pair = `${fromToken.symbol}/${toToken.symbol}`;

  return (
    <div className="min-h-screen bg-mesh">
      {/* Navigation */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
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
              onClick={() => router.push("/liquidity")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Liquidity
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Convert
          </h1>
          <p className="text-[15px] text-text-muted">
            Swap tokens instantly or set limit orders.
          </p>
        </div>

        {/* ─── Mode Tabs ─── */}
        <div className="flex items-center justify-center gap-1 mb-6">
          <div className="flex rounded-2xl bg-white/[0.03] border border-white/[0.04] p-1">
            {(["market", "limit"] as OrderMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  mode === m
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {m === "market" ? "Market Swap" : "Limit Order"}
              </button>
            ))}
          </div>

          {/* Settings Cog */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`ml-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showSettings
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-white/[0.04] border border-white/[0.06] text-text-muted hover:text-text-primary"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Chart Toggle */}
          <button
            onClick={() => setShowChart(!showChart)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showChart
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-white/[0.04] border border-white/[0.06] text-text-muted hover:text-text-primary"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
              <polyline points="16,7 22,7 22,13" />
            </svg>
          </button>
        </div>

        {/* ─── Slippage Settings Panel ─── */}
        {showSettings && (
          <div className="card p-5 mb-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-text-primary">
                Slippage Tolerance
              </h3>
              <span className="text-[12px] text-text-dim">
                Current: {slippage === "auto" ? "Auto (0.5%)" : `${slippage}%`}
              </span>
            </div>
            <div className="flex gap-2">
              {(["auto", "0.1", "0.5", "1.0"] as SlippageOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSlippage(opt)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    slippage === opt
                      ? "bg-accent text-white shadow-sm shadow-accent/20"
                      : "bg-white/[0.03] border border-white/[0.04] text-text-muted hover:text-text-primary"
                  }`}
                >
                  {opt === "auto" ? "Auto" : `${opt}%`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-dim mt-3">
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </p>
          </div>
        )}

        {/* ─── Mini Chart ─── */}
        <div className="mb-4">
          <MiniChart pair={pair} visible={showChart} />
        </div>

        {/* ─── Swap Card ─── */}
        <div className="card p-8 space-y-5">
          {/* From */}
          <div>
            <label className="text-[13px] text-text-muted font-medium mb-3 block">
              You pay
            </label>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] focus-within:border-accent/30 transition-colors">
              <button
                onClick={() => setSelectorOpen("from")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-colors flex-shrink-0"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: fromToken.color }}
                >
                  {fromToken.symbol[0]}
                </div>
                <span className="text-[14px] font-semibold text-text-primary">
                  {fromToken.symbol}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 bg-transparent text-right text-2xl font-semibold text-text-primary placeholder-text-dim focus:outline-none min-w-0"
              />
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center -my-1">
            <button
              onClick={handleFlip}
              className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-accent hover:border-accent/20 transition-all hover:scale-105"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="7,3 7,21" />
                <polyline points="3,7 7,3 11,7" />
                <polyline points="17,21 17,3" />
                <polyline points="13,17 17,21 21,17" />
              </svg>
            </button>
          </div>

          {/* To */}
          <div>
            <label className="text-[13px] text-text-muted font-medium mb-3 block">
              You receive
            </label>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <button
                onClick={() => setSelectorOpen("to")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-colors flex-shrink-0"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: toToken.color }}
                >
                  {toToken.symbol[0]}
                </div>
                <span className="text-[14px] font-semibold text-text-primary">
                  {toToken.symbol}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              <div className="flex-1 text-right">
                <span className="text-2xl font-semibold text-text-primary">
                  {loading ? (
                    <span className="text-text-dim animate-pulse">...</span>
                  ) : mode === "limit" && limitPrice && fromAmount ? (
                    (parseFloat(fromAmount) * parseFloat(limitPrice || "0")).toFixed(6)
                  ) : quote ? (
                    quote.toAmount.toFixed(6)
                  ) : (
                    <span className="text-text-dim">0.00</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Limit Price Input */}
          {mode === "limit" && (
            <div>
              <label className="text-[13px] text-text-muted font-medium mb-3 block">
                Limit Price ({toToken.symbol} per {fromToken.symbol})
              </label>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] focus-within:border-accent/30 transition-colors">
                <input
                  type="number"
                  placeholder={quote ? quote.exchangeRate.toFixed(4) : "0.00"}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-transparent text-xl font-semibold text-text-primary placeholder-text-dim focus:outline-none"
                />
              </div>
              <p className="text-[12px] text-text-dim mt-2 ml-1">
                Order executes when {fromToken.symbol} reaches this price.
                {quote && (
                  <span className="text-text-muted">
                    {" "}Current rate: {quote.exchangeRate.toFixed(4)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Quote Details */}
          {quote && mode === "market" && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2.5">
              <QuoteRow
                label="Exchange Rate"
                value={`1 ${fromToken.symbol} = ${quote.exchangeRate.toFixed(6)} ${toToken.symbol}`}
              />
              <QuoteRow
                label="You Pay (USD)"
                value={`$${quote.fromValueUsd.toFixed(2)}`}
              />
              <QuoteRow
                label="You Receive (USD)"
                value={`$${quote.toValueUsd.toFixed(2)}`}
                accent
              />

              {/* Price Impact */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-muted">Price Impact</span>
                <span
                  className={`text-[13px] font-semibold px-2 py-0.5 rounded-lg ${
                    highImpact
                      ? "text-[#EF4444] bg-[#EF4444]/10"
                      : priceImpact > 1
                      ? "text-[#F59E0B] bg-[#F59E0B]/10"
                      : "text-[#34D399] bg-[#34D399]/10"
                  }`}
                >
                  {priceImpact.toFixed(2)}%
                </span>
              </div>

              <QuoteRow
                label="Slippage Tolerance"
                value={slippage === "auto" ? "Auto (0.5%)" : `${slippage}%`}
              />
              <QuoteRow label="Platform Fee" value={quote.fee} />
              <QuoteRow label="Network Fee" value="$0.00 (Sponsored)" accent />
            </div>
          )}

          {/* High Impact Warning */}
          {highImpact && mode === "market" && quote && (
            <div className="rounded-2xl bg-[#EF4444]/5 border border-[#EF4444]/10 p-4 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-[13px] font-semibold text-[#EF4444]">
                  High Price Impact
                </p>
                <p className="text-[12px] text-[#EF4444]/70 mt-0.5">
                  This trade will move the price by {priceImpact.toFixed(2)}%. Consider reducing the amount or using a limit order.
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleConvert}
            disabled={
              mode === "market"
                ? !quote || executing
                : !fromAmount || !limitPrice || executing
            }
            className={`w-full py-4 rounded-2xl font-semibold text-[15px] transition-all ${
              (mode === "market" ? quote : fromAmount && limitPrice) && !executing
                ? highImpact
                  ? "bg-[#EF4444] text-white hover:bg-[#DC2626]"
                  : "btn-primary"
                : "bg-white/[0.04] text-text-dim cursor-not-allowed"
            }`}
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === "limit" ? "Placing Order..." : "Converting..."}
              </span>
            ) : mode === "limit" ? (
              fromAmount && limitPrice
                ? `Place Limit Order`
                : "Enter amount and price"
            ) : highImpact ? (
              "Swap Anyway (High Impact)"
            ) : quote ? (
              `Convert ${fromToken.symbol} → ${toToken.symbol}`
            ) : (
              "Enter an amount"
            )}
          </button>

          {/* Result */}
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
      </main>

      {/* Token Selector Modal */}
      <TokenSelector
        isOpen={selectorOpen !== null}
        onClose={() => setSelectorOpen(null)}
        onSelect={handleTokenSelect}
        excludeSymbol={selectorOpen === "from" ? toToken.symbol : fromToken.symbol}
      />
    </div>
  );
}

function QuoteRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span
        className={`text-[13px] font-medium ${
          accent ? "text-[#34D399]" : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
