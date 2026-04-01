// app/api/alerts/route.ts
// GET: Fetch user's Smart Alerts (Notification Center feed)
// PATCH: Mark alert as read or dismissed

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getAlerts,
  markAlertRead,
  dismissAlert,
  analyzePortfolio,
} from "@/services/yield-optimizer.service";

const GetSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const PatchSchema = z.object({
  alertId: z.string().cuid(),
  action: z.enum(["read", "dismiss"]),
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

  // Trigger portfolio analysis on fetch (lazy — generates alerts if needed)
  await analyzePortfolio(user.id);

  const alerts = await getAlerts(user.id);
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return NextResponse.json({ alerts, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.action === "read") {
    await markAlertRead(parsed.data.alertId);
  } else {
    await dismissAlert(parsed.data.alertId);
  }

  return NextResponse.json({ success: true });
}
