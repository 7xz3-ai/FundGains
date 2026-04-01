// app/api/gamification/route.ts
// GET: Fetch gamification summary (XP, level, badges, streak)
// POST: Record daily check-in

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getGamificationSummary,
  recordDailyCheckIn,
  checkAndAwardBadges,
} from "@/services/gamification.service";

const WalletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function GET(req: NextRequest) {
  const parsed = WalletSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: parsed.data.walletAddress.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check for any new badges on load
  await checkAndAwardBadges(user.id);

  const summary = await getGamificationSummary(user.id);
  return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = WalletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: parsed.data.walletAddress.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await recordDailyCheckIn(user.id);
  return NextResponse.json(result);
}
