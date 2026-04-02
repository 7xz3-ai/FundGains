// services/price.service.ts
// Multi-layer crypto price cache to avoid CoinGecko rate limits (50 calls/min).
//
// Layer 1 — In-memory Map (30s TTL, zero latency, per-process)
// Layer 2 — PostgreSQL PriceCache table (5min TTL, survives restarts)
// Layer 3 — CoinGecko API (batched single request, last resort)
// Fallback — Serve stale DB data with isStale=true flag if API is down

import { prisma } from "@/lib/prisma";

const MEM_TTL_MS = 30_000; // 30 seconds
const DB_TTL_MS = 5 * 60_000; // 5 minutes
const STALE_REVALIDATE_MS = 30_000; // trigger background refresh after 30s

type MemEntry = { priceCents: bigint; expiresAt: number };
const memCache = new Map<string, MemEntry>();

// Guard against concurrent duplicate background fetches
const revalidating = new Set<string>();

export interface PriceResult {
  coinId: string;
  symbol: string;
  priceCents: bigint;
  change24hBps: number | null;
  isStale: boolean;
  source: "memory" | "db" | "api" | "fallback";
}

// ---------------------------------------------------------------------------
// getPrices — main entry point
// ---------------------------------------------------------------------------
export async function getPrices(coinIds: string[]): Promise<PriceResult[]> {
  const results: PriceResult[] = [];
  const needsDbLookup: string[] = [];

  // --- Layer 1: in-memory ---
  for (const coinId of coinIds) {
    const entry = memCache.get(coinId);
    if (entry && entry.expiresAt > Date.now()) {
      results.push({
        coinId,
        symbol: coinId,
        priceCents: entry.priceCents,
        change24hBps: null,
        isStale: false,
        source: "memory",
      });
    } else {
      needsDbLookup.push(coinId);
    }
  }

  if (needsDbLookup.length === 0) return results;

  // --- Layer 2: database ---
  const dbRows = await prisma.priceCache.findMany({
    where: { coinId: { in: needsDbLookup } },
  });

  const stillNeedFetch: string[] = [];

  for (const row of dbRows) {
    const ageMs = Date.now() - row.updatedAt.getTime();
    const isStale = ageMs >= DB_TTL_MS;

    // Always serve from DB while deciding if refresh is needed
    results.push({
      coinId: row.coinId,
      symbol: row.symbol,
      priceCents: row.priceCents,
      change24hBps: row.change24hBps ?? null,
      isStale,
      source: "db",
    });

    // Repopulate Layer 1
    memCache.set(row.coinId, {
      priceCents: row.priceCents,
      expiresAt: Date.now() + MEM_TTL_MS,
    });

    if (isStale) {
      stillNeedFetch.push(row.coinId);
    } else if (ageMs > STALE_REVALIDATE_MS && !revalidating.has(row.coinId)) {
      // Stale-while-revalidate: refresh in background, don't block response
      revalidating.add(row.coinId);
      fetchAndCache([row.coinId]).finally(() => revalidating.delete(row.coinId));
    }
  }

  // Coins not found in DB at all
  const foundInDb = new Set(dbRows.map((r) => r.coinId));
  const missing = needsDbLookup.filter((id) => !foundInDb.has(id));
  const toFetch = [...new Set([...stillNeedFetch, ...missing])];

  if (toFetch.length === 0) return results;

  // --- Layer 3: CoinGecko API (batched) ---
  try {
    const fresh = await fetchAndCache(toFetch);
    // Replace stale results with fresh ones
    for (const f of fresh) {
      const idx = results.findIndex((r) => r.coinId === f.coinId);
      if (idx >= 0) {
        results[idx] = f;
      } else {
        results.push(f);
      }
    }
  } catch {
    // Fallback: mark stale results as fallback — already in results array
    // Missing coins that have no DB entry cannot be served
  }

  return results;
}

// ---------------------------------------------------------------------------
// fetchAndCache — call CoinGecko in one batched request, upsert DB + memory
// ---------------------------------------------------------------------------
async function fetchAndCache(coinIds: string[]): Promise<PriceResult[]> {
  const idsParam = coinIds.join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, {
    headers: process.env.COINGECKO_API_KEY
      ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY }
      : {},
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data: Record<string, { usd: number; usd_24h_change?: number }> = await res.json();

  const results: PriceResult[] = [];
  const now = new Date();

  for (const coinId of coinIds) {
    // Special case for REF (mocked)
    if (coinId === "real-estate-fund") {
      const priceCents = BigInt(10000); // $100.00
      results.push({
        coinId,
        symbol: "REF",
        priceCents,
        change24hBps: 5, // 0.05%
        isStale: false,
        source: "api",
      });
      continue;
    }

    if (!data[coinId]) continue;

    const priceCents = BigInt(Math.round(data[coinId].usd * 100));
    const change24hBps = data[coinId].usd_24h_change != null
      ? Math.round(data[coinId].usd_24h_change! * 100)
      : null;

    // Upsert Layer 2
    await prisma.priceCache.upsert({
      where: { coinId },
      update: { priceCents, change24hBps, isStale: false, fetchedAt: now },
      create: {
        coinId,
        symbol: coinId.toUpperCase().slice(0, 10),
        priceCents,
        change24hBps,
        fetchedAt: now,
      },
    });

    // Update Layer 1
    memCache.set(coinId, { priceCents, expiresAt: Date.now() + MEM_TTL_MS });

    results.push({
      coinId,
      symbol: coinId.toUpperCase().slice(0, 10),
      priceCents,
      change24hBps,
      isStale: false,
      source: "api",
    });
  }

  return results;
}
