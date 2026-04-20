"use client";

// components/autopilot/AutopilotPanel.tsx
// AI-driven portfolio rebalancing UI
// Shows recommendations and allows execution

import React, { useState } from "react";
import { useAutopilot } from "@/hooks/useAutopilot";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader,
  Zap,
} from "lucide-react";

interface AutopilotPanelProps {
  userId: string;
}

export default function AutopilotPanel({ userId }: AutopilotPanelProps) {
  const [riskProfile, setRiskProfile] = useState<"conservative" | "balanced" | "aggressive">(
    "balanced"
  );

  const {
    recommendation,
    isLoadingRecommendation,
    isExecuting,
    executionError,
    executeRebalancing,
    potentialYieldGain,
    isRebalancingNeeded,
  } = useAutopilot(userId, riskProfile);

  const handleExecute = async () => {
    try {
      await executeRebalancing();
    } catch (error) {
      console.error("Rebalancing failed:", error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Autopilot Rebalancing</h2>
        </div>

        {/* Risk Profile Selector */}
        <div className="mb-8">
          <label className="block text-sm text-white/60 mb-3">Risk Profile</label>
          <div className="flex gap-3">
            {(["conservative", "balanced", "aggressive"] as const).map((profile) => (
              <button
                key={profile}
                onClick={() => setRiskProfile(profile)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  riskProfile === profile
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {profile.charAt(0).toUpperCase() + profile.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingRecommendation && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex gap-3 mb-6">
            <Loader className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
            <p className="text-blue-200">Analyzing your portfolio...</p>
          </div>
        )}

        {/* Recommendation Display */}
        {recommendation && !isLoadingRecommendation && (
          <>
            {/* Yield Gain */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">Estimated Yield Increase</p>
                  <p className="text-3xl font-bold text-white">
                    +{potentialYieldGain.toFixed(2)}%
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-400" />
              </div>
            </div>

            {/* Current vs Target Allocation */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Portfolio Rebalancing</h3>
              <div className="space-y-3">
                {Object.entries(recommendation.currentAllocation).map(([asset, current]) => {
                  const target = recommendation.targetAllocation[asset] || 0;
                  const diff = target - current;

                  return (
                    <div key={asset} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">{asset}</span>
                        <span className={`text-sm font-bold ${
                          diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-white/60"
                        }`}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full"
                            style={{ width: `${current}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/60 w-12 text-right">
                          {current.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-2 items-center mt-1">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-green-500 h-full"
                            style={{ width: `${target}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/60 w-12 text-right">
                          {target.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested Swaps */}
            {recommendation.suggestedSwaps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Suggested Swaps</h3>
                <div className="space-y-2">
                  {recommendation.suggestedSwaps.map((swap, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-white font-semibold">
                          {swap.fromAsset} → {swap.toAsset}
                        </p>
                        <p className="text-xs text-white/60">{swap.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">
                          +{(swap.expectedYieldGain / 100).toFixed(2)}% APY
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Score */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Recommendation Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-white/10 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${recommendation.confidence}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-12 text-right">
                    {recommendation.confidence}%
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {executionError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-200">{executionError}</p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleExecute}
              disabled={!isRebalancingNeeded || isExecuting}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-all ${
                isRebalancingNeeded && !isExecuting
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/50"
                  : "bg-gray-500 text-white/50 cursor-not-allowed"
              }`}
            >
              {isExecuting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Executing Rebalancing...
                </span>
              ) : isRebalancingNeeded ? (
                "Execute Rebalancing"
              ) : (
                "Portfolio Optimized"
              )}
            </button>
          </>
        )}

        {/* No Recommendation */}
        {!recommendation && !isLoadingRecommendation && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <AlertCircle className="w-8 h-8 text-white/40 mx-auto mb-3" />
            <p className="text-white/60">Unable to load recommendations</p>
          </div>
        )}
      </div>
    </div>
  );
}

