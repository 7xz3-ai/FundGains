// app/api/governance/route.ts
// GET  /api/governance — list proposals
// POST /api/governance — create proposal or cast vote

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listProposals, createProposal, castVote } from "@/services/governance.service";

const CreateSchema = z.object({
  action: z.literal("create"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  requestedUsd: z.number().min(0).max(1000000),
  durationHours: z.number().min(1).max(168).optional(),
});

const VoteSchema = z.object({
  action: z.literal("vote"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  proposalId: z.string(),
  choice: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
});

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  try {
    const proposals = await listProposals(status);
    return NextResponse.json({ proposals });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  try {
    if (body.action === "create") {
      const parsed = CreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { walletAddress: parsed.data.walletAddress },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const proposal = await createProposal(
        user.id,
        parsed.data.title,
        parsed.data.description,
        BigInt(Math.round(parsed.data.requestedUsd * 100)),
        parsed.data.durationHours
      );

      return NextResponse.json({ proposalId: proposal.id });
    }

    if (body.action === "vote") {
      const parsed = VoteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { walletAddress: parsed.data.walletAddress },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const result = await castVote(
        parsed.data.proposalId,
        user.id,
        parsed.data.choice
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
