// services/swap.service.ts
// Mock DEX aggregator for token conversions.
// Uses "Convert" terminology (no jargon). Gasless via Account Abstraction.

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { getPrices } from "@/services/price.service";
import { awardXP, checkAndAwardBadges, XP_REWARDS } from "@/services/gamification.service";

// Mock exchange rates — in production, these come from a DEX aggregator (1inch, LI.FI)
const SUPPORTED_PAIRS = [
  { from: "ETH", to: "USDC", coinIdFrom: "ethereum", coinIdTo: "usd-coin" },
  { from: "USDC", to: "ETH", coinIdFrom: "usd-coin", coinIdTo: "ethereum" },
  { from: "ETH", to: "cbBTC", coinIdFrom: "ethereum", coinIdTo: "bitcoin" },
  { from: "cbBTC", to: "ETH", coinIdFrom: "bitcoin", coinIdTo: "ethereum" },
  { from: "USDC", to: "cbBTC", coinIdFrom: "usd-coin", coinIdTo: "bitcoin" },
  { from: "cbBTC", to: "USDC", coinIdFrom: "bitcoin", coinIdTo: "usd-coin" },
];

interface SwapQuote {
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fromValueUsd: number;
  toValueUsd: number;
  priceImpactPct: number; // shown as "Conversion Impact" in UI
}

interface SwapResult {
  swapId: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  xpEarned: number;
}

/**
 * Get a conversion quote (preview before executing).
 * Uses live prices from the 3-layer cache.
 */
export async function getSwapQuote(
  fromAsset: string,
  toAsset: string,
  fromAmount: number
): Promise<SwapQuote | null> {
  const pair = SUPPORTED_PAIRS.find(
    (p) => p.from === fromAsset && p.to === toAsset
  );
  if (!pair) return null;

  const prices = await getPrices([pair.coinIdFrom, pair.coinIdTo]);
  const fromPrice = prices.find((p) => p.coinId === pair.coinIdFrom);
  const toPrice = prices.find((p) => p.coinId === pair.coinIdTo);

  if (!fromPrice || !toPrice || toPrice.priceCents === 0n) return null;

  const fromValueUsd = fromAmount * (Number(fromPrice.priceCents) / 100);
  const exchangeRate =
    Number(fromPrice.priceCents) / Number(toPrice.priceCents);

  // Mock 0.3% fee (standard DEX fee)
  const feeMultiplier = 0.997;
  const toAmount = fromAmount * exchangeRate * feeMultiplier;
  const toValueUsd = toAmount * (Number(toPrice.priceCents) / 100);

  // Price impact = (fromValueUsd - toValueUsd) / fromValueUsd * 100
  const priceImpactPct =
    fromValueUsd > 0
      ? ((fromValueUsd - toValueUsd) / fromValueUsd) * 100
      : 0;

  return {
    fromAsset,
    toAsset,
    fromAmount,
    toAmount,
    exchangeRate,
    fromValueUsd,
    toValueUsd,
    priceImpactPct,
  };
}

/**
 * Execute a swap (conversion). Records in the ledger and awards XP.
 * In production: sends a gasless UserOperation via Account Abstraction.
 */
export async function executeSwap(
  userId: string,
  fromAsset: string,
  toAsset: string,
  fromAmount: number
): Promise<SwapResult | null> {
  const quote = await getSwapQuote(fromAsset, toAsset, fromAmount);
  if (!quote) return null;

  const swap = await prisma.swapRecord.create({
    data: {
      userId,
      fromAsset,
      toAsset,
      fromAmount: new Decimal(fromAmount.toString()),
      toAmount: new Decimal(quote.toAmount.toString()),
      fromAmountCents: BigInt(Math.round(quote.fromValueUsd * 100)),
      toAmountCents: BigInt(Math.round(quote.toValueUsd * 100)),
      exchangeRate: new Decimal(quote.exchangeRate.toString()),
      // txHash would be set after the on-chain UserOp confirms
    },
  });

  // Award XP and check badges
  const { newXp } = await awardXP(userId, XP_REWARDS.SWAP, "swap_completed");
  await checkAndAwardBadges(userId);

  return {
    swapId: swap.id,
    fromAsset,
    toAsset,
    fromAmount,
    toAmount: quote.toAmount,
    xpEarned: XP_REWARDS.SWAP,
  };
}

/**
 * List supported conversion pairs.
 */
export function getSupportedPairs() {
  return SUPPORTED_PAIRS.map((p) => ({
    from: p.from,
    to: p.to,
  }));
}
