// app/api/webhooks/alchemy/route.ts
// Handles Alchemy Address Activity webhooks for P2P deposits.
// Verifies HMAC signature, marks DepositAddress as used, credits cashBalance.

import { NextRequest, NextResponse } from "next/server";
import { verifyAlchemySignature } from "@/lib/alchemy";
import { prisma } from "@/lib/prisma";
import { processDeposit } from "@/services/transaction.service";
import { getPrices } from "@/services/price.service";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-alchemy-signature") ?? "";

  // Security: reject any request that fails HMAC verification
  if (!verifyAlchemySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const activities: any[] = payload?.event?.activity ?? [];

  for (const activity of activities) {
    const toAddress: string = activity.toAddress?.toLowerCase();
    const txHash: string = activity.hash;
    const assetSymbol: string = (activity.asset ?? "ETH").toUpperCase();

    if (!toAddress || !txHash) continue;

    // Find matching deposit address
    const depositRecord = await prisma.depositAddress.findFirst({
      where: { address: toAddress, used: false },
      include: { user: true },
    });

    if (!depositRecord) continue; // not one of our deposit addresses

    // Fetch current price to convert token amount to USD cents
    const rawAmount: number = activity.value ?? 0;
    let amountCents = BigInt(0);

    try {
      const coinId = assetSymbol === "ETH" ? "ethereum" : assetSymbol.toLowerCase();
      const prices = await getPrices([coinId]);
      const price = prices[0]?.priceCents ?? BigInt(0);
      amountCents = BigInt(Math.round(rawAmount * Number(price)));
    } catch {
      // If price fetch fails, use raw amount as cents (stablecoin fallback)
      amountCents = BigInt(Math.round(rawAmount * 100));
    }

    if (amountCents <= BigInt(0)) continue;

    // Idempotency key = txHash to prevent duplicate crediting on webhook retries
    try {
      await processDeposit({
        userId: depositRecord.user.id,
        idempotencyKey: txHash,
        amountCents,
        assetSymbol,
        txHash,
      });

      // Mark deposit address as used
      await prisma.depositAddress.update({
        where: { id: depositRecord.id },
        data: { used: true, detectedAt: new Date() },
      });
    } catch (err: any) {
      if (err.message === "DUPLICATE_IDEMPOTENCY_KEY") continue; // already processed
      console.error("[alchemy-webhook] deposit error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
