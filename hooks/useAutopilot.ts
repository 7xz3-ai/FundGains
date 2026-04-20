// hooks/useAutopilot.ts
// React hook for AI-driven portfolio rebalancing
// Fetches recommendations and executes rebalancing

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface RebalancingRecommendation {
  currentAllocation: Record<string, number>;
  targetAllocation: Record<string, number>;
  suggestedSwaps: Array<{
    fromAsset: string;
    toAsset: string;
    reason: string;
    expectedYieldGain: number;
  }>;
  estimatedYieldIncrease: number;
  riskAdjustment: "conservative" | "balanced" | "aggressive";
  confidence: number;
}

export function useAutopilot(
  userId: string,
  riskProfile: "conservative" | "balanced" | "aggressive" = "balanced"
) {
  const { address: userAddress } = useAccount();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Fetch rebalancing recommendation
  const { data: recommendation, isLoading: isLoadingRecommendation } = useQuery({
    queryKey: ["autopilot-recommendation", userId, riskProfile],
    queryFn: async () => {
      if (!userAddress) return null;

      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          userId,
          userAddress,
          riskProfile,
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch recommendation");

      const data = await res.json();
      return data.recommendation as RebalancingRecommendation;
    },
    enabled: !!(userId && userAddress),
    staleTime: 5 * 60_000, // 5 minutes
  });

  // Execute rebalancing
  const executeRebalancing = useCallback(async () => {
    if (!userAddress) return;

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          userId,
          userAddress,
        }),
      });

      if (!res.ok) throw new Error("Rebalancing execution failed");

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }

      return {
        success: true,
        swapsExecuted: data.swapsExecuted,
        totalYieldGain: data.totalYieldGain,
      };
    } catch (error) {
      const errorMsg = String(error);
      setExecutionError(errorMsg);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [userId, userAddress]);

  // Calculate potential yield gain
  const potentialYieldGain = recommendation
    ? recommendation.estimatedYieldIncrease
    : 0;

  // Check if rebalancing is recommended
  const isRebalancingNeeded =
    recommendation && recommendation.suggestedSwaps.length > 0;

  return {
    recommendation,
    isLoadingRecommendation,
    isExecuting,
    executionError,
    executeRebalancing,
    potentialYieldGain,
    isRebalancingNeeded,
  };
}

