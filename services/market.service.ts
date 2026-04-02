// services/market.service.ts
// Client-side helper to fetch live market prices for all supported assets.
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

// ─── Asset Metadata ───
// Centralised registry: every supported asset with display info.
// No chain logos — users only see assets (chain abstraction).

export interface AssetMeta {
  coinId: string;
  symbol: string;
  name: string;
  color: string;        // Brand colour for icon backgrounds
  fallbackPrice: number; // Used when API is unreachable
}

export const ASSET_REGISTRY: AssetMeta[] = [
  { coinId: "bitcoin",    symbol: "BTC",  name: "Bitcoin",       color: "#F7931A", fallbackPrice: 84_000 },
  { coinId: "ethereum",   symbol: "ETH",  name: "Ethereum",      color: "#627EEA", fallbackPrice: 3_500 },
  { coinId: "tether",     symbol: "USDT", name: "Tether",        color: "#26A17B", fallbackPrice: 1.00 },
  { coinId: "usd-coin",   symbol: "USDC", name: "USD Coin",      color: "#2775CA", fallbackPrice: 1.00 },
  { coinId: "solana",     symbol: "SOL",  name: "Solana",        color: "#9945FF", fallbackPrice: 140 },
  { coinId: "tron",       symbol: "TRX",  name: "TRON",          color: "#FF0013", fallbackPrice: 0.24 },
  { coinId: "chainlink",  symbol: "LINK", name: "Chainlink",     color: "#2A5ADA", fallbackPrice: 14.50 },
  { coinId: "aerodrome-finance", symbol: "AERO", name: "Aerodrome", color: "#0052FF", fallbackPrice: 0.80 },
];

const COIN_META: Record<string, { symbol: string; name: string }> = {};
for (const a of ASSET_REGISTRY) {
  COIN_META[a.coinId] = { symbol: a.symbol, name: a.name };
}

const COIN_IDS = ASSET_REGISTRY.map((a) => a.coinId);

/**
 * Fetch live prices for all supported assets via the internal API.
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
    return ASSET_REGISTRY.map((a) => ({
      coinId: a.coinId,
      symbol: a.symbol,
      name: a.name,
      priceUsd: a.fallbackPrice,
      change24hPct: null,
      isStale: true,
    }));
  }
}

/**
 * Get the ETH price in USD from a prices array.
 * Returns fallback $3,500 if not found.
 */
export function getEthPrice(prices: MarketPrice[]): number {
  return prices.find((p) => p.coinId === "ethereum")?.priceUsd ?? 3500;
}

/**
 * Get the price of any asset by coinId.
 */
export function getAssetPrice(
  prices: MarketPrice[],
  coinId: string
): number {
  const found = prices.find((p) => p.coinId === coinId);
  if (found) return found.priceUsd;
  return ASSET_REGISTRY.find((a) => a.coinId === coinId)?.fallbackPrice ?? 0;
}

/**
 * Get asset metadata by symbol.
 */
export function getAssetMeta(symbol: string): AssetMeta | undefined {
  return ASSET_REGISTRY.find(
    (a) => a.symbol.toUpperCase() === symbol.toUpperCase()
  );
}
