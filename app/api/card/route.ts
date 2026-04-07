// app/api/card/route.ts
// GET  — get or create virtual metal card
// POST — toggle freeze / view PIN (UI shell)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateCard, toggleFreezeCard } from "@/services/metal-card.service";

const ActionSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  action: z.enum(["freeze", "unfreeze"]),
});

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("walletAddress");
  if (!wallet) {
    return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const card = await getOrCreateCard(user.id);
    return NextResponse.json(card);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);

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

    const result = await toggleFreezeCard(user.id);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
