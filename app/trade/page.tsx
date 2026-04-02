"use client";

// app/trade/page.tsx
// Pro-Trader Perpetuals interface with Leverage Terminal and TradingView charts
// Dark Mode Only: Obsidian (#0B0E11) with Electric Cyan (#00F3FF) accents

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import LeverageTerminal from "@/components/trade/LeverageTerminal";

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [currentPrice, setCurrentPrice] = useState(3500);
  const [collateral, setCollateral] = useState(1000);
  const [loading, setLoading] = useState(true);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  // Simulate price updates
  useEffect(() => {
    if (!isConnected) return;
    setLoading(false);

    const interval = setInterval(() => {
      setCurrentPrice((prev) => {
        const change = (Math.random() - 0.5) * 100;
        return Math.max(prev + change, 1000);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading Trading Terminal...</p>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0e11] via-[#1a1f2e] to-[#0b0e11] relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="mesh-gradient" />

      {/* Navigation */}
      <nav className="relative z-50 bg-[#0b0e11]/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-bold text-lg tracking-tight"
          >
            <span className="text-accent-cyan">TRADE</span>
            <span className="text-white/40 ml-2">Terminal</span>
          </motion.span>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[13px] text-white/50 hover:text-accent-cyan transition-colors"
            >
              Dashboard
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Column: Leverage Terminal */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <LeverageTerminal currentPrice={currentPrice} collateral={collateral} />
          </motion.div>

          {/* Right Column: Chart & Info */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            {/* TradingView Chart Placeholder */}
            <div className="card-glass p-8 h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-terminal text-sm text-accent-cyan">ETH/USD Chart</h3>
                  <p className="text-xs text-white/40 mt-1">Real-time price action</p>
                </div>
                <div className="flex gap-2">
                  {["1H", "4H", "1D", "1W"].map((timeframe) => (
                    <button
                      key={timeframe}
                      className="px-3 py-1.5 text-xs rounded-8 bg-white/5 border border-white/10 text-white/50 hover:border-accent-cyan hover:text-accent-cyan transition-all"
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Container */}
              <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent rounded-12 border border-white/10">
                <div className="text-center">
                  <p className="text-sm text-white/50 mb-2">TradingView Lightweight Charts</p>
                  <svg
                    className="w-32 h-32 mx-auto opacity-30"
                    viewBox="0 0 100 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <polyline points="10,80 30,60 50,70 70,40 90,50" />
                    <line x1="10" y1="90" x2="90" y2="90" strokeDasharray="2,2" />
                  </svg>
                  <p className="text-xs text-white/30 mt-2">Chart integration ready</p>
                </div>
              </div>
            </div>

            {/* Trade Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* 24h Change */}
              <motion.div variants={itemVariants} className="card-glass p-6">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">24h Change</p>
                <p className="text-number text-emerald-400">+5.23%</p>
                <p className="text-xs text-white/40 mt-2">$3,245 → $3,415</p>
              </motion.div>

              {/* Volume */}
              <motion.div variants={itemVariants} className="card-glass p-6">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">24h Volume</p>
                <p className="text-number text-accent-blue">$2.4B</p>
                <p className="text-xs text-white/40 mt-2">+12% from yesterday</p>
              </motion.div>
            </div>

            {/* Collateral Input */}
            <motion.div variants={itemVariants} className="card-glass p-6">
              <label className="text-xs text-white/50 uppercase tracking-wider block mb-3">
                Set Collateral Amount
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={collateral}
                  onChange={(e) => setCollateral(parseFloat(e.target.value) || 0)}
                  className="input-terminal flex-1"
                  placeholder="Enter amount in USD"
                />
                <button className="btn-terminal px-6">Set</button>
              </div>
              <p className="text-xs text-white/40 mt-3">
                Current collateral: <span className="text-accent-cyan font-mono">${collateral.toLocaleString()}</span>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Pro Tips Section */}
        <motion.div
          variants={itemVariants}
          className="mt-8 card-glass p-6 border-l-2 border-accent-cyan"
        >
          <h4 className="text-terminal text-sm text-accent-cyan mb-3">⚡ Pro Tips</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li>• Start with low leverage (1-5x) to understand market dynamics</li>
            <li>• Always set stop-losses to protect your collateral</li>
            <li>• Monitor liquidation price closely as leverage increases</li>
            <li>• Use limit orders to enter positions at better prices</li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
