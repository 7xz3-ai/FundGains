"use client";

// app/trade/page.tsx
// Full Exchange Terminal — Order Book, Candlestick Charts, Leverage, Live Feed.
// Obsidian Liquid design with information-dense Bento Grid layout.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import LeverageTerminal from "@/components/trade/LeverageTerminal";
import OrderBook from "@/components/trade/OrderBook";
import LiveActivityFeed from "@/components/trade/LiveActivityFeed";
import dynamic from "next/dynamic";

const AdvancedChart = dynamic(
  () => import("@/components/charts/AdvancedChart"),
  { ssr: false }
);

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(3500);
  const [collateral, setCollateral] = useState(1000);
  const [loading, setLoading] = useState(true);
  const prevPriceRef = useRef(3500);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isConnected) router.push("/");
  }, [mounted, isConnected, router]);

  // Simulate price updates
  useEffect(() => {
    if (!isConnected) return;
    setLoading(false);

    const interval = setInterval(() => {
      setCurrentPrice((prev) => {
        prevPriceRef.current = prev;
        const change = (Math.random() - 0.48) * 50;
        return parseFloat(Math.max(prev + change, 1000).toFixed(2));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!mounted || !isConnected) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0e11] via-[#0d1117] to-[#0b0e11] relative overflow-hidden">
      <div className="mesh-gradient" />

      {/* Nav */}
      <nav className="relative z-50 bg-[#0b0e11]/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-sm tracking-tight"
            >
              <span className="text-[#00F3FF]">TRADE</span>
              <span className="text-white/30 ml-1.5 text-[12px]">Terminal</span>
            </motion.span>

            {/* Market ticker */}
            <div className="hidden sm:flex items-center gap-4 ml-4 pl-4 border-l border-white/[0.06]">
              <div className="text-[11px]">
                <span className="text-white/40">ETH/USD</span>
                <span className={`ml-2 font-mono font-bold ${currentPrice >= prevPriceRef.current ? "text-[#34D399]" : "text-[#EF4444]"}`}>
                  ${currentPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px]">
                <span className="text-white/40">24h Vol</span>
                <span className="ml-2 font-mono text-white/60">$2.4B</span>
              </div>
              <div className="text-[11px]">
                <span className="text-white/40">OI</span>
                <span className="ml-2 font-mono text-white/60">$890M</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/bots")}
              className="text-[11px] text-white/40 hover:text-[#00F3FF] transition-colors hidden sm:block"
            >
              Bots
            </button>
            <button
              onClick={() => router.push("/p2p")}
              className="text-[11px] text-white/40 hover:text-[#00F3FF] transition-colors hidden sm:block"
            >
              P2P
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              Dashboard
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      {/* Main — Dense Bento Grid */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3" style={{ minHeight: "calc(100vh - 80px)" }}>

          {/* Order Book — Left Column */}
          <div className="lg:col-span-2 card-glass p-3 overflow-hidden" style={{ maxHeight: "calc(100vh - 100px)" }}>
            <OrderBook currentPrice={currentPrice} previousPrice={prevPriceRef.current} />
          </div>

          {/* Center — Chart + Controls */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Advanced Chart */}
            <div className="card-glass p-4 flex-1" style={{ minHeight: "420px" }}>
              <AdvancedChart basePrice={currentPrice} symbol="ETH/USD" />
            </div>

            {/* Bottom row: Collateral + Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Collateral input */}
              <div className="card-glass p-4">
                <label className="text-[9px] text-white/40 uppercase tracking-wider block mb-2">
                  Collateral
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={collateral}
                    onChange={(e) => setCollateral(parseFloat(e.target.value) || 0)}
                    className="input-terminal flex-1 text-[13px] py-2"
                    placeholder="USD"
                  />
                  <button className="btn-terminal px-4 py-2 text-[11px]">Set</button>
                </div>
              </div>

              {/* 24h Change */}
              <div className="card-glass p-4">
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">24h Change</p>
                <p className="text-[18px] font-bold font-mono text-[#34D399]">+5.23%</p>
                <p className="text-[10px] text-white/30 mt-0.5">$3,245 &rarr; $3,415</p>
              </div>

              {/* Volume */}
              <div className="card-glass p-4">
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">24h Volume</p>
                <p className="text-[18px] font-bold font-mono text-[#2D9FFF]">$2.4B</p>
                <p className="text-[10px] text-white/30 mt-0.5">+12% from yesterday</p>
              </div>
            </div>
          </div>

          {/* Right Column — Leverage + Live Feed */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Leverage Terminal */}
            <div className="card-glass p-3">
              <LeverageTerminal currentPrice={currentPrice} collateral={collateral} />
            </div>

            {/* Live Activity Feed */}
            <div className="card-glass p-3 flex-1 overflow-hidden" style={{ maxHeight: "340px" }}>
              <LiveActivityFeed />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
