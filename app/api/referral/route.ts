// app/api/referral/route.ts
// GET: Fetch referral stats (code, earnings, count)
// POST: Apply a referral code for a new user

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyReferralCode,
  ensureReferralCode,
  getReferralStats,
} from "@/services/referral.service";

const GetSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const ApplySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  referralCode: z.string().min(1).max(20),
});

export async function GET(req: NextRequest) {
  const parsed = GetSchema.safeParse(
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

  // Ensure user has a referral code
  const code = await ensureReferralCode(user.id, user.walletAddress);
  const stats = await getReferralStats(user.id);

  return NextResponse.json({ ...stats, referralCode: code });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: parsed.data.walletAddress.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user already has a referrer
  if (user.referredById) {
    return NextResponse.json(
      { error: "Already referred by another user" },
      { status: 409 }
    );
  }

  const result = await applyReferralCode(user.id, parsed.data.referralCode);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }

  return NextResponse.json(result);
}
