"use client";

// components/social/TraderProfile.tsx
// Trader profile card with Copy This Trade button and success fee tracking
// Part of Copy-Yield 2.0 social engine

import { motion } from "framer-motion";
import { useState } from "react";

interface TraderProfileProps {
  traderId: string;
  traderName: string;
  traderAvatar?: string;
  winRate: number;
  totalFollowers: number;
  monthlyYield: number;
  successFeePercent: number;
  topVaults: Array<{
    asset: string;
    allocation: number;
    apy: number;
  }>;
  onCopyTrade: (traderId: string) => void;
}

export default function TraderProfile({
  traderId,
  traderName,
  traderAvatar,
  winRate,
  totalFollowers,
  monthlyYield,
  successFeePercent,
  topVaults,
  onCopyTrade,
}: TraderProfileProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyTrade = async () => {
    setIsCopying(true);
    try {
      await onCopyTrade(traderId);
      // Success feedback
      setTimeout(() => setIsCopying(false), 2000);
    } catch (error) {
      console.error("Failed to copy trade:", error);
      setIsCopying(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      className="card-glass p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Trader Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
            {traderAvatar ? (
              <img src={traderAvatar} alt={traderName} className="w-full h-full rounded-full" />
            ) : (
              <span className="text-terminal text-lg">{traderName.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{traderName}</p>
            <p className="text-xs text-white/40">Pro Trader</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Win Rate</p>
          <p className="text-number text-emerald-400 text-lg">{winRate}%</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-12 p-3 text-center">
          <p className="text-xs text-white/50 mb-1">Followers</p>
          <p className="text-number text-accent-blue text-base">
            {(totalFollowers / 1000).toFixed(1)}K
          </p>
        </div>
        <div className="bg-white/5 rounded-12 p-3 text-center">
          <p className="text-xs text-white/50 mb-1">Monthly Yield</p>
          <p className="text-number text-accent-cyan text-base">
            {monthlyYield.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white/5 rounded-12 p-3 text-center">
          <p className="text-xs text-white/50 mb-1">Success Fee</p>
          <p className="text-number text-gold text-base">{successFeePercent}%</p>
        </div>
      </div>

      {/* Top Vaults */}
      <div className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wider">Top Allocations</p>
        <div className="space-y-2">
          {topVaults.map((vault) => (
            <div key={vault.asset} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white/70">{vault.asset}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[80px]">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan"
                    initial={{ width: 0 }}
                    animate={{ width: `${vault.allocation}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                </div>
              </div>
              <span className="text-xs text-accent-cyan font-mono">{vault.apy}% APY</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copy Trade Button */}
      <motion.button
        onClick={handleCopyTrade}
        disabled={isCopying}
        className="w-full btn-terminal bg-gradient-to-r from-accent-blue to-accent-cyan disabled:opacity-50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isCopying ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Copying...
          </span>
        ) : (
          "📋 Copy This Trade"
        )}
      </motion.button>

      {/* Fee Info */}
      <p className="text-xs text-white/40 text-center border-t border-white/10 pt-4">
        {successFeePercent}% of your yield goes to {traderName}
      </p>
    </motion.div>
  );
}
