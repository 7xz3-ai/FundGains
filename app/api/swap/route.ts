// app/api/swap/route.ts
// Real-world swap execution via 1inch DEX aggregator on Base
// GET: Get a swap quote from 1inch
// POST: Execute a swap and record it in the database

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getSwapQuote,
  recordSwap,
  validateSwapParams,
  estimateSwapGas,
} from "@/services/swap-1inch.service";

const QuoteSchema = z.object({
  fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  slippage: z.number().optional().default(1),
});

const ExecuteSchema = z.object({
  userId: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  toAmount: z.string(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);

  const parsed = QuoteSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 }
    );
  }

  const validation = validateSwapParams(
    parsed.data.fromToken,
    parsed.data.toToken,
    parsed.data.amount,
    "0"
  );

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const quote = await getSwapQuote(
    parsed.data.fromToken,
    parsed.data.toToken,
    parsed.data.amount,
    parsed.data.userAddress,
    parsed.data.slippage
  );

  if (!quote) {
    return NextResponse.json(
      { error: "Failed to fetch quote from 1inch" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    quote: {
      fromToken: quote.fromToken,
      toToken: quote.toToken,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      toAmountMin: quote.toAmountMin,
      estimatedGas: quote.estimatedGas,
      gasPrice: quote.gasPrice,
      fee: quote.fee,
      allowanceTarget: quote.allowanceTarget,
      protocols: quote.protocols,
      tx: quote.tx,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ExecuteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const result = await recordSwap(
      parsed.data.userId,
      parsed.data.fromToken,
      parsed.data.toToken,
      parsed.data.amount,
      parsed.data.toAmount,
      parsed.data.txHash,
      BigInt(0)
    );

    await prisma.transaction.create({
      data: {
        userId: parsed.data.userId,
        type: "SWAP",
        idempotencyKey: `swap-${parsed.data.txHash}`,
        amountCents: BigInt(Math.round(parseFloat(parsed.data.toAmount) * 100)),
        txHash: parsed.data.txHash,
        status: "CONFIRMED",
      },
    });

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: parsed.data.userId },
    });

    if (userProfile) {
      await prisma.userProfile.update({
        where: { userId: parsed.data.userId },
        data: {
          xp: userProfile.xp + 50,
        },
      });

      const swapCount = await prisma.swapRecord.count({
        where: { userId: parsed.data.userId },
      });

      if (swapCount >= 10) {
        await prisma.userBadge.upsert({
          where: {
            userId_badge: { userId: parsed.data.userId, badge: "SWAP_PRO" },
          },
          update: {},
          create: {
            userId: parsed.data.userId,
            badge: "SWAP_PRO",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        txHash: result.txHash,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        fromAsset: result.fromAsset,
        toAsset: result.toAsset,
        fee: result.fee.toString(),
        executedAt: result.executedAt,
      },
    });
  } catch (error) {
    console.error("[swap-api] Error:", error);
    return NextResponse.json(
      { error: "Swap execution failed" },
      { status: 500 }
    );
  }
}
