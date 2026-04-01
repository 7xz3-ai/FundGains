"use client";

// app/dashboard/convert/page.tsx
// Simple Swap (Convert) interface — jargon-free token conversion.
// Uses "Convert" not "Swap." No slippage talk. Gasless via AA.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const ASSETS = ["ETH", "USDC", "cbBTC"];

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

export default function ConvertPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [fromAsset, setFromAsset] = useState("ETH");
  const [toAsset, setToAsset] = useState("USDC");
  const [fromAmount, setFromAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
    }, 500); // debounce
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
        setResult(
          `Converted ${data.fromAmount} ${data.fromAsset} → ${data.toAmount.toFixed(6)} ${data.toAsset}. +${data.xpEarned} XP earned!`
        );
        setFromAmount("");
        setQuote(null);
      } else {
        setResult(data.error ?? "Conversion failed");
      }
    } catch {
      setResult("Network error");
    }
    setExecuting(false);
  }

  function handleFlip() {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setQuote(null);
  }

  if (!isConnected) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen cyber-grid">
      <nav className="border-b border-[#1a1a2e] bg-[#050508]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-mono text-[#4a4a6a] hover:text-[#00ff88] transition-colors"
          >
            ← Dashboard
          </button>
          <span className="font-bold gradient-text">Convert</span>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Convert Assets</h1>
          <p className="text-sm text-[#4a4a6a] font-mono mt-1">
            Instantly convert between tokens. No gas fees.
          </p>
        </div>

        <div className="card p-6 space-y-4">
          {/* From */}
          <div>
            <label className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest">
              From
            </label>
            <div className="flex items-center gap-3 mt-2">
              <select
                value={fromAsset}
                onChange={(e) => setFromAsset(e.target.value)}
                className="bg-[#12121c] border border-[#1a1a2e] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00ff88]"
              >
                {ASSETS.filter((a) => a !== toAsset).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 bg-[#12121c] border border-[#1a1a2e] rounded-lg px-3 py-2 text-white font-mono text-lg text-right focus:outline-none focus:border-[#00ff88]"
              />
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="w-10 h-10 rounded-full border border-[#1a1a2e] bg-[#12121c] flex items-center justify-center text-[#8080a0] hover:text-[#00ff88] hover:border-[#00ff88] transition-colors"
            >
              ↕
            </button>
          </div>

          {/* To */}
          <div>
            <label className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest">
              To
            </label>
            <div className="flex items-center gap-3 mt-2">
              <select
                value={toAsset}
                onChange={(e) => setToAsset(e.target.value)}
                className="bg-[#12121c] border border-[#1a1a2e] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00ff88]"
              >
                {ASSETS.filter((a) => a !== fromAsset).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="flex-1 bg-[#12121c] border border-[#1a1a2e] rounded-lg px-3 py-2 text-right">
                <span className="text-lg font-mono text-white">
                  {loading
                    ? "..."
                    : quote
                    ? quote.toAmount.toFixed(6)
                    : "0.0"}
                </span>
              </div>
            </div>
          </div>

          {/* Quote Details */}
          {quote && (
            <div className="bg-[#12121c] rounded-lg p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#4a4a6a]">
                <span>Rate</span>
                <span className="text-white">
                  1 {fromAsset} = {quote.exchangeRate.toFixed(6)} {toAsset}
                </span>
              </div>
              <div className="flex justify-between text-[#4a4a6a]">
                <span>You Pay</span>
                <span className="text-white">${quote.fromValueUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#4a4a6a]">
                <span>You Receive</span>
                <span className="text-[#00ff88]">${quote.toValueUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#4a4a6a]">
                <span>Fee</span>
                <span className="text-white">{quote.fee}</span>
              </div>
              <div className="flex justify-between text-[#4a4a6a]">
                <span>Gas Fee</span>
                <span className="text-[#00ff88]">$0.00 (Sponsored)</span>
              </div>
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!quote || executing}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
              quote && !executing
                ? "bg-[#00ff88] text-[#050508] hover:bg-[#00cc6a]"
                : "bg-[#1a1a2e] text-[#4a4a6a] cursor-not-allowed"
            }`}
          >
            {executing
              ? "Converting..."
              : quote
              ? `Convert ${fromAsset} → ${toAsset}`
              : "Enter an amount"}
          </button>

          {/* Result */}
          {result && (
            <div className="text-center text-sm font-mono text-[#00ff88] bg-[#00ff88]/5 rounded-lg p-3">
              {result}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
