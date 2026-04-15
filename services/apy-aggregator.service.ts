// services/apy-aggregator.service.ts
// Real-time APY data integration from DeFi aggregators
// Supports Yearn Finance, Aave, and Lido with 5-minute cache TTL

import { prisma } from "@/lib/prisma";

const APY_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export interface VaultAPYData {
  vaultId: string;
  asset: string;
  apyBps: number; // basis points (e.g., 850 = 8.50%)
  source: "yearn" | "aave" | "lido" | "cache" | "fallback";
  tvlUsd: number;
  riskRating?: string;
  lastUpdated: Date;
}

// Fallback APY data (used when aggregator APIs are unavailable)
const FALLBACK_APYS: Record<string, VaultAPYData> = {
  "vault-cbbtc-prime": {
    vaultId: "vault-cbbtc-prime",
    asset: "BTC",
    apyBps: 680,
    source: "fallback",
    tvlUsd: 28_000_000,
    riskRating: "Very Safe",
    lastUpdated: new Date(),
  },
  "vault-usdt-stability": {
    vaultId: "vault-usdt-stability",
    asset: "USDT",
    apyBps: 1150,
    source: "fallback",
    tvlUsd: 56_000_000,
    riskRating: "Very Safe",
    lastUpdated: new Date(),
  },
  "vault-base-eth": {
    vaultId: "vault-base-eth",
    asset: "ETH",
    apyBps: 420,
    source: "fallback",
    tvlUsd: 4_200_000,
    riskRating: "Low",
    lastUpdated: new Date(),
  },
  "vault-usdc-stable": {
    vaultId: "vault-usdc-stable",
    asset: "USDC",
    apyBps: 850,
    source: "fallback",
    tvlUsd: 12_500_000,
    riskRating: "Minimal",
    lastUpdated: new Date(),
  },
};

/**
 * Fetch real-time APY data from Yearn Finance API
 * Yearn provides the most comprehensive vault data for EVM chains
 */
async function fetchYearnAPYs(): Promise<VaultAPYData[]> {
  try {
    const res = await fetch("https://ydaemon.yearn.finance/chains/8453/vaults/all", {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }, // 5-minute cache
    });

    if (!res.ok) throw new Error(`Yearn API ${res.status}`);

    const vaults: any[] = await res.json();

    return vaults
      .filter((v) => v.apy?.net_apy != null)
      .map((v) => ({
        vaultId: `yearn-${v.address.slice(0, 6)}`,
        asset: v.symbol?.split("-")[0] || "UNKNOWN",
        apyBps: Math.round(v.apy.net_apy * 10000), // convert decimal to basis points
        source: "yearn" as const,
        tvlUsd: v.tvl?.total_assets_usd || 0,
        riskRating: v.apy?.net_apy > 0.15 ? "Medium" : "Low",
        lastUpdated: new Date(),
      }))
      .slice(0, 5); // limit to top 5
  } catch (error) {
    console.error("[apy-aggregator] Yearn fetch failed:", error);
    return [];
  }
}

/**
 * Fetch real-time APY data from Aave Protocol
 * Aave provides stable lending rates for USDC, USDT, ETH
 */
async function fetchAaveAPYs(): Promise<VaultAPYData[]> {
  try {
    const res = await fetch(
      "https://aave-api-v2.aave.com/data/liquidity-pools?chainId=8453",
      { next: { revalidate: 300 } }
    );

    if (!res.ok) throw new Error(`Aave API ${res.status}`);

    const data: any = await res.json();

    return (data.reserves || [])
      .filter((r: any) => r.supplyAPY != null)
      .map((r: any) => ({
        vaultId: `aave-${r.symbol}`,
        asset: r.symbol,
        apyBps: Math.round(parseFloat(r.supplyAPY) * 10000),
        source: "aave" as const,
        tvlUsd: parseFloat(r.totalLiquidity) || 0,
        riskRating: "Very Safe",
        lastUpdated: new Date(),
      }))
      .slice(0, 5);
  } catch (error) {
    console.error("[apy-aggregator] Aave fetch failed:", error);
    return [];
  }
}

/**
 * Fetch real-time APY data from Lido (staking)
 * Lido provides staking APY for ETH and other chains
 */
async function fetchLidoAPYs(): Promise<VaultAPYData[]> {
  try {
    const res = await fetch("https://stake.lido.fi/api/stats", {
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`Lido API ${res.status}`);

    const data: any = await res.json();

    return [
      {
        vaultId: "lido-eth",
        asset: "ETH",
        apyBps: Math.round((data.apy || 0.03) * 10000), // Lido ETH staking APY
        source: "lido" as const,
        tvlUsd: data.tvl || 0,
        riskRating: "Very Safe",
        lastUpdated: new Date(),
      },
    ];
  } catch (error) {
    console.error("[apy-aggregator] Lido fetch failed:", error);
    return [];
  }
}

/**
 * Main entry point: fetch all APY data with fallback
 * Uses cache-aside pattern: check DB first, then fetch fresh data
 */
export async function getVaultAPYs(): Promise<VaultAPYData[]> {
  try {
    // Check cache in DB
    const cachedData = await prisma.aPYCache.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
    });

    if (cachedData.length > 0) {
      return cachedData.map((row) => ({
        vaultId: row.vaultId,
        asset: row.asset,
        apyBps: row.apyBps,
        source: (row.source as any) || "cache",
        tvlUsd: Number(row.tvlUsd),
        riskRating: row.riskRating || "Low",
        lastUpdated: row.updatedAt,
      }));
    }

    // Fetch fresh data from all aggregators in parallel
    const [yearnData, aaveData, lidoData] = await Promise.all([
      fetchYearnAPYs(),
      fetchAaveAPYs(),
      fetchLidoAPYs(),
    ]);

    const allData = [...yearnData, ...aaveData, ...lidoData];

    // If all APIs failed, use fallback
    if (allData.length === 0) {
      return Object.values(FALLBACK_APYS);
    }

    // Cache the fresh data
    const expiresAt = new Date(Date.now() + APY_CACHE_TTL_MS);
    await Promise.all(
      allData.map((apy) =>
        prisma.aPYCache.upsert({
          where: { vaultId: apy.vaultId },
          update: {
            apyBps: apy.apyBps,
            tvlUsd: BigInt(Math.round(apy.tvlUsd)),
            source: apy.source,
            expiresAt,
            updatedAt: new Date(),
          },
          create: {
            vaultId: apy.vaultId,
            asset: apy.asset,
            apyBps: apy.apyBps,
            tvlUsd: BigInt(Math.round(apy.tvlUsd)),
            source: apy.source,
            riskRating: apy.riskRating,
            expiresAt,
          },
        })
      )
    );

    return allData;
  } catch (error) {
    console.error("[apy-aggregator] Fatal error:", error);
    return Object.values(FALLBACK_APYS);
  }
}

/**
 * Get APY for a specific vault
 */
export async function getVaultAPY(vaultId: string): Promise<VaultAPYData | null> {
  const allAPYs = await getVaultAPYs();
  return allAPYs.find((apy) => apy.vaultId === vaultId) || null;
}

/**
 * Invalidate APY cache (force refresh on next request)
 */
export async function invalidateAPYCache(): Promise<void> {
  await prisma.aPYCache.deleteMany({});
  console.log("[apy-aggregator] Cache invalidated");
}
