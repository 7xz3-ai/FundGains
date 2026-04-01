// app/api/deposit/route.ts
// Generate a P2P deposit address for a user on Base.
// POST /api/deposit  { walletAddress, assetSymbol }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/services/profile.service";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount, hdKeyToAccount } from "viem/accounts";

const BodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  assetSymbol: z.string().min(1).max(10).default("ETH"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { walletAddress, assetSymbol } = parsed.data;

  // Get or create user record
  const user = await getOrCreateUser(walletAddress);

  // Check if an unused deposit address already exists for this user+asset
  const existing = await prisma.depositAddress.findFirst({
    where: { userId: user.id, assetSymbol, used: false },
  });
  if (existing) {
    return NextResponse.json({ address: existing.address, assetSymbol });
  }

  // Derive a new HD wallet address for this user
  // Master seed is stored in env — never exposed to client
  const masterSeed = process.env.DEPOSIT_WALLET_SEED;
  if (!masterSeed) {
    return NextResponse.json(
      { error: "Deposit service not configured" },
      { status: 503 }
    );
  }

  // Deterministic index from user CUID (simple hash for demo)
  const addressCount = await prisma.depositAddress.count({
    where: { userId: user.id },
  });
  const index = addressCount;

  // In production: use a proper HD derivation path m/44'/60'/0'/0/{index}
  // Here we generate a simple derived address for illustration
  const crypto = require("crypto");
  const derivedKey = crypto
    .createHmac("sha256", masterSeed)
    .update(`${user.id}:${index}`)
    .digest("hex");
  const account = privateKeyToAccount(`0x${derivedKey}` as `0x${string}`);
  const depositAddress = account.address;

  await prisma.depositAddress.create({
    data: {
      userId: user.id,
      address: depositAddress,
      assetSymbol,
    },
  });

  return NextResponse.json({ address: depositAddress, assetSymbol });
}
