// app/api/prices/route.ts
// Serves live crypto prices via 3-layer cache.
// GET /api/prices?coins=ethereum,bitcoin,usd-coin

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrices } from "@/services/price.service";

const QuerySchema = z.object({
  coins: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean)
    )
    .refine((arr) => arr.length > 0 && arr.length <= 20, {
      message: "Provide 1–20 coin IDs",
    }),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const prices = await getPrices(parsed.data.coins);
  const hasStaleData = prices.some((p) => p.isStale);

  return NextResponse.json(
    {
      prices: prices.map((p) => ({
        coinId: p.coinId,
        symbol: p.symbol,
        priceUsd: Number(p.priceCents) / 100,
        change24hPct: p.change24hBps != null ? p.change24hBps / 100 : null,
        isStale: p.isStale,
      })),
      hasStaleData,
    },
    {
      headers: {
        // CDN: serve for 25s, allow stale for up to 60s while revalidating
        "Cache-Control": "public, s-maxage=25, stale-while-revalidate=60",
      },
    }
  );
}
