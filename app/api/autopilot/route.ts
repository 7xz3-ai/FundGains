// app/api/autopilot/route.ts
// AI Autopilot API — analyze portfolio and execute rebalance recommendations.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  analyzePortfolioAutopilot,
  executeRebalance,
  setAutopilotConfig,
} from "@/services/ai.optimizer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, walletAddress, riskTolerance, fromVaultId, toVaultId } =
      body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (action === "analyze") {
      // Update config if risk tolerance provided
      if (riskTolerance) {
        setAutopilotConfig(walletAddress, { enabled: true, riskTolerance });
      }

      const recommendations = await analyzePortfolioAutopilot(
        user.id,
        walletAddress
      );

      return NextResponse.json({ recommendations });
    }

    if (action === "rebalance") {
      if (!fromVaultId || !toVaultId) {
        return NextResponse.json(
          { error: "fromVaultId and toVaultId required" },
          { status: 400 }
        );
      }

      const result = await executeRebalance(user.id, fromVaultId, toVaultId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Autopilot API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
