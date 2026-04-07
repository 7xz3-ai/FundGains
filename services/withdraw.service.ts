// services/withdraw.service.ts
// Fiat off-ramp — withdraw USDC/USDT to bank account.
// UI shell for Transak/MoonPay/Stripe integration.

import { prisma } from "@/lib/prisma";

const ALLOWED_ASSETS = ["USDC", "USDT"];
const WITHDRAWAL_FEE_BPS = 50; // 0.5% withdrawal fee
const MIN_WITHDRAWAL_CENTS = 1000; // $10 minimum

export async function createWithdrawal(
  userId: string,
  asset: string,
  amountCents: bigint,
  bankRef?: string,
  provider: string = "TRANSAK"
) {
  if (!ALLOWED_ASSETS.includes(asset)) {
    throw new Error("Only USDC and USDT withdrawals are supported");
  }

  if (amountCents < BigInt(MIN_WITHDRAWAL_CENTS)) {
    throw new Error(`Minimum withdrawal: $${MIN_WITHDRAWAL_CENTS / 100}`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.cashBalance < amountCents) {
    throw new Error("Insufficient balance");
  }

  const feeCents = (amountCents * BigInt(WITHDRAWAL_FEE_BPS)) / 10000n;
  const estimatedDays = provider === "STRIPE" ? 1 : 2;

  const withdrawal = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { cashBalance: { decrement: amountCents } },
    }),
    prisma.withdrawalRequest.create({
      data: {
        userId,
        asset,
        amountCents: amountCents - feeCents,
        feeCents,
        bankRef: bankRef ? `****${bankRef.slice(-4)}` : null,
        provider,
        estimatedDays,
      },
    }),
  ]);

  const req = withdrawal[1];
  return {
    id: req.id,
    asset,
    amountUsd: Number(req.amountCents) / 100,
    feeUsd: Number(req.feeCents) / 100,
    status: req.status,
    estimatedDays: req.estimatedDays,
    provider: req.provider,
    createdAt: req.createdAt,
  };
}

export async function getUserWithdrawals(userId: string) {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (withdrawals as any[]).map((w: any) => ({
    id: w.id,
    asset: w.asset,
    amountUsd: Number(w.amountCents) / 100,
    feeUsd: Number(w.feeCents) / 100,
    status: w.status,
    estimatedDays: w.estimatedDays,
    provider: w.provider,
    bankRef: w.bankRef,
    createdAt: w.createdAt,
    completedAt: w.completedAt,
  }));
}
