"use client";

// app/convert/page.tsx
// Simple Swap Engine — minimalist, jargon-free token conversion.
// Uses "Estimated Exchange Rate" instead of "Slippage."
// Massive, clean input fields. Premium fintech feel.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const ASSETS = [
  { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { symbol: "SOL", name: "Solana", color: "#9945FF" },
];

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

export default function SimpleSwapPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [fromAsset, setFromAsset] = useState("ETH");
  const [toAsset, setToAsset] = useState("USDC");
  const [fromAmount, setFromAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch quote on input change
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setQuote(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/swap?fromAsset=${fromAsset}&toAsset=${toAsset}&fromAmount=${fromAmount}`
        );
        if (res.ok) setQuote(await res.json());
        else setQuote(null);
      } catch {
        setQuote(null);
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [fromAsset, toAsset, fromAmount]);

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
          fromAsset,
          toAsset,
          fromAmount: parseFloat(fromAmount),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          message: `Successfully converted ${data.fromAmount} ${data.fromAsset} to ${data.toAmount.toFixed(6)} ${data.toAsset}`,
        });
        setFromAmount("");
        setQuote(null);
      } else {
        setResult({ success: false, message: data.error ?? "Conversion failed" });
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    }
    setExecuting(false);
  }

  function handleFlip() {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setQuote(null);
  }

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  const fromMeta = ASSETS.find((a) => a.symbol === fromAsset);
  const toMeta = ASSETS.find((a) => a.symbol === toAsset);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Navigation */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Dashboard
          </button>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Convert
          </h1>
          <p className="text-[15px] text-text-muted">
            Instantly convert between tokens. No gas fees.
          </p>
        </div>

        <div className="card p-8 space-y-6">
          {/* From Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] text-text-muted font-medium">You pay</label>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] focus-within:border-accent/30 transition-colors">
              <select
                value={fromAsset}
                onChange={(e) => setFromAsset(e.target.value)}
                className="bg-transparent text-text-primary font-semibold text-[15px] focus:outline-none cursor-pointer appearance-none pr-1"
              >
                {ASSETS.filter((a) => a.symbol !== toAsset).map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-[#0d0d14]">
                    {a.symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 bg-transparent text-right text-2xl font-semibold text-text-primary placeholder-text-dim focus:outline-none"
              />
            </div>
            {fromMeta && (
              <p className="text-[12px] text-text-dim mt-2 ml-1">{fromMeta.name}</p>
            )}
          </div>

          {/* Flip Button */}
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

          {/* To Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] text-text-muted font-medium">You receive</label>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <select
                value={toAsset}
                onChange={(e) => setToAsset(e.target.value)}
                className="bg-transparent text-text-primary font-semibold text-[15px] focus:outline-none cursor-pointer appearance-none pr-1"
              >
                {ASSETS.filter((a) => a.symbol !== fromAsset).map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-[#0d0d14]">
                    {a.symbol}
                  </option>
                ))}
              </select>
              <div className="flex-1 text-right">
                <span className="text-2xl font-semibold text-text-primary">
                  {loading ? (
                    <span className="text-text-dim animate-pulse">...</span>
                  ) : quote ? (
                    quote.toAmount.toFixed(6)
                  ) : (
                    <span className="text-text-dim">0.00</span>
                  )}
                </span>
              </div>
            </div>
            {toMeta && (
              <p className="text-[12px] text-text-dim mt-2 ml-1">{toMeta.name}</p>
            )}
          </div>

          {/* Quote Details */}
          {quote && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2.5">
              <QuoteRow
                label="Estimated Exchange Rate"
                value={`1 ${fromAsset} = ${quote.exchangeRate.toFixed(6)} ${toAsset}`}
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
              <QuoteRow label="Platform Fee" value={quote.fee} />
              <QuoteRow label="Network Fee" value="$0.00 (Sponsored)" accent />
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!quote || executing}
            className={`w-full py-4 rounded-2xl font-semibold text-[15px] transition-all ${
              quote && !executing
                ? "btn-primary"
                : "bg-white/[0.04] text-text-dim cursor-not-allowed"
            }`}
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Converting...
              </span>
            ) : quote ? (
              `Convert ${fromAsset} to ${toAsset}`
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
