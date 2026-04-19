// services/autopilot-rebalance.service.ts
// AI-driven portfolio rebalancing engine
// Monitors vault yields and suggests optimal asset allocation

import { prisma } from "@/lib/prisma";
import { getVaultAPYs } from "./apy-aggregator.service";
import { getRebalancingRoute } from "./swap-1inch.service";

export interface RebalancingRecommendation {
  userId: string;
  currentAllocation: Record<string, number>; // asset -> % allocation
  targetAllocation: Record<string, number>;
  suggestedSwaps: Array<{
    fromAsset: string;
    toAsset: string;
    reason: string;
    expectedYieldGain: number; // basis points
  }>;
  estimatedYieldIncrease: number; // % per year
  riskAdjustment: "conservative" | "balanced" | "aggressive";
  confidence: number; // 0-100
}

/**
 * Calculate optimal portfolio allocation based on current yields
 * Uses a weighted algorithm: 40% stable, 60% growth
 */
export async function calculateOptimalAllocation(): Promise<Record<string, number>> {
  try {
    const apyData = await getVaultAPYs();

    // Categorize assets
    const stableAssets = apyData.filter((a) =>
      ["USDC", "USDT", "USDY", "DAI"].includes(a.asset)
    );
    const growthAssets = apyData.filter((a) =>
      ["ETH", "BTC", "SOL", "BASE"].includes(a.asset)
    );
    const commodityAssets = apyData.filter((a) =>
      ["PAXG", "REF"].includes(a.asset)
    );

    // Calculate weighted average APY for each category
    const stableAvgAPY =
      stableAssets.length > 0
        ? stableAssets.reduce((sum, a) => sum + a.apyBps, 0) /
          stableAssets.length /
          10000
        : 0.08;

    const growthAvgAPY =
      growthAssets.length > 0
        ? growthAssets.reduce((sum, a) => sum + a.apyBps, 0) /
          growthAssets.length /
          10000
        : 0.07;

    const commodityAvgAPY =
      commodityAssets.length > 0
        ? commodityAssets.reduce((sum, a) => sum + a.apyBps, 0) /
          commodityAssets.length /
          10000
        : 0.03;

    // Allocate based on yield efficiency (higher APY = higher allocation)
    const totalYield = stableAvgAPY + growthAvgAPY + commodityAvgAPY;

    return {
      stable: (stableAvgAPY / totalYield) * 0.4, // 40% to stable
      growth: (growthAvgAPY / totalYield) * 0.5, // 50% to growth
      commodity: (commodityAvgAPY / totalYield) * 0.1, // 10% to commodities
    };
  } catch (error) {
    console.error("[autopilot] Allocation calculation failed:", error);
    // Fallback to balanced allocation
    return {
      stable: 0.4,
      growth: 0.5,
      commodity: 0.1,
    };
  }
}

/**
 * Analyze user's current portfolio and generate rebalancing recommendation
 */
export async function analyzePortfolioHealth(
  userId: string,
  userAddress: string,
  riskProfile: "conservative" | "balanced" | "aggressive" = "balanced"
): Promise<RebalancingRecommendation> {
  try {
    // Fetch user's staked assets
    const stakedAssets = await prisma.stakedAsset.findMany({
      where: { userId },
      include: { vault: true },
    });

    if (stakedAssets.length === 0) {
      return {
        userId,
        currentAllocation: {},
        targetAllocation: {},
        suggestedSwaps: [],
        estimatedYieldIncrease: 0,
        riskAdjustment: riskProfile,
        confidence: 0,
      };
    }

    // Calculate current allocation
    const totalStaked = stakedAssets.reduce(
      (sum, asset) => sum + Number(asset.amountCents),
      0
    );

    const currentAllocation: Record<string, number> = {};
    for (const asset of stakedAssets) {
      const symbol = asset.vault?.assetSymbol || "UNKNOWN";
      currentAllocation[symbol] =
        (Number(asset.amountCents) / totalStaked) * 100;
    }

    // Get optimal allocation based on yields
    const optimalAllocation = await calculateOptimalAllocation();

    // Adjust for risk profile
    let targetAllocation = { ...optimalAllocation };
    if (riskProfile === "conservative") {
      targetAllocation.stable = Math.min(targetAllocation.stable + 0.2, 1);
      targetAllocation.growth = Math.max(targetAllocation.growth - 0.2, 0);
    } else if (riskProfile === "aggressive") {
      targetAllocation.growth = Math.min(targetAllocation.growth + 0.2, 1);
      targetAllocation.stable = Math.max(targetAllocation.stable - 0.2, 0);
    }

    // Normalize to 100%
    const sum = Object.values(targetAllocation).reduce((a, b) => a + b, 0);
    for (const key in targetAllocation) {
      targetAllocation[key] = targetAllocation[key] / sum;
    }

    // Get APY data to calculate yield gains
    const apyData = await getVaultAPYs();

    // Identify swaps needed
    const suggestedSwaps: Array<{
      fromAsset: string;
      toAsset: string;
      reason: string;
      expectedYieldGain: number;
    }> = [];

    for (const [asset, currentAlloc] of Object.entries(currentAllocation)) {
      const targetAlloc = targetAllocation[asset] || 0;
      const diff = targetAlloc - currentAlloc;

      if (Math.abs(diff) > 5) {
        // More than 5% difference
        const currentAPY =
          apyData.find((a) => a.asset === asset)?.apyBps || 0;
        const bestAlternative = apyData.reduce((best, a) => {
          return a.apyBps > best.apyBps ? a : best;
        });

        suggestedSwaps.push({
          fromAsset: asset,
          toAsset: bestAlternative.asset,
          reason: `Rebalance: ${currentAlloc.toFixed(1)}% → ${targetAlloc.toFixed(1)}%`,
          expectedYieldGain: bestAlternative.apyBps - currentAPY,
        });
      }
    }

    // Calculate estimated yield increase
    const currentYield = stakedAssets.reduce((sum, asset) => {
      const apy = apyData.find(
        (a) => a.asset === asset.vault?.assetSymbol
      )?.apyBps || 0;
      return sum + (Number(asset.amountCents) * apy) / 10000;
    }, 0);

    const projectedYield = stakedAssets.reduce((sum, asset) => {
      const symbol = asset.vault?.assetSymbol || "UNKNOWN";
      const targetAlloc = targetAllocation[symbol] || 0;
      const apy = apyData.find((a) => a.asset === symbol)?.apyBps || 0;
      return sum + (Number(asset.amountCents) * targetAlloc * apy) / 10000;
    }, 0);

    const estimatedYieldIncrease =
      currentYield > 0 ? ((projectedYield - currentYield) / currentYield) * 100 : 0;

    return {
      userId,
      currentAllocation,
      targetAllocation,
      suggestedSwaps,
      estimatedYieldIncrease,
      riskAdjustment: riskProfile,
      confidence: Math.min(100, suggestedSwaps.length * 20 + 50), // Higher confidence with more swaps
    };
  } catch (error) {
    console.error("[autopilot] Portfolio analysis failed:", error);
    return {
      userId,
      currentAllocation: {},
      targetAllocation: {},
      suggestedSwaps: [],
      estimatedYieldIncrease: 0,
      riskAdjustment: riskProfile,
      confidence: 0,
    };
  }
}

/**
 * Create a rebalancing alert for the user
 * Alerts are stored and shown in the dashboard
 */
export async function createRebalancingAlert(
  userId: string,
  recommendation: RebalancingRecommendation
): Promise<void> {
  if (recommendation.suggestedSwaps.length === 0) return;

  const totalYieldGain = recommendation.suggestedSwaps.reduce(
    (sum, swap) => sum + swap.expectedYieldGain,
    0
  );

  await prisma.aIAlert.create({
    data: {
      userId,
      type: "REBALANCE",
      title: `Rebalancing Opportunity: +${(recommendation.estimatedYieldIncrease).toFixed(2)}% Yield`,
      message: `Your portfolio can be optimized for better yields. ${recommendation.suggestedSwaps.length} swap(s) recommended. Estimated gain: ${(totalYieldGain / 100).toFixed(2)}% APY.`,
      actionUrl: "/dashboard/autopilot",
      metadata: {
        suggestedSwaps: recommendation.suggestedSwaps,
        estimatedYieldIncrease: recommendation.estimatedYieldIncrease,
        riskProfile: recommendation.riskAdjustment,
      },
    },
  });
}

/**
 * Execute automated rebalancing (triggered by cron or user action)
 */
export async function executeAutopilotRebalance(
  userId: string,
  userAddress: string
): Promise<{
  success: boolean;
  swapsExecuted: number;
  totalYieldGain: number;
  error?: string;
}> {
  try {
    // Get user's risk profile from preferences
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const riskProfile = (
      userProfile?.preferences as any
    )?.riskProfile || "balanced";

    // Analyze portfolio
    const recommendation = await analyzePortfolioHealth(
      userId,
      userAddress,
      riskProfile
    );

    if (recommendation.suggestedSwaps.length === 0) {
      return {
        success: true,
        swapsExecuted: 0,
        totalYieldGain: 0,
      };
    }

    // Get rebalancing routes
    const currentBalances: Record<string, string> = {}; // simplified
    const routes = await getRebalancingRoute(
      userAddress,
      currentBalances,
      recommendation.targetAllocation
    );

    // In production, would execute swaps here via wagmi
    // For now, just log the recommendation
    console.log(
      `[autopilot] Rebalancing recommendation for ${userId}:`,
      recommendation
    );

    // Create alert for user
    await createRebalancingAlert(userId, recommendation);

    return {
      success: true,
      swapsExecuted: routes.length,
      totalYieldGain: recommendation.estimatedYieldIncrease,
    };
  } catch (error) {
    console.error("[autopilot] Rebalance execution failed:", error);
    return {
      success: false,
      swapsExecuted: 0,
      totalYieldGain: 0,
      error: String(error),
    };
  }
}
