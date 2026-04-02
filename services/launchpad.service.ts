// services/launchpad.service.ts
// Apex Launchpad — community token launches.
// Only users with balance > 0 can contribute.

import { prisma } from "@/lib/prisma";

/**
 * List active launchpad projects.
 */
export async function listProjects(status?: string) {
  const where = status ? { status } : {};

  const projects = await prisma.launchpadProject.findMany({
    where,
    include: { _count: { select: { contributions: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    ticker: p.ticker,
    description: p.description,
    targetUsd: Number(p.targetCents) / 100,
    raisedUsd: Number(p.raisedCents) / 100,
    progressPct: Number(p.raisedCents) / Number(p.targetCents) * 100,
    minContribUsd: Number(p.minContribCents) / 100,
    maxContribUsd: Number(p.maxContribCents) / 100,
    tokenPrice: p.tokenPrice,
    totalSupply: p.totalSupply,
    status: p.status,
    contributors: p._count.contributions,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
  }));
}

/**
 * Contribute to a launchpad project.
 * Requires user balance > 0.
 */
export async function contribute(
  userId: string,
  projectId: string,
  amountCents: bigint
) {
  const [user, project] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.launchpadProject.findUnique({ where: { id: projectId } }),
  ]);

  if (!user) throw new Error("User not found");
  if (!project) throw new Error("Project not found");
  if (project.status !== "ACTIVE") throw new Error("Project not active");
  if (new Date() > project.endsAt) throw new Error("Contribution period ended");

  const totalBalance = user.cashBalance + user.stakedBalance;
  if (totalBalance <= 0n) {
    throw new Error("Balance required — deposit funds first");
  }

  if (user.cashBalance < amountCents) {
    throw new Error("Insufficient cash balance");
  }

  if (amountCents < project.minContribCents) {
    throw new Error(`Minimum contribution: $${Number(project.minContribCents) / 100}`);
  }
  if (amountCents > project.maxContribCents) {
    throw new Error(`Maximum contribution: $${Number(project.maxContribCents) / 100}`);
  }

  // Check for existing contribution
  const existing = await prisma.launchpadContribution.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) {
    throw new Error("Already contributed to this project");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { cashBalance: { decrement: amountCents } },
    }),
    prisma.launchpadContribution.create({
      data: { projectId, userId, amountCents },
    }),
    prisma.launchpadProject.update({
      where: { id: projectId },
      data: { raisedCents: { increment: amountCents } },
    }),
  ]);

  return { success: true };
}

/**
 * Seed demo launchpad projects.
 */
export async function seedProjects() {
  const count = await prisma.launchpadProject.count();
  if (count > 0) return;

  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in45d = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  await prisma.launchpadProject.createMany({
    data: [
      {
        name: "ApexToken",
        ticker: "APEX",
        description: "The governance token for ApexYield DAO. Holders earn protocol revenue share and voting rights on treasury allocation.",
        targetCents: 50000000, // $500k
        tokenPrice: "$0.005",
        totalSupply: "100,000,000",
        endsAt: in30d,
      },
      {
        name: "YieldBridge",
        ticker: "YBDG",
        description: "Cross-chain yield aggregator bridging Base, Arbitrum, and Optimism yields into a single vault layer.",
        targetCents: 25000000, // $250k
        tokenPrice: "$0.01",
        totalSupply: "25,000,000",
        endsAt: in45d,
      },
      {
        name: "RealStack",
        ticker: "RSTK",
        description: "Tokenized real estate yield — earn rental income from commercial properties, on-chain. SEC-exempt under Reg D.",
        targetCents: 100000000, // $1M
        tokenPrice: "$0.10",
        totalSupply: "10,000,000",
        minContribCents: 10000, // $100 min
        endsAt: in30d,
      },
    ],
  });
}
