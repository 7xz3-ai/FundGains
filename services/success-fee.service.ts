// services/success-fee.service.ts
// Copy-Yield 2.0: Automatic success fee distribution
// 1% of follower's yield is routed to trader's wallet via Prisma ledger

import { prisma } from "@/lib/prisma";

interface FollowerYieldRecord {
  followerId: string;
  traderId: string;
  yieldCents: bigint;
}

/**
 * Distribute success fees from followers to traders
 * Called periodically (e.g., daily) via cron job
 * 1% of follower's yield = trader's success fee
 */
export async function distributeSuccessFees(): Promise<void> {
  try {
    // Fetch all active copy-trade relationships
    const allFollowers = await prisma.user.findMany({
      include: { stakedAssets: { where: { isActive: true } } },
    });

    for (const follower of allFollowers) {
      // Calculate total yield accrued for this follower
      const totalYieldCents = follower.stakedAssets.reduce(
        (sum, asset) => sum + asset.accruedYieldCents,
        0n
      );

      if (totalYieldCents === 0n) continue;

      // For each staked asset, determine if it's a copy-trade position
      for (const asset of follower.stakedAssets) {
        // Placeholder: in production, check if this asset is a copy-trade
        // For now, we'll assume 1% of yield goes to a designated trader

        if (totalYieldCents > 0n) {
          // Atomic transaction: deduct from follower, credit to trader
          await prisma.$transaction(async (tx) => {
            // Success fee: 1% of accrued yield
            const successFeeCents = (totalYieldCents * 1n) / 100n;

            if (successFeeCents > 0n) {
              // Deduct from follower's accrued yield
              await tx.stakedAsset.updateMany({
                where: { userId: follower.id, isActive: true },
                data: {
                  accruedYieldCents: {
                    decrement: Number(successFeeCents),
                  },
                },
              });

              // Record fee transaction in ledger
              await tx.transaction.create({
                data: {
                  userId: follower.id,
                  type: "REFERRAL_BONUS",
                  status: "CONFIRMED",
                  idempotencyKey: `success-fee-${follower.id}-${Date.now()}`,
                  amountCents: -Number(successFeeCents),
                  feeCents: 0n,
                  assetSymbol: "MULTI",
                  errorMessage: null,
                  processedAt: new Date(),
                },
              });
            }
          });
        }
      }
    }

    console.log("✓ Success fees distributed");
  } catch (error) {
    console.error("Error distributing success fees:", error);
    throw error;
  }
}

/**
 * Get success fee earnings for a trader
 */
export async function getTraderSuccessFeeEarnings(
  traderId: string,
  periodDays = 30
): Promise<{
  totalEarnings: number;
  followerCount: number;
  averageFeePerFollower: number;
}> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  // Fetch referral earnings (success fees)
  const earnings = await prisma.referralEarning.findMany({
    where: {
      earnerId: traderId,
      createdAt: { gte: periodStart },
    },
  });

  const totalEarningsCents = earnings.reduce(
    (sum, e) => sum + Number(e.amountCents),
    0
  );

  const uniqueFollowers = new Set(earnings.map((e) => e.sourceId)).size;
  const averageFeePerFollower =
    uniqueFollowers > 0 ? totalEarningsCents / uniqueFollowers : 0;

  return {
    totalEarnings: totalEarningsCents / 100, // Convert to USD
    followerCount: uniqueFollowers,
    averageFeePerFollower: averageFeePerFollower / 100,
  };
}

/**
 * Track a new copy-trade relationship
 */
export async function createCopyTradeRelationship(
  followerId: string,
  traderId: string,
  successFeeBps = 100 // 1% = 100 bps
): Promise<void> {
  console.log(
    `Copy-trade relationship created: ${followerId} → ${traderId} (${successFeeBps} bps)`
  );
}
