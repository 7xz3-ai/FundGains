// app/api/vault-risk/route.ts
// GET: Fetch risk scores for vaults.
// ?vaultId=0xVaultETH for a single vault, or no params for all.

import { NextRequest, NextResponse } from "next/server";
import {
  getVaultRiskScore,
  getAllVaultRiskScores,
} from "@/services/vault-risk.service";

export async function GET(req: NextRequest) {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  if (vaultId) {
    const score = await getVaultRiskScore(vaultId);
    if (!score) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }
    return NextResponse.json(score);
  }

  const scores = await getAllVaultRiskScores();
  return NextResponse.json({ vaults: scores });
}
