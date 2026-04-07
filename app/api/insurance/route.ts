// app/api/insurance/route.ts
// GET /api/insurance — fetch insurance fund balance for security ticker

import { NextResponse } from "next/server";
import { getInsuranceFund } from "@/services/insurance.service";

export async function GET() {
  try {
    const fund = await getInsuranceFund();
    return NextResponse.json(fund);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
