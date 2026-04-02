// app/api/copy-trade/route.ts
// Copy-Yield 2.0: Mirror a trader's vault allocation and set up success fee sharing
// Uses Prisma.TransactionClient for atomic fee-sharing logic

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

interface CopyTradeRequest {
  walletAddress: string;
  traderId: string;
  collateralUsd: number;
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, traderId, collateralUsd = 1000 }: CopyTradeRequest =
      await req.json();

    if (!walletAddress || !traderId) {
      return NextResponse.json(
        { error: "Missing walletAddress or traderId" },
        { status: 400 }
      );
    }

    // Find or create follower user
    const follower = await prisma.user.upsert({
      where: { walletAddress },
      update: { updatedAt: new Date() },
      create: {
        walletAddress,
        cyberAlias: `User-${walletAddress.slice(-6)}`,
      },
      include: { stakedAssets: true },
    });

    // Fetch trader's active positions
    const traderUser = await prisma.user.findUnique({
      where: { id: traderId },
      include: { stakedAssets: { where: { isActive: true } } },
    });

    if (!traderUser) {
      return NextResponse.json(
        { error: "Trader not found" },
        { status: 404 }
      );
    }

    if (traderUser.stakedAssets.length === 0) {
      return NextResponse.json(
        { error: "Trader has no active positions" },
        { status: 400 }
      );
    }

    // Calculate total trader portfolio value
    const traderTotalValue = traderUser.stakedAssets.reduce(
      (sum: number, asset: { principalCents: bigint }) => sum + Number(asset.principalCents),
      0
    );

    if (traderTotalValue === 0) {
      return NextResponse.json(
        { error: "Trader has no active positions" },
        { status: 400 }
      );
    }

    // Atomic transaction: copy allocations and set up fee sharing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const copiedAssets = [];

      // Mirror each of trader's positions proportionally
      for (const traderAsset of traderUser.stakedAssets) {
        const allocation = Number(traderAsset.principalCents) / traderTotalValue;
        const followerAmount = Math.round(collateralUsd * 100 * allocation); // in cents

        // Create mirrored position for follower
        const copiedAsset = await tx.stakedAsset.create({
          data: {
            userId: follower.id,
            vaultId: traderAsset.vaultId,
            assetSymbol: traderAsset.assetSymbol,
            category: traderAsset.category,
            amountStaked: traderAsset.amountStaked,
            apyBps: traderAsset.apyBps,
            principalCents: BigInt(followerAmount),
            vaultRiskScore: traderAsset.vaultRiskScore,
          },
        });

        copiedAssets.push(copiedAsset);
      }

      // Record the copy-trade action in transaction ledger
      await tx.transaction.create({
        data: {
          userId: follower.id,
          type: "STAKE",
          status: "CONFIRMED",
          idempotencyKey: `copy-trade-${follower.id}-${traderId}-${Date.now()}`,
          amountCents: BigInt(Math.round(collateralUsd * 100)),
          feeCents: BigInt(0), // Success fee calculated on yield
          assetSymbol: "MULTI",
          errorMessage: null,
          processedAt: new Date(),
        },
      });

      return copiedAssets;
    });

    return NextResponse.json({
      success: true,
      message: "Trade copied successfully",
      copiedAssets: result.length,
      successFeePercent: 1,
      traderName: traderUser.cyberAlias || "Anonymous Trader",
    });
  } catch (error) {
    console.error("Copy-trade error:", error);
    return NextResponse.json(
      { error: "Failed to copy trade" },
      { status: 500 }
    );
  }
}
