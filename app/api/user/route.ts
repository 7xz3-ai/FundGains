// app/api/user/route.ts
// Get or create user record on wallet connect.
// POST /api/user  { walletAddress }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser, getDisplayName } from "@/services/profile.service";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const user = await getOrCreateUser(parsed.data.walletAddress);

  // Fetch active staked positions
  const stakedAssets = await prisma.stakedAsset.findMany({
    where: { userId: user.id, isActive: true },
  });

  return NextResponse.json({
    id: user.id,
    walletAddress: user.walletAddress,
    displayName: getDisplayName(user),
    ensName: user.ensName,
    cyberAlias: user.cyberAlias,
    cashBalanceUsd: Number(user.cashBalance) / 100,
    stakedBalanceUsd: Number(user.stakedBalance) / 100,
    stakedAssets: stakedAssets.map((a) => ({
      id: a.id,
      assetSymbol: a.assetSymbol,
      vaultId: a.vaultId,
      amountStaked: a.amountStaked.toString(),
      apyBps: a.apyBps,
      principalUsd: Number(a.principalCents) / 100,
      accruedYieldUsd: Number(a.accruedYieldCents) / 100,
      stakedAt: a.stakedAt,
    })),
  });
}
