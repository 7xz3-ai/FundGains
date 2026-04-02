// services/gamification.service.ts
// XP, Levels, Badges, and Daily Streaks system.
// XP is earned for staking, swapping, checking the dashboard, and referrals.
// Levels unlock cosmetic badges and referral tier upgrades.

import { prisma } from "@/lib/prisma";
import { BadgeType, AlertType } from "@prisma/client";

// ---------------------------------------------------------------------------
// XP REWARDS TABLE
// ---------------------------------------------------------------------------
export const XP_REWARDS = {
  FIRST_STAKE: 500,
  STAKE: 100,
  UNSTAKE: 25,
  SWAP: 50,
  DAILY_CHECK_IN: 10,
  STREAK_5_DAY: 200,   // "Market Master" badge
  STREAK_30_DAY: 1000,
  REFERRAL_SIGNUP: 300,
  REFERRAL_TIER2: 100,
} as const;

// Level thresholds — level N requires LEVEL_THRESHOLDS[N-1] total XP
const LEVEL_THRESHOLDS = [
  0,      // Level 1: 0 XP
  100,    // Level 2: 100 XP
  500,    // Level 3: 500 XP
  1500,   // Level 4: 1,500 XP
  3000,   // Level 5: 3,000 XP
  6000,   // Level 6: 6,000 XP
  10000,  // Level 7: 10,000 XP
  20000,  // Level 8: 20,000 XP
  50000,  // Level 9: 50,000 XP
  100000, // Level 10: 100,000 XP
];

/**
 * Calculate level from total XP.
 */
export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

/**
 * XP needed for next level.
 */
export function xpToNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = calculateLevel(xp);
  if (level >= LEVEL_THRESHOLDS.length) {
    return { current: xp, needed: 0, progress: 1 };
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const progress = (xp - currentThreshold) / (nextThreshold - currentThreshold);
  return { current: xp - currentThreshold, needed: nextThreshold - currentThreshold, progress };
}

/**
 * Award XP to a user and check for level-up.
 */
export async function awardXP(userId: string, amount: number, reason: string): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
  });

  const newLevel = calculateLevel(user.xp);
  const leveledUp = newLevel > user.level;

  if (leveledUp) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });

    // Create a level-up alert
    await prisma.aIAlert.create({
      data: {
        userId,
        type: AlertType.LEVEL_UP,
        title: `Level Up! You're now Level ${newLevel}`,
        message:
          `Congratulations. Your consistent activity has elevated you to Level ${newLevel}. ` +
          `Continue staking and optimizing your portfolio to unlock additional badges.`,
        metadata: { previousLevel: user.level, newLevel, totalXp: user.xp },
      },
    });
  }

  return { newXp: user.xp, newLevel: leveledUp ? newLevel : user.level, leveledUp };
}

// ---------------------------------------------------------------------------
// BADGES
// ---------------------------------------------------------------------------

/**
 * Award a badge to a user (idempotent — no-op if already earned).
 */
export async function awardBadge(userId: string, badge: BadgeType): Promise<boolean> {
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badge: { userId, badge } },
  });
  if (existing) return false; // already earned

  await prisma.userBadge.create({
    data: { userId, badge },
  });
  return true;
}

/**
 * Check and award automatic badges based on user state.
 */
export async function checkAndAwardBadges(userId: string): Promise<BadgeType[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stakedAssets: { where: { isActive: true } },
      swapHistory: true,
      referrals: true,
    },
  });
  if (!user) return [];

  const awarded: BadgeType[] = [];

  // FIRST_STAKE: has any staked asset
  if (user.stakedAssets.length > 0) {
    if (await awardBadge(userId, BadgeType.FIRST_STAKE)) awarded.push(BadgeType.FIRST_STAKE);
  }

  // YIELD_HUNTER: total accrued yield > 1000 cents ($10)
  const totalYield = user.stakedAssets.reduce(
    (sum: number, a: { accruedYieldCents: bigint }) => sum + Number(a.accruedYieldCents),
    0
  );
  if (totalYield >= 1000) {
    if (await awardBadge(userId, BadgeType.YIELD_HUNTER)) awarded.push(BadgeType.YIELD_HUNTER);
  }

  // DIVERSIFIER: staked in 3+ different vaults
  const uniqueVaults = new Set(user.stakedAssets.map((a: { vaultId: string }) => a.vaultId));
  if (uniqueVaults.size >= 3) {
    if (await awardBadge(userId, BadgeType.DIVERSIFIER)) awarded.push(BadgeType.DIVERSIFIER);
  }

  // WHALE: total staked > $10,000 (1_000_000 cents)
  if (user.stakedBalance >= 1_000_000n) {
    if (await awardBadge(userId, BadgeType.WHALE)) awarded.push(BadgeType.WHALE);
  }

  // SOCIAL_BUTTERFLY: referred 3+ users
  if (user.referrals.length >= 3) {
    if (await awardBadge(userId, BadgeType.SOCIAL_BUTTERFLY)) awarded.push(BadgeType.SOCIAL_BUTTERFLY);
  }

  // SWAP_PRO: 10+ swaps
  if (user.swapHistory.length >= 10) {
    if (await awardBadge(userId, BadgeType.SWAP_PRO)) awarded.push(BadgeType.SWAP_PRO);
  }

  // DIAMOND_HANDS: any position staked for 30+ days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (user.stakedAssets.some((a: { stakedAt: Date }) => a.stakedAt <= thirtyDaysAgo)) {
    if (await awardBadge(userId, BadgeType.DIAMOND_HANDS)) awarded.push(BadgeType.DIAMOND_HANDS);
  }

  return awarded;
}

// ---------------------------------------------------------------------------
// DAILY STREAKS
// ---------------------------------------------------------------------------

/**
 * Record a daily check-in. Returns the updated streak and whether the user
 * earned the MARKET_MASTER badge (5-day streak).
 */
export async function recordDailyCheckIn(userId: string): Promise<{
  currentStreak: number;
  earnedMarketMaster: boolean;
  xpAwarded: number;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  let streak = await prisma.dailyStreak.findUnique({ where: { userId } });

  if (!streak) {
    // First ever check-in
    streak = await prisma.dailyStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastCheckIn: now },
    });
    await awardXP(userId, XP_REWARDS.DAILY_CHECK_IN, "daily_check_in");
    return { currentStreak: 1, earnedMarketMaster: false, xpAwarded: XP_REWARDS.DAILY_CHECK_IN };
  }

  const lastCheckDate = new Date(
    streak.lastCheckIn.getFullYear(),
    streak.lastCheckIn.getMonth(),
    streak.lastCheckIn.getDate()
  );

  // Already checked in today
  if (lastCheckDate.getTime() === todayStart.getTime()) {
    return { currentStreak: streak.currentStreak, earnedMarketMaster: false, xpAwarded: 0 };
  }

  let newStreak: number;
  let xpAwarded = XP_REWARDS.DAILY_CHECK_IN;

  if (lastCheckDate.getTime() === yesterdayStart.getTime()) {
    // Consecutive day
    newStreak = streak.currentStreak + 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  const longestStreak = Math.max(streak.longestStreak, newStreak);

  await prisma.dailyStreak.update({
    where: { userId },
    data: { currentStreak: newStreak, longestStreak, lastCheckIn: now },
  });

  await awardXP(userId, xpAwarded, "daily_check_in");

  // 5-day streak bonus
  let earnedMarketMaster = false;
  if (newStreak === 5) {
    const bonusXp = XP_REWARDS.STREAK_5_DAY;
    await awardXP(userId, bonusXp, "streak_5_day");
    xpAwarded += bonusXp;
    earnedMarketMaster = await awardBadge(userId, BadgeType.MARKET_MASTER);
  }

  // 30-day streak bonus
  if (newStreak === 30) {
    await awardXP(userId, XP_REWARDS.STREAK_30_DAY, "streak_30_day");
    xpAwarded += XP_REWARDS.STREAK_30_DAY;
  }

  return { currentStreak: newStreak, earnedMarketMaster, xpAwarded };
}

/**
 * Get user's gamification summary.
 */
export async function getGamificationSummary(userId: string) {
  const [user, badges, streak] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true } }),
    prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } }),
    prisma.dailyStreak.findUnique({ where: { userId } }),
  ]);

  if (!user) return null;

  return {
    xp: user.xp,
    level: user.level,
    ...xpToNextLevel(user.xp),
    badges: badges.map((b: { badge: BadgeType; earnedAt: Date }) => ({ type: b.badge, earnedAt: b.earnedAt })),
    streak: streak
      ? {
          current: streak.currentStreak,
          longest: streak.longestStreak,
          lastCheckIn: streak.lastCheckIn,
        }
      : { current: 0, longest: 0, lastCheckIn: null },
  };
}
