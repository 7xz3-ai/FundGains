// app/api/swap/route.ts
// POST: Execute a token conversion (gasless via Account Abstraction).
// GET: Get a swap quote (preview).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSwapQuote, executeSwap, getSupportedPairs } from "@/services/swap.service";

const QuoteSchema = z.object({
  fromAsset: z.string().min(1).max(10),
  toAsset: z.string().min(1).max(10),
  fromAmount: z.coerce.number().positive(),
});

const ExecuteSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fromAsset: z.string().min(1).max(10),
  toAsset: z.string().min(1).max(10),
  fromAmount: z.number().positive(),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);

  // If no params, return supported pairs
  if (!params.fromAsset) {
    return NextResponse.json({ pairs: getSupportedPairs() });
  }

  const parsed = QuoteSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const quote = await getSwapQuote(
    parsed.data.fromAsset,
    parsed.data.toAsset,
    parsed.data.fromAmount
  );

  if (!quote) {
    return NextResponse.json({ error: "Pair not supported" }, { status: 404 });
  }

  return NextResponse.json({
    fromAsset: quote.fromAsset,
    toAsset: quote.toAsset,
    fromAmount: quote.fromAmount,
    toAmount: Number(quote.toAmount.toFixed(8)),
    exchangeRate: Number(quote.exchangeRate.toFixed(8)),
    fromValueUsd: Number(quote.fromValueUsd.toFixed(2)),
    toValueUsd: Number(quote.toValueUsd.toFixed(2)),
    conversionImpact: `${quote.priceImpactPct.toFixed(2)}%`,
    fee: "0.3%",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ExecuteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: parsed.data.walletAddress.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await executeSwap(
    user.id,
    parsed.data.fromAsset,
    parsed.data.toAsset,
    parsed.data.fromAmount
  );

  if (!result) {
    return NextResponse.json({ error: "Swap failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
