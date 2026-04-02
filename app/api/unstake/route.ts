// app/api/unstake/route.ts
// Unstake from a vault — returns principal + accrued yield to cashBalance.
// POST /api/unstake  { walletAddress, stakedAssetId, idempotencyKey }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processUnstake } from "@/services/transaction.service";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  stakedAssetId: z.string().cuid(),
  idempotencyKey: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { walletAddress, stakedAssetId, idempotencyKey } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const tx = await processUnstake({
      userId: user.id,
      stakedAssetId,
      idempotencyKey,
      amountCents: BigInt(0), // computed from asset internally
    });

    return NextResponse.json({ transactionId: tx.id, status: tx.status });
  } catch (err) {
    console.error("[/api/unstake]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
