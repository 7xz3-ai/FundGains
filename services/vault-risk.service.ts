// services/vault-risk.service.ts
// Smart Security Scanner — Risk Scores for staking vaults.
// Score 1-10 based on: audit status, liquidity depth, contract age, TVL.

import { prisma } from "@/lib/prisma";

// Default vault risk data — in production, fetched from audit APIs and on-chain
const DEFAULT_VAULTS = [
  {
    vaultId: "0xVaultETH",
    assetSymbol: "ETH",
    riskScore: 2,
    auditStatus: "audited",
    auditor: "OpenZeppelin",
    liquidityDepth: 420_000_000n, // $4.2M
    tvlCents: 420_000_000n,
    impermanentLossRisk: 0,
    smartContractAge: 365,
  },
  {
    vaultId: "0xVaultETH_B",
    assetSymbol: "ETH",
    riskScore: 5,
    auditStatus: "partial",
    auditor: "Certik",
    liquidityDepth: 150_000_000n,
    tvlCents: 150_000_000n,
    impermanentLossRisk: 3,
    smartContractAge: 90,
  },
  {
    vaultId: "0xVaultUSDC",
    assetSymbol: "USDC",
    riskScore: 1,
    auditStatus: "audited",
    auditor: "OpenZeppelin",
    liquidityDepth: 1_250_000_000n,
    tvlCents: 1_250_000_000n,
    impermanentLossRisk: 0,
    smartContractAge: 540,
  },
  {
    vaultId: "0xVaultUSDC_B",
    assetSymbol: "USDC",
    riskScore: 6,
    auditStatus: "unaudited",
    auditor: null,
    liquidityDepth: 80_000_000n,
    tvlCents: 80_000_000n,
    impermanentLossRisk: 2,
    smartContractAge: 30,
  },
  {
    vaultId: "0xVaultBTC",
    assetSymbol: "cbBTC",
    riskScore: 3,
    auditStatus: "audited",
    auditor: "Trail of Bits",
    liquidityDepth: 810_000_000n,
    tvlCents: 810_000_000n,
    impermanentLossRisk: 1,
    smartContractAge: 270,
  },
  // ─── Phase 5: New Global Asset Vaults ───
  {
    vaultId: "vault-cbbtc-prime",
    assetSymbol: "cbBTC",
    riskScore: 2,
    auditStatus: "audited",
    auditor: "OpenZeppelin",
    liquidityDepth: 2_800_000_000n,
    tvlCents: 2_800_000_000n,
    impermanentLossRisk: 1,
    smartContractAge: 310,
  },
  {
    vaultId: "vault-usdt-stability",
    assetSymbol: "USDT",
    riskScore: 2,
    auditStatus: "audited",
    auditor: "Certik",
    liquidityDepth: 5_600_000_000n,
    tvlCents: 5_600_000_000n,
    impermanentLossRisk: 0,
    smartContractAge: 420,
  },
  {
    vaultId: "vault-trx-efficiency",
    assetSymbol: "TRX",
    riskScore: 4,
    auditStatus: "audited",
    auditor: "Hacken",
    liquidityDepth: 950_000_000n,
    tvlCents: 950_000_000n,
    impermanentLossRisk: 2,
    smartContractAge: 180,
  },
  {
    vaultId: "vault-link-oracle",
    assetSymbol: "LINK",
    riskScore: 3,
    auditStatus: "audited",
    auditor: "Trail of Bits",
    liquidityDepth: 680_000_000n,
    tvlCents: 680_000_000n,
    impermanentLossRisk: 1,
    smartContractAge: 240,
  },
  {
    vaultId: "vault-aero-base",
    assetSymbol: "AERO",
    riskScore: 5,
    auditStatus: "partial",
    auditor: "Certik",
    liquidityDepth: 320_000_000n,
    tvlCents: 320_000_000n,
    impermanentLossRisk: 4,
    smartContractAge: 90,
  },
  {
    vaultId: "vault-sol-liquid",
    assetSymbol: "SOL",
    riskScore: 3,
    auditStatus: "audited",
    auditor: "Neodyme",
    liquidityDepth: 680_000_000n,
    tvlCents: 680_000_000n,
    impermanentLossRisk: 1,
    smartContractAge: 200,
  },
  {
    vaultId: "vault-paxg-gold",
    assetSymbol: "PAXG",
    riskScore: 1,
    auditStatus: "regulated",
    auditor: "NYDFS",
    liquidityDepth: 5_000_000_000n,
    tvlCents: 5_000_000_000n,
    impermanentLossRisk: 0,
    smartContractAge: 1200,
    stabilityGrade: "AAA",
  },
  {
    vaultId: "vault-usdy-treasury",
    assetSymbol: "USDY",
    riskScore: 1,
    auditStatus: "audited",
    auditor: "Ondo",
    liquidityDepth: 25_000_000_000n,
    tvlCents: 25_000_000_000n,
    impermanentLossRisk: 0,
    smartContractAge: 450,
    stabilityGrade: "AAA",
  },
  {
    vaultId: "vault-ref-rental",
    assetSymbol: "REF",
    riskScore: 3,
    auditStatus: "verified",
    auditor: "Lofty",
    liquidityDepth: 850_000_000n,
    tvlCents: 850_000_000n,
    impermanentLossRisk: 0,
    smartContractAge: 320,
    stabilityGrade: "A+",
  },
];

/**
 * Seed or refresh vault risk data.
 */
export async function seedVaultRiskScores(): Promise<void> {
  for (const vault of DEFAULT_VAULTS) {
    await prisma.vaultRiskScore.upsert({
      where: { vaultId: vault.vaultId },
      update: {
        riskScore: vault.riskScore,
        auditStatus: vault.auditStatus,
        auditor: vault.auditor,
        liquidityDepth: vault.liquidityDepth,
        tvlCents: vault.tvlCents,
        impermanentLossRisk: vault.impermanentLossRisk,
        smartContractAge: vault.smartContractAge,
        stabilityGrade: (vault as any).stabilityGrade,
        lastUpdated: new Date(),
      },
      create: vault,
    });
  }
}

/**
 * Get risk score for a specific vault.
 */
export async function getVaultRiskScore(vaultId: string) {
  const score = await prisma.vaultRiskScore.findUnique({
    where: { vaultId },
  });
  if (!score) return null;

  return {
    vaultId: score.vaultId,
    assetSymbol: score.assetSymbol,
    riskScore: score.riskScore,
    riskLabel: getRiskLabel(score.riskScore),
    riskColor: getRiskColor(score.riskScore),
    auditStatus: score.auditStatus,
    auditor: score.auditor,
    tvlUsd: Number(score.tvlCents) / 100,
    liquidityDepthUsd: Number(score.liquidityDepth) / 100,
    impermanentLossRisk: score.impermanentLossRisk,
    contractAgeDays: score.smartContractAge,
    stabilityGrade: score.stabilityGrade,
    lastUpdated: score.lastUpdated,
  };
}

/**
 * Get risk scores for all vaults.
 */
export async function getAllVaultRiskScores() {
  const scores = await prisma.vaultRiskScore.findMany({
    orderBy: { riskScore: "asc" },
  });

  return scores.map((s: any) => ({
    vaultId: s.vaultId,
    assetSymbol: s.assetSymbol,
    riskScore: s.riskScore,
    riskLabel: getRiskLabel(s.riskScore),
    riskColor: getRiskColor(s.riskScore),
    auditStatus: s.auditStatus,
    auditor: s.auditor,
    tvlUsd: Number(s.tvlCents) / 100,
  }));
}

function getRiskLabel(score: number): string {
  if (score <= 2) return "Very Safe";
  if (score <= 4) return "Low Risk";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "Elevated";
  return "High Risk";
}

function getRiskColor(score: number): string {
  if (score <= 2) return "text-green-500";
  if (score <= 4) return "text-blue-500";
  if (score <= 6) return "text-yellow-500";
  if (score <= 8) return "text-orange-500";
  return "text-red-500";
}
