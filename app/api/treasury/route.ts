// app/api/treasury/route.ts
// GET /api/treasury — fetch community treasury balance & stats

import { NextResponse } from "next/server";
import { getTreasury } from "@/services/treasury.service";

export async function GET() {
  try {
    const treasury = await getTreasury();
    return NextResponse.json(treasury);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
