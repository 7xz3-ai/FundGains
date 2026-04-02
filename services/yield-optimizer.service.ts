// services/yield-optimizer.service.ts
// AI Portfolio Agent — "Professional Banker" personality.
// Compares user stakes against all available vaults and generates
// actionable Smart Alerts when better yield is available.

import { prisma } from "@/lib/prisma";
import { AlertType } from "@prisma/client";

// Vault registry — in production, this comes from on-chain / API
const VAULT_REGISTRY = [
  // ETH Vaults
  { vaultId: "0xVaultETH", asset: "ETH", apyBps: 480, name: "ETH Liquid Vault" },
  { vaultId: "0xVaultETH_B", asset: "ETH", apyBps: 720, name: "ETH Growth Vault" },
  { vaultId: "vault-base-eth", asset: "ETH", apyBps: 420, name: "Base ETH Yield" },
  // USDC Vaults
  { vaultId: "0xVaultUSDC", asset: "USDC", apyBps: 850, name: "USDC Stable Vault" },
  { vaultId: "0xVaultUSDC_B", asset: "USDC", apyBps: 1100, name: "USDC High-Yield Vault" },
  { vaultId: "vault-usdc-stable", asset: "USDC", apyBps: 850, name: "USDC Stable-Vault" },
  // BTC Vaults
  { vaultId: "0xVaultBTC", asset: "cbBTC", apyBps: 320, name: "cbBTC Growth Vault" },
  { vaultId: "vault-cbbtc-prime", asset: "cbBTC", apyBps: 680, name: "cbBTC Prime Yield" },
  // USDT Vaults
  { vaultId: "vault-usdt-stability", asset: "USDT", apyBps: 1150, name: "USDT Stability Pool" },
  // TRX Vaults
  { vaultId: "vault-trx-efficiency", asset: "TRX", apyBps: 520, name: "TRX High-Efficiency Stake" },
  // SOL Vaults
  { vaultId: "vault-sol-liquid", asset: "SOL", apyBps: 710, name: "Solana Liquid Stake" },
  // LINK Vaults
  { vaultId: "vault-link-oracle", asset: "LINK", apyBps: 390, name: "LINK Oracle Staking" },
  // AERO Vaults
  { vaultId: "vault-aero-base", asset: "AERO", apyBps: 1800, name: "AERO Base Ecosystem" },
  { vaultId: "vault-paxg-gold", asset: "PAXG", apyBps: 120, name: "Digital Gold", stabilityGrade: "AAA", category: "Commodities" },
  { vaultId: "vault-usdy-treasury", asset: "USDY", apyBps: 520, name: "U.S. Treasury Yield", stabilityGrade: "AAA", category: "Stability" },
  { vaultId: "vault-ref-rental", asset: "REF", apyBps: 740, name: "Rental Income Fund", stabilityGrade: "A+", category: "Commodities" },
];

// Minimum APY improvement (in bps) to trigger an alert — avoids noise
const MIN_YIELD_IMPROVEMENT_BPS = 100; // 1.00% APY difference

// Concentration threshold — alert if >60% of portfolio in one vault
const CONCENTRATION_THRESHOLD = 0.6;

/**
 * Scan a user's positions and generate Smart Alerts.
 * Called periodically via cron or on dashboard load.
 */
export async function analyzePortfolio(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stakedAssets: { where: { isActive: true } } },
  });

  if (!user || user.stakedAssets.length === 0) return;

  const alerts: Array<{
    type: AlertType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  // --- 1. Yield Upgrade Opportunities ---
  for (const position of user.stakedAssets) {
    const betterVaults = VAULT_REGISTRY.filter(
      (v) =>
        v.asset === position.assetSymbol &&
        v.vaultId !== position.vaultId &&
        v.apyBps - position.apyBps >= MIN_YIELD_IMPROVEMENT_BPS
    );

    if (betterVaults.length > 0) {
      const best = betterVaults.sort((a, b) => b.apyBps - a.apyBps)[0];
      const currentApy = (position.apyBps / 100).toFixed(2);
      const newApy = (best.apyBps / 100).toFixed(2);
      const annualGainCents =
        (Number(position.principalCents) * (best.apyBps - position.apyBps)) / 10000;

      alerts.push({
        type: AlertType.YIELD_UPGRADE,
        title: `Yield Opportunity: ${best.name}`,
        message:
          `Your ${position.assetSymbol} position is earning ${currentApy}% APY. ` +
          `${best.name} currently offers ${newApy}% APY — ` +
          `a potential additional $${(annualGainCents / 100).toFixed(2)}/year on your current stake. ` +
          `Consider reallocating for improved returns.`,
        actionUrl: "/dashboard/vaults",
        metadata: {
          currentVaultId: position.vaultId,
          suggestedVaultId: best.vaultId,
          currentApyBps: position.apyBps,
          suggestedApyBps: best.apyBps,
          additionalYieldCents: Math.round(annualGainCents),
        },
      });
    }
  }

  // --- 2. Concentration Warning ---
  const totalStaked = user.stakedAssets.reduce(
    (sum, a) => sum + Number(a.principalCents),
    0
  );

  if (totalStaked > 0) {
    for (const position of user.stakedAssets) {
      const share = Number(position.principalCents) / totalStaked;
      if (share > CONCENTRATION_THRESHOLD) {
        alerts.push({
          type: AlertType.REBALANCE,
          title: "Portfolio Concentration Alert",
          message:
            `${(share * 100).toFixed(0)}% of your staked portfolio is in a single ${position.assetSymbol} vault. ` +
            `Diversification across multiple assets and vaults can reduce risk. ` +
            `Consider allocating a portion to alternative vaults.`,
          actionUrl: "/dashboard/vaults",
          metadata: {
            concentratedVaultId: position.vaultId,
            concentrationPct: Math.round(share * 100),
          },
        });
      }
    }
  }

  // --- 3. Write alerts (skip duplicates from recent 24h) ---
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const alert of alerts) {
    const existing = await prisma.aIAlert.findFirst({
      where: {
        userId,
        type: alert.type,
        isRead: false,
        createdAt: { gte: oneDayAgo },
      },
    });
    if (!existing) {
      await prisma.aIAlert.create({
        data: {
          userId,
          type: alert.type,
          title: alert.title,
          message: alert.message,
          actionUrl: alert.actionUrl,
          metadata: alert.metadata as any,
        },
      });
    }
  }
}

/**
 * Fetch unread alerts for a user (Notification Center feed).
 */
export async function getAlerts(
  userId: string,
  limit = 20
): Promise<
  Array<{
    id: string;
    type: AlertType;
    title: string;
    message: string;
    actionUrl: string | null;
    isRead: boolean;
    createdAt: Date;
  }>
> {
  return prisma.aIAlert.findMany({
    where: { userId, isDismissed: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      actionUrl: true,
      isRead: true,
      createdAt: true,
    },
  });
}

/**
 * Mark an alert as read.
 */
export async function markAlertRead(alertId: string) {
  return prisma.aIAlert.update({
    where: { id: alertId },
    data: { isRead: true },
  });
}

/**
 * Dismiss an alert permanently.
 */
export async function dismissAlert(alertId: string) {
  return prisma.aIAlert.update({
    where: { id: alertId },
    data: { isDismissed: true, isRead: true },
  });
}
