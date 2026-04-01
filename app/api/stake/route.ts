// app/api/stake/route.ts
// Stake assets into a vault — atomically deducts cashBalance and creates StakedAsset.
// POST /api/stake  { walletAddress, vaultId, assetSymbol, amountCents, apyBps, idempotencyKey }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processStake, InsufficientFundsError } from "@/services/transaction.service";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  vaultId: z.string().min(1),
  assetSymbol: z.string().min(1).max(10),
  amountCents: z.number().int().positive(), // USD cents to stake
  apyBps: z.number().int().min(0).max(100_000), // basis points
  idempotencyKey: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { walletAddress, vaultId, assetSymbol, amountCents, apyBps, idempotencyKey } =
    parsed.data;

  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const tx = await processStake({
      userId: user.id,
      idempotencyKey,
      amountCents: BigInt(amountCents),
      vaultId,
      assetSymbol,
      apyBps,
    });

    return NextResponse.json({ transactionId: tx.id, status: tx.status });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 422 });
    }
    console.error("[/api/stake]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
