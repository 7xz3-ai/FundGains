"use client";

// app/leaderboard/page.tsx
// Copy-Yield 2.0 Leaderboard: Discover top traders and copy their allocations
// Success fees are automatically routed to traders via Prisma ledger

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import TraderProfile from "@/components/social/TraderProfile";

interface Trader {
  id: string;
  name: string;
  avatar?: string;
  winRate: number;
  followers: number;
  monthlyYield: number;
  successFee: number;
  topVaults: Array<{
    asset: string;
    allocation: number;
    apy: number;
  }>;
}

// Mock trader data (in production, fetch from database)
const MOCK_TRADERS: Trader[] = [
  {
    id: "trader-1",
    name: "Yield Master",
    winRate: 87,
    followers: 5420,
    monthlyYield: 12.5,
    successFee: 1,
    topVaults: [
      { asset: "ETH", allocation: 35, apy: 7.2 },
      { asset: "USDT", allocation: 30, apy: 11.5 },
      { asset: "USDY", allocation: 25, apy: 5.2 },
      { asset: "PAXG", allocation: 10, apy: 1.2 },
    ],
  },
  {
    id: "trader-2",
    name: "Crypto Sage",
    winRate: 79,
    followers: 3210,
    monthlyYield: 9.8,
    successFee: 1,
    topVaults: [
      { asset: "BTC", allocation: 40, apy: 6.8 },
      { asset: "USDC", allocation: 35, apy: 8.5 },
      { asset: "SOL", allocation: 20, apy: 7.1 },
      { asset: "LINK", allocation: 5, apy: 3.9 },
    ],
  },
  {
    id: "trader-3",
    name: "Stability Pro",
    winRate: 92,
    followers: 7840,
    monthlyYield: 8.2,
    successFee: 1,
    topVaults: [
      { asset: "USDT", allocation: 45, apy: 11.5 },
      { asset: "USDC", allocation: 30, apy: 8.5 },
      { asset: "USDY", allocation: 20, apy: 5.2 },
      { asset: "PAXG", allocation: 5, apy: 1.2 },
    ],
  },
  {
    id: "trader-4",
    name: "Growth Hacker",
    winRate: 71,
    followers: 2150,
    monthlyYield: 15.3,
    successFee: 1,
    topVaults: [
      { asset: "SOL", allocation: 30, apy: 7.1 },
      { asset: "AERO", allocation: 25, apy: 18.0 },
      { asset: "TRX", allocation: 25, apy: 5.2 },
      { asset: "ETH", allocation: 20, apy: 7.2 },
    ],
  },
];

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>(MOCK_TRADERS);
  const [sortBy, setSortBy] = useState<"yield" | "followers" | "winRate">("yield");
  const [loading, setLoading] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  // Sort traders
  useEffect(() => {
    const sorted = [...MOCK_TRADERS].sort((a, b) => {
      if (sortBy === "yield") return b.monthlyYield - a.monthlyYield;
      if (sortBy === "followers") return b.followers - a.followers;
      return b.winRate - a.winRate;
    });
    setTraders(sorted);
  }, [sortBy]);

  const handleCopyTrade = async (traderId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/copy-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          traderId,
        }),
      });

      if (!response.ok) throw new Error("Failed to copy trade");

      // Show success message (in production, use toast)
      console.log("Trade copied successfully!");
    } catch (error) {
      console.error("Copy trade error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

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
            <span className="text-accent-cyan">LEADERBOARD</span>
            <span className="text-white/40 ml-2">Copy-Yield 2.0</span>
          </motion.span>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[13px] text-white/50 hover:text-accent-cyan transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/trade")}
              className="text-[13px] text-white/50 hover:text-accent-cyan transition-colors"
            >
              Trade
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  <span className="text-accent-cyan">Top Traders</span>
                </h1>
                <p className="text-white/50">
                  Copy the strategies of elite traders and earn passive yield
                </p>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-3">
              {(["yield", "followers", "winRate"] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={`px-4 py-2 rounded-12 border transition-all text-sm font-mono ${
                    sortBy === sort
                      ? "bg-accent-cyan/20 border-accent-cyan text-accent-cyan"
                      : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  {sort === "yield" && "Sort by Yield"}
                  {sort === "followers" && "Sort by Followers"}
                  {sort === "winRate" && "Sort by Win Rate"}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Traders Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
            variants={containerVariants}
          >
            {traders.map((trader, index) => (
              <motion.div
                key={trader.id}
                variants={itemVariants}
                custom={index}
                transition={{ delay: index * 0.05 }}
              >
                <TraderProfile
                  traderId={trader.id}
                  traderName={trader.name}
                  traderAvatar={trader.avatar}
                  winRate={trader.winRate}
                  totalFollowers={trader.followers}
                  monthlyYield={trader.monthlyYield}
                  successFeePercent={trader.successFee}
                  topVaults={trader.topVaults}
                  onCopyTrade={handleCopyTrade}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Info Section */}
          <motion.div variants={itemVariants} className="card-glass p-8 space-y-4">
            <h3 className="text-terminal text-sm text-accent-cyan">How Copy-Yield Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-wider">1. Select Trader</p>
                <p className="text-sm text-white/70">
                  Browse the leaderboard and choose a trader whose strategy matches your goals.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-wider">2. Copy Allocation</p>
                <p className="text-sm text-white/70">
                  Click "Copy This Trade" to mirror their vault allocation with your capital.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-wider">3. Earn & Share</p>
                <p className="text-sm text-white/70">
                  Your yield is automatically calculated. 1% success fee goes to the trader.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Disclaimer */}
          <motion.p variants={itemVariants} className="text-xs text-white/30 text-center">
            ⚠ Past performance is not indicative of future results. Copy-trading carries risk.
            Always DYOR before allocating capital.
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
