// app/api/insurance/route.ts
// Insurance Fund & Safety Management API
// Provides comprehensive safety metrics, vault risk scores, and emergency controls

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getInsuranceFundStatus,
  getAllVaultSafetyScores,
  calculateVaultSafetyScore,
} from "@/services/insurance-fund.service";
import {
  getEmergencyState,
  getEmergencyAlerts,
  isVaultInEmergency,
} from "@/services/emergency-controls.service";

const QuerySchema = z.object({
  action: z.enum(["fund-status", "vault-scores", "vault-safety", "emergency-state", "emergency-alerts"]),
  vaultId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = QuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { action, vaultId } = parsed.data;

    // Get insurance fund status
    if (action === "fund-status") {
      const status = await getInsuranceFundStatus();
      return NextResponse.json({
        success: true,
        data: {
          totalReserves: status.totalReserves.toString(),
          reservesUSD: status.reservesUSD,
          utilizationRate: status.utilizationRate,
          healthScore: status.healthScore,
          monthlyInflow: status.monthlyInflow.toString(),
          monthlyOutflow: status.monthlyOutflow.toString(),
        },
      });
    }

    // Get all vault safety scores
    if (action === "vault-scores") {
      const scores = await getAllVaultSafetyScores();
      return NextResponse.json({
        success: true,
        data: scores.map((score) => ({
          ...score,
          tvl: score.tvl.toString(),
        })),
      });
    }

    // Get single vault safety score
    if (action === "vault-safety") {
      if (!vaultId) {
        return NextResponse.json(
          { error: "vaultId is required" },
          { status: 400 }
        );
      }

      const score = await calculateVaultSafetyScore(vaultId);
      const inEmergency = await isVaultInEmergency(vaultId);

      return NextResponse.json({
        success: true,
        data: {
          ...score,
          tvl: score.tvl.toString(),
          inEmergency,
        },
      });
    }

    // Get emergency state
    if (action === "emergency-state") {
      const state = await getEmergencyState();
      return NextResponse.json({
        success: true,
        data: state,
      });
    }

    // Get emergency alerts
    if (action === "emergency-alerts") {
      const alerts = await getEmergencyAlerts(10);
      return NextResponse.json({
        success: true,
        data: alerts,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[insurance-api] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
