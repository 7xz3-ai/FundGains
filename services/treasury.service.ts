// services/treasury.service.ts
// Community Treasury — funded by 0.1% of every Convert (swap) fee.
// Supports governance proposal payouts.

import { prisma } from "@/lib/prisma";

const TREASURY_FEE_BPS = 10; // 0.1% of swap fee routed to treasury

/**
 * Get or create the singleton treasury record.
 */
export async function getTreasury() {
  let treasury = await prisma.treasury.findFirst();
  if (!treasury) {
    treasury = await prisma.treasury.create({ data: {} });
  }
  return {
    totalBalanceUsd: Number(treasury.totalBalanceCents) / 100,
    totalInflowUsd: Number(treasury.totalInflowCents) / 100,
    totalOutflowUsd: Number(treasury.totalOutflowCents) / 100,
    lastUpdated: treasury.lastUpdated,
  };
}

/**
 * Route 0.1% of a swap's fee to the treasury.
 * Called after every successful swap execution.
 */
export async function routeSwapFeeToTreasury(
  swapFeeCents: bigint,
  swapRecordId: string
) {
  const treasuryShareCents = (swapFeeCents * BigInt(TREASURY_FEE_BPS)) / 10000n;
  if (treasuryShareCents <= 0n) return;

  let treasury = await prisma.treasury.findFirst();
  if (!treasury) {
    treasury = await prisma.treasury.create({ data: {} });
  }

  await prisma.$transaction([
    prisma.treasury.update({
      where: { id: treasury.id },
      data: {
        totalBalanceCents: { increment: treasuryShareCents },
        totalInflowCents: { increment: treasuryShareCents },
        lastUpdated: new Date(),
      },
    }),
    prisma.treasuryTransaction.create({
      data: {
        amountCents: treasuryShareCents,
        type: "SWAP_FEE",
        description: `0.1% fee from swap ${swapRecordId}`,
        swapRecordId,
      },
    }),
  ]);
}

/**
 * Pay out treasury funds for an executed proposal.
 */
export async function executeProposalPayout(
  proposalId: string,
  amountCents: bigint
) {
  let treasury = await prisma.treasury.findFirst();
  if (!treasury || treasury.totalBalanceCents < amountCents) {
    throw new Error("Insufficient treasury balance");
  }

  await prisma.$transaction([
    prisma.treasury.update({
      where: { id: treasury.id },
      data: {
        totalBalanceCents: { decrement: amountCents },
        totalOutflowCents: { increment: amountCents },
        lastUpdated: new Date(),
      },
    }),
    prisma.treasuryTransaction.create({
      data: {
        amountCents: -amountCents,
        type: "PROPOSAL_PAYOUT",
        description: `Payout for proposal ${proposalId}`,
        proposalId,
      },
    }),
    prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "EXECUTED", executedAt: new Date() },
    }),
  ]);
}
