// services/insurance.service.ts
// Apex Insurance Fund (SAFUI) — protocol safety reserves.
// Funded by 10% of all platform fees routed automatically.

import { prisma } from "@/lib/prisma";

/**
 * Get or create the singleton insurance fund record.
 */
export async function getInsuranceFund() {
  let fund = await prisma.insuranceFund.findFirst();
  if (!fund) {
    fund = await prisma.insuranceFund.create({ data: {} });
  }
  return {
    totalBalanceUsd: Number(fund.totalBalanceCents) / 100,
    totalInflowUsd: Number(fund.totalInflowCents) / 100,
    totalClaimsUsd: Number(fund.totalClaimsCents) / 100,
    lastUpdated: fund.lastUpdated,
  };
}

/**
 * Route 10% of a platform fee to the insurance fund.
 * Called after every swap fee collection.
 */
export async function routeFeeToInsuranceFund(
  feeCents: bigint,
  swapRecordId: string
) {
  const insuranceShareCents = (feeCents * 10n) / 100n; // 10% of platform fee
  if (insuranceShareCents <= 0n) return;

  let fund = await prisma.insuranceFund.findFirst();
  if (!fund) {
    fund = await prisma.insuranceFund.create({ data: {} });
  }

  await prisma.$transaction([
    prisma.insuranceFund.update({
      where: { id: fund.id },
      data: {
        totalBalanceCents: { increment: insuranceShareCents },
        totalInflowCents: { increment: insuranceShareCents },
        lastUpdated: new Date(),
      },
    }),
    prisma.insuranceFundTransaction.create({
      data: {
        amountCents: insuranceShareCents,
        type: "FEE_CONTRIBUTION",
        description: `10% insurance from swap ${swapRecordId}`,
        swapRecordId,
      },
    }),
  ]);
}
