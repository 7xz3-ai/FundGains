// services/ai.optimizer.ts
// AI Autopilot Engine — Monitors all user balances across global assets
// and generates intelligent rebalance recommendations.
// Uses Prisma.TransactionClient for any automated ledger moves.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Global Vault Registry ───
// All available vaults across all supported assets.

export interface VaultInfo {
  vaultId: string;
  asset: string;
  apyBps: number;
  name: string;
  category: "yield" | "stable" | "growth" | "high-efficiency";
}

export const GLOBAL_VAULT_REGISTRY: VaultInfo[] = [
  // ETH Vaults
  { vaultId: "vault-base-eth",       asset: "ETH",   apyBps: 420,  name: "Base ETH Yield",           category: "yield" },
  { vaultId: "0xVaultETH",           asset: "ETH",   apyBps: 480,  name: "ETH Liquid Vault",         category: "yield" },
  { vaultId: "0xVaultETH_B",         asset: "ETH",   apyBps: 720,  name: "ETH Growth Vault",         category: "growth" },
  // USDC Vaults
  { vaultId: "vault-usdc-stable",    asset: "USDC",  apyBps: 850,  name: "USDC Stable-Vault",        category: "stable" },
  { vaultId: "0xVaultUSDC",          asset: "USDC",  apyBps: 850,  name: "USDC Stable Vault",        category: "stable" },
  { vaultId: "0xVaultUSDC_B",        asset: "USDC",  apyBps: 1100, name: "USDC High-Yield Vault",    category: "growth" },
  // SOL Vaults
  { vaultId: "vault-sol-liquid",     asset: "SOL",   apyBps: 710,  name: "Solana Liquid Stake",       category: "yield" },
  // BTC Vaults
  { vaultId: "vault-cbbtc-prime",    asset: "cbBTC", apyBps: 680,  name: "cbBTC Prime Yield",         category: "yield" },
  { vaultId: "0xVaultBTC",           asset: "cbBTC", apyBps: 320,  name: "cbBTC Growth Vault",        category: "growth" },
  // USDT Vaults
  { vaultId: "vault-usdt-stability", asset: "USDT",  apyBps: 1150, name: "USDT Stability Pool",       category: "stable" },
  // TRX Vaults
  { vaultId: "vault-trx-efficiency", asset: "TRX",   apyBps: 520,  name: "TRX High-Efficiency Stake", category: "high-efficiency" },
  // LINK Vaults
  { vaultId: "vault-link-oracle",    asset: "LINK",  apyBps: 390,  name: "LINK Oracle Staking",       category: "yield" },
  // AERO Vaults
  { vaultId: "vault-aero-base",      asset: "AERO",  apyBps: 1800, name: "AERO Base Ecosystem",       category: "growth" },
];

// ─── Autopilot Configuration ───

interface AutopilotConfig {
  enabled: boolean;
  riskTolerance: "conservative" | "balanced" | "aggressive";
  autoRebalance: boolean;
  minYieldImprovementBps: number;
}

const DEFAULT_CONFIG: AutopilotConfig = {
  enabled: false,
  riskTolerance: "balanced",
  autoRebalance: false,
  minYieldImprovementBps: 200, // 2% minimum improvement to trigger alert
};

// In-memory config per wallet (in production, persisted to DB)
const autopilotConfigs = new Map<string, AutopilotConfig>();

/**
 * Get or initialize autopilot config for a wallet.
 */
export function getAutopilotConfig(walletAddress: string): AutopilotConfig {
  return autopilotConfigs.get(walletAddress) ?? { ...DEFAULT_CONFIG };
}

/**
 * Update autopilot config for a wallet.
 */
export function setAutopilotConfig(
  walletAddress: string,
  updates: Partial<AutopilotConfig>
): AutopilotConfig {
  const current = getAutopilotConfig(walletAddress);
  const updated = { ...current, ...updates };
  autopilotConfigs.set(walletAddress, updated);
  return updated;
}

// ─── AI Analysis Engine ───

export interface RebalanceRecommendation {
  id: string;
  type: "yield_upgrade" | "cross_asset_opportunity" | "risk_reduction" | "concentration";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  currentVaultId?: string;
  currentAsset: string;
  currentApyBps: number;
  suggestedVaultId: string;
  suggestedAsset: string;
  suggestedApyBps: number;
  estimatedAnnualGainUsd: number;
  actionLabel: string;
}

/**
 * AI Autopilot: Analyze all user positions and generate smart recommendations.
 * Monitors balances across ALL assets (including BTC, USDT, TRX).
 */
export async function analyzePortfolioAutopilot(
  userId: string,
  walletAddress: string
): Promise<RebalanceRecommendation[]> {
  const config = getAutopilotConfig(walletAddress);
  const recommendations: RebalanceRecommendation[] = [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stakedAssets: { where: { isActive: true } } },
  });

  if (!user) return recommendations;

  let recIndex = 0;

  // --- 1. Cross-Asset Yield Opportunities ---
  // If user has ETH staked at low APY, suggest cbBTC vault if it yields 2%+ more
  for (const position of user.stakedAssets) {
    // Find ALL vaults (including cross-asset) that beat current by 2%+
    const betterVaults = GLOBAL_VAULT_REGISTRY.filter((v) => {
      const improvement = v.apyBps - position.apyBps;
      return (
        v.vaultId !== position.vaultId &&
        improvement >= config.minYieldImprovementBps
      );
    }).sort((a, b) => b.apyBps - a.apyBps);

    // Same-asset upgrades
    const sameAssetBetter = betterVaults.filter(
      (v) => v.asset === position.assetSymbol
    );
    if (sameAssetBetter.length > 0) {
      const best = sameAssetBetter[0];
      const principalUsd = Number(position.principalCents) / 100;
      const annualGain =
        (principalUsd * (best.apyBps - position.apyBps)) / 10000;

      recommendations.push({
        id: `rec-${recIndex++}`,
        type: "yield_upgrade",
        priority: annualGain > 100 ? "high" : "medium",
        title: `Upgrade to ${best.name}`,
        description:
          `Your ${position.assetSymbol} is earning ${(position.apyBps / 100).toFixed(2)}% APY. ` +
          `${best.name} offers ${(best.apyBps / 100).toFixed(2)}% — ` +
          `an additional $${annualGain.toFixed(2)}/year.`,
        currentVaultId: position.vaultId,
        currentAsset: position.assetSymbol,
        currentApyBps: position.apyBps,
        suggestedVaultId: best.vaultId,
        suggestedAsset: best.asset,
        suggestedApyBps: best.apyBps,
        estimatedAnnualGainUsd: annualGain,
        actionLabel: "1-Click Re-stake",
      });
    }

    // Cross-asset opportunities (e.g., ETH → cbBTC vault)
    if (config.riskTolerance !== "conservative") {
      const crossAssetBetter = betterVaults.filter(
        (v) => v.asset !== position.assetSymbol
      );
      if (crossAssetBetter.length > 0) {
        const best = crossAssetBetter[0];
        const principalUsd = Number(position.principalCents) / 100;
        const annualGain =
          (principalUsd * (best.apyBps - position.apyBps)) / 10000;

        if (annualGain > 50) {
          recommendations.push({
            id: `rec-${recIndex++}`,
            type: "cross_asset_opportunity",
            priority: annualGain > 200 ? "high" : "low",
            title: `Cross-Asset: ${best.name}`,
            description:
              `${best.asset} vault "${best.name}" yields ${(best.apyBps / 100).toFixed(2)}% APY — ` +
              `${((best.apyBps - position.apyBps) / 100).toFixed(2)}% higher than your current ${position.assetSymbol} position. ` +
              `Rebalancing could earn an additional $${annualGain.toFixed(2)}/year.`,
            currentVaultId: position.vaultId,
            currentAsset: position.assetSymbol,
            currentApyBps: position.apyBps,
            suggestedVaultId: best.vaultId,
            suggestedAsset: best.asset,
            suggestedApyBps: best.apyBps,
            estimatedAnnualGainUsd: annualGain,
            actionLabel: "Rebalance",
          });
        }
      }
    }
  }

  // --- 2. Idle Balance Detection ---
  // If user has no stakes but has a balance, suggest the best vault
  if (user.stakedAssets.length === 0) {
    const topVault = GLOBAL_VAULT_REGISTRY.sort(
      (a, b) => b.apyBps - a.apyBps
    )[0];
    recommendations.push({
      id: `rec-${recIndex++}`,
      type: "yield_upgrade",
      priority: "high",
      title: "Start Earning Yield",
      description:
        `Your funds are sitting idle. ${topVault.name} offers ${(topVault.apyBps / 100).toFixed(2)}% APY — ` +
        `put your assets to work with a single click.`,
      currentAsset: "ETH",
      currentApyBps: 0,
      suggestedVaultId: topVault.vaultId,
      suggestedAsset: topVault.asset,
      suggestedApyBps: topVault.apyBps,
      estimatedAnnualGainUsd: 0,
      actionLabel: "Start Staking",
    });
  }

  return recommendations;
}

/**
 * Execute an AI-recommended rebalance using Prisma transactions.
 * Strictly uses Prisma.TransactionClient for ledger safety.
 */
export async function executeRebalance(
  userId: string,
  fromVaultId: string,
  toVaultId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Find the position to rebalance
      const position = await tx.stakedAsset.findFirst({
        where: { userId, vaultId: fromVaultId, isActive: true },
      });

      if (!position) {
        throw new Error("Position not found or already inactive");
      }

      const targetVault = GLOBAL_VAULT_REGISTRY.find(
        (v) => v.vaultId === toVaultId
      );
      if (!targetVault) {
        throw new Error("Target vault not found");
      }

      // Deactivate old position
      await tx.stakedAsset.update({
        where: { id: position.id },
        data: { isActive: false },
      });

      // Create new position in target vault
      await tx.stakedAsset.create({
        data: {
          userId,
          assetSymbol: targetVault.asset,
          vaultId: targetVault.vaultId,
          apyBps: targetVault.apyBps,
          principalCents: position.principalCents,
          amountStaked: position.amountStaked,
          isActive: true,
        },
      });
    });

    return { success: true, message: "Rebalance completed successfully" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Rebalance failed",
    };
  }
}
