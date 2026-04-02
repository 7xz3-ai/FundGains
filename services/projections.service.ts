// services/projections.service.ts
// Bull Market Mode projections:
// Shows realistic APY-based yield AND a 2x price scenario side-by-side.
// Clearly labeled as simulation — not financial advice.

export interface Holding {
  coinId: string;
  symbol: string;
  amount: number; // token units (e.g. 1.5 ETH)
  priceCents: bigint;
}

export interface VaultProjection {
  coinId: string;
  symbol: string;
  amountTokens: number;
  currentValueCents: bigint;

  // Realistic: current price + APY yield only
  realisticYield1yCents: bigint;
  realisticTotal1yCents: bigint;

  // Bull Market: 2x price + APY yield (simulation)
  bullMarketYield1yCents: bigint;
  bullMarketTotal1yCents: bigint;

  apyBps: number;
}

/**
 * Calculate 1-year projections for a staking position.
 *
 * @param holding  - On-chain holding (amount + current price)
 * @param apyBps   - APY in basis points (500 = 5.00%)
 * @returns        Realistic and Bull Market projections
 */
export function calculateProjection(
  holding: Holding,
  apyBps: number
): VaultProjection {
  const currentValueCents = BigInt(
    Math.round(holding.amount * Number(holding.priceCents))
  );

  // Realistic: principal * (1 + APY)
  const realisticYield1yCents = (currentValueCents * BigInt(apyBps)) / 10_000n;
  const realisticTotal1yCents = currentValueCents + realisticYield1yCents;

  // Bull Market: price doubles first, then APY applies
  const bullPriceCents = holding.priceCents * 2n;
  const bullValueCents = BigInt(
    Math.round(holding.amount * Number(bullPriceCents))
  );
  const bullMarketYield1yCents = (bullValueCents * BigInt(apyBps)) / 10_000n;
  const bullMarketTotal1yCents = bullValueCents + bullMarketYield1yCents;

  return {
    coinId: holding.coinId,
    symbol: holding.symbol,
    amountTokens: holding.amount,
    currentValueCents,
    realisticYield1yCents,
    realisticTotal1yCents,
    bullMarketYield1yCents,
    bullMarketTotal1yCents,
    apyBps,
  };
}

/**
 * Aggregate projections for a portfolio of holdings.
 */
export function calculatePortfolioProjections(
  holdings: Holding[],
  apyBpsMap: Record<string, number>,
  defaultApyBps = 500 // 5% default
) {
  const projections = holdings.map((h) =>
    calculateProjection(h, apyBpsMap[h.coinId] ?? defaultApyBps)
  );

  const totalCurrentCents = projections.reduce(
    (sum, p) => sum + p.currentValueCents,
    0n
  );
  const totalRealistic1yCents = projections.reduce(
    (sum, p) => sum + p.realisticTotal1yCents,
    0n
  );
  const totalBullMarket1yCents = projections.reduce(
    (sum, p) => sum + p.bullMarketTotal1yCents,
    0n
  );

  return {
    projections,
    totals: {
      currentValueCents: totalCurrentCents,
      realisticTotal1yCents: totalRealistic1yCents,
      bullMarketTotal1yCents: totalBullMarket1yCents,
      realisticGainCents: totalRealistic1yCents - totalCurrentCents,
      bullMarketGainCents: totalBullMarket1yCents - totalCurrentCents,
    },
  };
}

/** Format BigInt cents as a human-readable USD string, e.g. "$1,234.56" */
export function formatCents(cents: bigint): string {
  const dollars = Number(cents) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(dollars);
}
