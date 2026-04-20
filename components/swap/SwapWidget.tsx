"use client";

// components/swap/SwapWidget.tsx
// Real-world swap execution UI component
// Integrates 1inch for live quotes and on-chain execution

import React, { useState } from "react";
import { useSwap1Inch } from "@/hooks/useSwap1Inch";
import { ArrowRightLeft, AlertCircle, CheckCircle, Loader } from "lucide-react";

interface SwapWidgetProps {
  userId: string;
  defaultFromToken?: string;
  defaultToToken?: string;
}

export default function SwapWidget({
  userId,
  defaultFromToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  defaultToToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
}: SwapWidgetProps) {
  const [fromToken, setFromToken] = useState(defaultFromToken);
  const [toToken, setToToken] = useState(defaultToToken);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [step, setStep] = useState<"input" | "approve" | "swap" | "complete">("input");

  const {
    quote,
    isLoadingQuote,
    isApproving,
    isSwapping,
    txHash,
    error,
    approveToken,
    executeSwap,
  } = useSwap1Inch(userId, fromToken, toToken, amount);

  const handleApprove = async () => {
    setStep("approve");
    await approveToken();
    setStep("swap");
  };

  const handleSwap = async () => {
    setStep("swap");
    await executeSwap();
    if (txHash) {
      setStep("complete");
    }
  };

  const swapReady = quote && amount && parseFloat(amount) > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card Container */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        {/* Header */}
        <h2 className="text-xl font-bold text-white mb-6">Swap Tokens</h2>

        {/* From Token */}
        <div className="mb-4">
          <label className="block text-sm text-white/60 mb-2">From</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48">USDC</option>
              <option value="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2">WETH</option>
              <option value="0x2260fac5e5542a773aa44fbcff9d822e4cc5d2d1">WBTC</option>
            </select>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              setFromToken(toToken);
              setToToken(fromToken);
            }}
            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-full transition-colors"
          >
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
          </button>
        </div>

        {/* To Token */}
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-2">To</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={quote ? (parseFloat(quote.toAmount) / 1e18).toFixed(6) : "0.00"}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none cursor-not-allowed"
            />
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2">WETH</option>
              <option value="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48">USDC</option>
              <option value="0x2260fac5e5542a773aa44fbcff9d822e4cc5d2d1">WBTC</option>
            </select>
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Price Impact:</span>
              <span className="text-white">{quote.fee} bps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Gas:</span>
              <span className="text-white">{quote.estimatedGas} gas</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Min Output:</span>
              <span className="text-white">{(parseFloat(quote.toAmountMin) / 1e18).toFixed(6)}</span>
            </div>
          </div>
        )}

        {/* Slippage Control */}
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-2">Slippage: {slippage}%</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingQuote && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-4 flex gap-2">
            <Loader className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-200">Fetching quote...</p>
          </div>
        )}

        {/* Success State */}
        {step === "complete" && txHash && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4 flex gap-2">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-200">Swap completed!</p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-300 hover:underline"
              >
                View on BaseScan
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {step === "input" && (
            <button
              onClick={handleApprove}
              disabled={!swapReady || isApproving}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isApproving ? "Approving..." : "Approve Token"}
            </button>
          )}

          {step === "approve" && (
            <button
              onClick={handleSwap}
              disabled={!swapReady || isSwapping}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSwapping ? "Swapping..." : "Execute Swap"}
            </button>
          )}

          {step === "swap" && (
            <button
              disabled
              className="w-full bg-gray-500 text-white font-bold py-3 px-4 rounded-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Loader className="w-5 h-5 animate-spin" />
              Processing...
            </button>
          )}

          {step === "complete" && (
            <button
              onClick={() => {
                setStep("input");
                setAmount("");
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              Swap Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

