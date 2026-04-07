// app/api/withdraw/route.ts
// GET  — list user's withdrawals
// POST — create a new withdrawal request

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createWithdrawal, getUserWithdrawals } from "@/services/withdraw.service";

const WithdrawSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  asset: z.enum(["USDC", "USDT"]),
  amountUsd: z.number().min(10),
  bankRef: z.string().optional(),
  provider: z.enum(["TRANSAK", "MOONPAY", "STRIPE"]).optional(),
});

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("walletAddress");
  if (!wallet) {
    return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) {
    return NextResponse.json({ withdrawals: [] });
  }

  const withdrawals = await getUserWithdrawals(user.id);
  return NextResponse.json({ withdrawals });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = WithdrawSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: parsed.data.walletAddress },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await createWithdrawal(
      user.id,
      parsed.data.asset,
      BigInt(Math.round(parsed.data.amountUsd * 100)),
      parsed.data.bankRef,
      parsed.data.provider
    );

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
