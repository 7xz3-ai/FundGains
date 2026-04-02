// services/governance.service.ts
// Governance DAO — Weighted Voting (Balance * sqrt(XP)).
// Proposals request treasury funds. Voting is time-bound.

import { prisma } from "@/lib/prisma";

/**
 * Calculate vote power: balance_cents * sqrt(xp)
 * This gives weight to both capital and engagement.
 */
export function calculateVotePower(balanceCents: bigint, xp: number): bigint {
  const sqrtXp = Math.max(1, Math.floor(Math.sqrt(xp)));
  return balanceCents * BigInt(sqrtXp);
}

/**
 * Create a new governance proposal.
 */
export async function createProposal(
  userId: string,
  title: string,
  description: string,
  requestedCents: bigint,
  durationHours: number = 72
) {
  const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  return prisma.proposal.create({
    data: {
      creatorId: userId,
      title,
      description,
      requestedCents,
      endsAt,
    },
  });
}

/**
 * Cast a vote on a proposal. One vote per user per proposal.
 */
export async function castVote(
  proposalId: string,
  userId: string,
  choice: "FOR" | "AGAINST" | "ABSTAIN"
) {
  const [proposal, user] = await Promise.all([
    prisma.proposal.findUnique({ where: { id: proposalId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!proposal || proposal.status !== "ACTIVE") {
    throw new Error("Proposal not active");
  }
  if (new Date() > proposal.endsAt) {
    throw new Error("Voting period has ended");
  }
  if (!user) {
    throw new Error("User not found");
  }

  const totalBalance = user.cashBalance + user.stakedBalance;
  const votePower = calculateVotePower(totalBalance, user.xp);

  if (votePower <= 0n) {
    throw new Error("No vote power — deposit or earn XP first");
  }

  // Upsert handles re-voting (changes vote)
  const existing = await prisma.vote.findUnique({
    where: { proposalId_voterId: { proposalId, voterId: userId } },
  });

  if (existing) {
    // Reverse old vote power
    const reverseField =
      existing.choice === "FOR"
        ? "votesFor"
        : existing.choice === "AGAINST"
        ? "votesAgainst"
        : "votesAbstain";

    const newField =
      choice === "FOR"
        ? "votesFor"
        : choice === "AGAINST"
        ? "votesAgainst"
        : "votesAbstain";

    await prisma.$transaction([
      prisma.vote.update({
        where: { id: existing.id },
        data: { choice, votePower },
      }),
      prisma.proposal.update({
        where: { id: proposalId },
        data: {
          [reverseField]: { decrement: existing.votePower },
          [newField]: { increment: votePower },
        },
      }),
    ]);
  } else {
    const field =
      choice === "FOR"
        ? "votesFor"
        : choice === "AGAINST"
        ? "votesAgainst"
        : "votesAbstain";

    await prisma.$transaction([
      prisma.vote.create({
        data: { proposalId, voterId: userId, choice, votePower },
      }),
      prisma.proposal.update({
        where: { id: proposalId },
        data: {
          [field]: { increment: votePower },
          totalVoters: { increment: 1 },
        },
      }),
    ]);
  }

  return { votePower: Number(votePower) };
}

/**
 * List proposals with pagination.
 */
export async function listProposals(status?: string) {
  const where = status ? { status: status as "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED" } : {};

  const proposals = await prisma.proposal.findMany({
    where,
    include: {
      creator: { select: { walletAddress: true, cyberAlias: true } },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return proposals.map((p: any) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    requestedUsd: Number(p.requestedCents) / 100,
    status: p.status,
    votesFor: Number(p.votesFor),
    votesAgainst: Number(p.votesAgainst),
    votesAbstain: Number(p.votesAbstain),
    totalVoters: p.totalVoters,
    quorumRequired: Number(p.quorumRequired),
    quorumMet: p.votesFor + p.votesAgainst + p.votesAbstain >= p.quorumRequired,
    endsAt: p.endsAt,
    createdAt: p.createdAt,
    creator: p.creator.cyberAlias ?? p.creator.walletAddress.slice(0, 10),
    voteCount: p._count.votes,
  }));
}
