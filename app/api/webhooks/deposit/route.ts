// app/api/webhooks/deposit/route.ts
// Enhanced deposit webhook with RPC transaction validation
// Validates transaction hash, confirmations, and destination before crediting

import { NextRequest, NextResponse } from "next/server";
import { verifyAlchemySignature } from "@/lib/alchemy";
import { prisma } from "@/lib/prisma";
import { processDeposit } from "@/services/transaction.service";
import { getPrices } from "@/services/price.service";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Minimum confirmations required to trust a deposit
const MIN_CONFIRMATIONS = 12;

/**
 * Validate transaction on-chain via RPC
 * Ensures the transaction actually exists and is confirmed
 */
async function validateTransactionOnChain(
  txHash: string,
  toAddress: string,
  expectedAmount: bigint
): Promise<boolean> {
  try {
    // Fetch transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      console.warn(`[deposit-webhook] TX not found: ${txHash}`);
      return false;
    }

    // Check destination matches
    if (receipt.to?.toLowerCase() !== toAddress.toLowerCase()) {
      console.warn(`[deposit-webhook] Destination mismatch for ${txHash}`);
      return false;
    }

    // Check status (1 = success, 0 = failed)
    if (receipt.status !== "success") {
      console.warn(`[deposit-webhook] TX failed: ${txHash}`);
      return false;
    }

    // Get current block number to calculate confirmations
    const currentBlock = await publicClient.getBlockNumber();
    const confirmations = Number(currentBlock) - Number(receipt.blockNumber);

    if (confirmations < MIN_CONFIRMATIONS) {
      console.warn(
        `[deposit-webhook] Insufficient confirmations: ${confirmations} < ${MIN_CONFIRMATIONS}`
      );
      return false;
    }

    console.log(
      `[deposit-webhook] TX validated: ${txHash} (${confirmations} confirmations)`
    );
    return true;
  } catch (error) {
    console.error(`[deposit-webhook] RPC validation failed for ${txHash}:`, error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-alchemy-signature") ?? "";

  // Security: reject any request that fails HMAC verification
  if (!verifyAlchemySignature(rawBody, signature)) {
    console.warn("[deposit-webhook] Invalid HMAC signature");
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
    const rawAmount: number = activity.value ?? 0;

    if (!toAddress || !txHash) continue;

    // Find matching deposit address
    const depositRecord = await prisma.depositAddress.findFirst({
      where: { address: toAddress, used: false },
      include: { user: true },
    });

    if (!depositRecord) continue; // not one of our deposit addresses

    // ─── NEW: RPC Validation ───
    const isValidOnChain = await validateTransactionOnChain(
      txHash,
      toAddress,
      BigInt(Math.round(rawAmount * 1e18)) // rough estimate for validation
    );

    if (!isValidOnChain) {
      console.warn(
        `[deposit-webhook] RPC validation failed for ${txHash}, skipping deposit`
      );
      continue; // Skip this deposit if RPC validation fails
    }

    // Convert token amount to USD cents
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

      console.log(
        `[deposit-webhook] Deposit processed: ${txHash} (${amountCents} cents)`
      );
    } catch (err: any) {
      if (err.message === "DUPLICATE_IDEMPOTENCY_KEY") continue; // already processed
      console.error("[deposit-webhook] Deposit error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
