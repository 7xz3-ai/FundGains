// app/api/autopilot/route.ts
// AI-driven portfolio rebalancing endpoint
// Analyzes user portfolio and suggests optimal asset allocation

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  analyzePortfolioHealth,
  executeAutopilotRebalance,
} from "@/services/autopilot-rebalance.service";

const AnalyzeSchema = z.object({
  userId: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  riskProfile: z.enum(["conservative", "balanced", "aggressive"]).optional(),
});

const ExecuteSchema = z.object({
  userId: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, userAddress, riskProfile } = body;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ─── ACTION: ANALYZE ───
    if (action === "analyze") {
      const validation = AnalyzeSchema.safeParse({
        userId,
        userAddress,
        riskProfile,
      });

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors },
          { status: 400 }
        );
      }

      const recommendation = await analyzePortfolioHealth(
        userId,
        userAddress,
        riskProfile || "balanced"
      );

      return NextResponse.json({
        success: true,
        recommendation: {
          currentAllocation: recommendation.currentAllocation,
          targetAllocation: recommendation.targetAllocation,
          suggestedSwaps: recommendation.suggestedSwaps,
          estimatedYieldIncrease: recommendation.estimatedYieldIncrease,
          riskAdjustment: recommendation.riskAdjustment,
          confidence: recommendation.confidence,
        },
      });
    }

    // ─── ACTION: EXECUTE ───
    if (action === "execute") {
      const validation = ExecuteSchema.safeParse({
        userId,
        userAddress,
      });

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors },
          { status: 400 }
        );
      }

      const result = await executeAutopilotRebalance(userId, userAddress);

      return NextResponse.json({
        success: result.success,
        swapsExecuted: result.swapsExecuted,
        totalYieldGain: result.totalYieldGain,
        error: result.error,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use 'analyze' to get recommendations or 'execute' to run rebalancing.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[autopilot-api] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
