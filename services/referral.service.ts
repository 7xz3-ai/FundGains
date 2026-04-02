// services/referral.service.ts
// Tiered Referral System — earn yield-share from referrals.
// Tier 1: 5% of direct referral's yield
// Tier 2: 1% of friend-of-friend's yield

import { prisma } from "@/lib/prisma";
import { awardXP, checkAndAwardBadges, XP_REWARDS } from "@/services/gamification.service";
import { AlertType } from "@prisma/client";

const TIER_1_BPS = 500; // 5% of referral's yield
const TIER_2_BPS = 100; // 1% of tier-2 referral's yield

/**
 * Generate a unique referral code for a user.
 * Deterministic from wallet address — same address = same code.
 */
export function generateReferralCode(walletAddress: string): string {
  const hash = walletAddress.toLowerCase().slice(2, 10);
  return `AX-${hash.toUpperCase()}`;
}

/**
 * Apply a referral code when a new user connects.
 * Links the new user to their referrer.
 */
export async function applyReferralCode(
  newUserId: string,
  referralCode: string
): Promise<{ success: boolean; referrerAlias: string | null }> {
  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true, cyberAlias: true },
  });

  if (!referrer || referrer.id === newUserId) {
    return { success: false, referrerAlias: null };
  }

  // Link the new user to their referrer
  await prisma.user.update({
    where: { id: newUserId },
    data: { referredById: referrer.id },
  });

  // Award XP to the referrer
  await awardXP(referrer.id, XP_REWARDS.REFERRAL_SIGNUP, "referral_signup");
  await checkAndAwardBadges(referrer.id);

  return { success: true, referrerAlias: referrer.cyberAlias };
}

/**
 * Ensure a user has a referral code.
 */
export async function ensureReferralCode(userId: string, walletAddress: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) return user.referralCode;

  const code = generateReferralCode(walletAddress);
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
  });
  return code;
}

/**
 * Process tiered referral yield-share for a yield event.
 * Called by the yield accrual cron whenever YIELD_CREDIT is issued.
 *
 * @param sourceUserId - the user whose staking generated yield
 * @param yieldCents   - the yield amount in cents
 */
export async function processReferralYieldShare(
  sourceUserId: string,
  yieldCents: bigint,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  if (yieldCents <= 0n) return;

  const source = await prisma.user.findUnique({
    where: { id: sourceUserId },
    select: { referredById: true },
  });

  if (!source?.referredById) return;

  // --- Tier 1: Direct referrer ---
  const tier1Amount = (yieldCents * BigInt(TIER_1_BPS)) / 10_000n;
  if (tier1Amount > 0n) {
    await prisma.referralEarning.create({
      data: {
        earnerId: source.referredById,
        sourceId: sourceUserId,
        tier: 1,
        yieldBasisBps: TIER_1_BPS,
        amountCents: tier1Amount,
        sourceYieldCents: yieldCents,
        periodStart,
        periodEnd,
      },
    });

    // Credit the referrer's cash balance
    await prisma.user.update({
      where: { id: source.referredById },
      data: { cashBalance: { increment: tier1Amount } },
    });

    // Alert the referrer
    await prisma.aIAlert.create({
      data: {
        userId: source.referredById,
        type: AlertType.REFERRAL_EARNED,
        title: "Referral Yield Earned",
        message:
          `Your Tier 1 referral generated yield, and you earned ` +
          `$${(Number(tier1Amount) / 100).toFixed(2)} as a ${(TIER_1_BPS / 100).toFixed(1)}% yield-share. ` +
          `Continue referring friends to grow your passive income.`,
        metadata: { tier: 1, amountCents: Number(tier1Amount) },
      },
    });
  }

  // --- Tier 2: Referrer's referrer ---
  const tier1User = await prisma.user.findUnique({
    where: { id: source.referredById },
    select: { referredById: true },
  });

  if (tier1User?.referredById) {
    const tier2Amount = (yieldCents * BigInt(TIER_2_BPS)) / 10_000n;
    if (tier2Amount > 0n) {
      await prisma.referralEarning.create({
        data: {
          earnerId: tier1User.referredById,
          sourceId: sourceUserId,
          tier: 2,
          yieldBasisBps: TIER_2_BPS,
          amountCents: tier2Amount,
          sourceYieldCents: yieldCents,
          periodStart,
          periodEnd,
        },
      });

      await prisma.user.update({
        where: { id: tier1User.referredById },
        data: { cashBalance: { increment: tier2Amount } },
      });

      // Award Tier 2 XP
      await awardXP(tier1User.referredById, XP_REWARDS.REFERRAL_TIER2, "referral_tier2");
    }
  }
}

/**
 * Get referral stats for a user.
 */
export async function getReferralStats(userId: string) {
  const [user, earnings, directReferrals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),
    prisma.referralEarning.findMany({
      where: { earnerId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.count({ where: { referredById: userId } }),
  ]);

  const totalEarnedCents = (earnings as any[]).reduce(
    (sum: number, e: any) => sum + Number(e.amountCents),
    0
  );
  const tier1Earned = (earnings as any[])
    .filter((e: any) => e.tier === 1)
    .reduce((sum: number, e: any) => sum + Number(e.amountCents), 0);
  const tier2Earned = (earnings as any[])
    .filter((e: any) => e.tier === 2)
    .reduce((sum: number, e: any) => sum + Number(e.amountCents), 0);

  return {
    referralCode: user?.referralCode,
    directReferrals,
    totalEarnedUsd: totalEarnedCents / 100,
    tier1EarnedUsd: tier1Earned / 100,
    tier2EarnedUsd: tier2Earned / 100,
    recentEarnings: (earnings as any[]).slice(0, 10).map((e: any) => ({
      tier: e.tier,
      amountUsd: Number(e.amountCents) / 100,
      date: e.createdAt,
    })),
  };
}
