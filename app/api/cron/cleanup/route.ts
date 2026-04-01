// app/api/cron/cleanup/route.ts
// Crash-recovery cron: marks stale PENDING/PROCESSING transactions as FAILED.
// Triggered by Vercel Cron every 5 minutes.
// Protected by CRON_SECRET header to prevent unauthorized calls.

import { NextRequest, NextResponse } from "next/server";
import { cleanupStaleTransactions } from "@/services/transaction.service";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupStaleTransactions();
  return NextResponse.json({ cleaned: result.count });
}
