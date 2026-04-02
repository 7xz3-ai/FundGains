"use client";

// components/trade/LeverageTerminal.tsx
// High-fidelity Perpetuals interface with dynamic leverage slider (1x-50x)
// and real-time liquidation price indicator with RED glow effect.

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface LeverageTerminalProps {
  currentPrice: number;
  collateral: number;
}

export default function LeverageTerminal({
  currentPrice,
  collateral,
}: LeverageTerminalProps) {
  const [leverage, setLeverage] = useState(2);
  const [positionSize, setPositionSize] = useState("long");

  // Calculate liquidation price based on leverage
  const liquidationPrice = useMemo(() => {
    if (positionSize === "long") {
      return currentPrice * (1 - 1 / leverage);
    } else {
      return currentPrice * (1 + 1 / leverage);
    }
  }, [currentPrice, leverage, positionSize]);

  // Calculate risk percentage (how close to liquidation)
  const riskPercentage = useMemo(() => {
    if (positionSize === "long") {
      const distance = currentPrice - liquidationPrice;
      const maxDistance = currentPrice * 0.5;
      return Math.min((1 - distance / maxDistance) * 100, 100);
    } else {
      const distance = liquidationPrice - currentPrice;
      const maxDistance = currentPrice * 0.5;
      return Math.min((1 - distance / maxDistance) * 100, 100);
    }
  }, [currentPrice, liquidationPrice, positionSize]);

  // Determine glow intensity based on risk
  const glowIntensity = riskPercentage > 80 ? "danger" : riskPercentage > 50 ? "warning" : "safe";

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="card-glass p-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h2 className="text-terminal text-sm text-accent-cyan">Perpetuals Terminal</h2>
        <p className="text-xs text-white/40">Leverage up to 50x | Real-time liquidation tracking</p>
      </motion.div>

      {/* Current Price Display */}
      <motion.div variants={itemVariants} className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wider">Current Price</p>
        <p className="text-number text-accent-blue">
          ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
      </motion.div>

      {/* Position Type Selector */}
      <motion.div variants={itemVariants} className="space-y-3">
        <p className="text-xs text-white/50 uppercase tracking-wider">Position Type</p>
        <div className="grid grid-cols-2 gap-3">
          {["long", "short"].map((type) => (
            <button
              key={type}
              onClick={() => setPositionSize(type)}
              className={`py-3 px-4 rounded-12 border transition-all ${
                positionSize === type
                  ? type === "long"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-red-500/20 border-red-500 text-red-400"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
              }`}
            >
              <span className="text-terminal text-sm">{type.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Leverage Slider */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50 uppercase tracking-wider">Leverage</p>
          <p className="text-number text-accent-cyan">{leverage.toFixed(1)}x</p>
        </div>

        {/* Slider */}
        <div className="space-y-3">
          <input
            type="range"
            min="1"
            max="50"
            step="0.5"
            value={leverage}
            onChange={(e) => setLeverage(parseFloat(e.target.value))}
            className="slider-terminal w-full"
          />

          {/* Leverage Presets */}
          <div className="grid grid-cols-5 gap-2">
            {[1, 5, 10, 25, 50].map((preset) => (
              <button
                key={preset}
                onClick={() => setLeverage(preset)}
                className="py-2 px-3 rounded-8 bg-white/5 border border-white/10 text-xs font-mono text-white/70 hover:bg-white/10 hover:border-accent-cyan transition-all"
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Collateral & Position Size */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs text-white/50 uppercase tracking-wider">Collateral</p>
          <p className="text-number text-white">
            ${collateral.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-white/50 uppercase tracking-wider">Position Size</p>
          <p className="text-number text-accent-blue">
            ${(collateral * leverage).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </motion.div>

      {/* Liquidation Price Indicator */}
      <motion.div
        variants={itemVariants}
        className={`liquidation-indicator ${glowIntensity === "danger" ? "danger" : ""}`}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/50 uppercase tracking-wider">Liquidation Price</p>
          <span
            className={`text-xs font-mono font-bold ${
              glowIntensity === "danger"
                ? "text-red-400 glow-red"
                : glowIntensity === "warning"
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {glowIntensity === "danger" ? "⚠ DANGER" : glowIntensity === "warning" ? "⚡ WARNING" : "✓ SAFE"}
          </span>
        </div>

        <p className="text-number text-white mb-4">
          ${liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>

        {/* Risk Meter */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all ${
                glowIntensity === "danger"
                  ? "bg-red-500"
                  : glowIntensity === "warning"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${riskPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-white/50">
            Risk: <span className="text-white/70 font-mono">{riskPercentage.toFixed(1)}%</span>
          </p>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pt-4">
        <button className="btn-terminal bg-gradient-to-r from-emerald-500 to-emerald-600">
          Open {positionSize.toUpperCase()}
        </button>
        <button className="btn-terminal bg-gradient-to-r from-red-500 to-red-600">
          Close Position
        </button>
      </motion.div>

      {/* Risk Disclaimer */}
      <motion.p variants={itemVariants} className="text-xs text-white/30 border-t border-white/10 pt-4">
        ⚠ Leverage trading carries extreme risk. Liquidation can occur instantly. Never risk more than you can afford to lose.
      </motion.p>
    </motion.div>
  );
}
