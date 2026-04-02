// services/market.service.ts
// Client-side helper to fetch live market prices for ETH, USDC, SOL.
// Uses the app's existing /api/prices endpoint which proxies CoinGecko
// with a 3-layer cache (memory → DB → API).

export interface MarketPrice {
  coinId: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number | null;
  isStale: boolean;
}

const COIN_META: Record<string, { symbol: string; name: string }> = {
  ethereum: { symbol: "ETH", name: "Ethereum" },
  "usd-coin": { symbol: "USDC", name: "USD Coin" },
  solana: { symbol: "SOL", name: "Solana" },
};

const COIN_IDS = Object.keys(COIN_META);

/**
 * Fetch live prices for ETH, USDC, and SOL via the internal API.
 * Falls back to hardcoded prices if the API is unreachable.
 */
export async function fetchMarketPrices(): Promise<MarketPrice[]> {
  try {
    const res = await fetch(`/api/prices?coins=${COIN_IDS.join(",")}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    return (data.prices ?? []).map(
      (p: {
        coinId: string;
        symbol: string;
        priceUsd: number;
        change24hPct: number | null;
        isStale: boolean;
      }) => {
        const meta = COIN_META[p.coinId];
        return {
          coinId: p.coinId,
          symbol: meta?.symbol ?? p.symbol,
          name: meta?.name ?? p.coinId,
          priceUsd: p.priceUsd,
          change24hPct: p.change24hPct,
          isStale: p.isStale,
        };
      }
    );
  } catch {
    // Fallback prices if API is down
    return [
      {
        coinId: "ethereum",
        symbol: "ETH",
        name: "Ethereum",
        priceUsd: 3500,
        change24hPct: null,
        isStale: true,
      },
      {
        coinId: "usd-coin",
        symbol: "USDC",
        name: "USD Coin",
        priceUsd: 1.0,
        change24hPct: null,
        isStale: true,
      },
      {
        coinId: "solana",
        symbol: "SOL",
        name: "Solana",
        priceUsd: 140,
        change24hPct: null,
        isStale: true,
      },
    ];
  }
}

/**
 * Get the ETH price in USD from a prices array.
 * Returns fallback $3,500 if not found.
 */
export function getEthPrice(prices: MarketPrice[]): number {
  return prices.find((p) => p.coinId === "ethereum")?.priceUsd ?? 3500;
}
