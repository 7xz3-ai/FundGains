// app/api/launchpad/route.ts
// GET  /api/launchpad — list projects
// POST /api/launchpad — contribute to a project

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listProjects, contribute, seedProjects } from "@/services/launchpad.service";

const ContributeSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  projectId: z.string(),
  amountUsd: z.number().min(1),
});

export async function GET() {
  try {
    // Seed demo projects if none exist
    await seedProjects();
    const projects = await listProjects("ACTIVE");
    return NextResponse.json({ projects });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ContributeSchema.safeParse(body);

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

    const result = await contribute(
      user.id,
      parsed.data.projectId,
      BigInt(Math.round(parsed.data.amountUsd * 100))
    );

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
