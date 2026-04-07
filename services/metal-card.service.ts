// services/metal-card.service.ts
// Virtual Metal Card — Obsidian tier card management.

import { prisma } from "@/lib/prisma";

function generateMaskedNumber(): string {
  const last4 = Math.floor(1000 + Math.random() * 9000).toString();
  return `**** **** **** ${last4}`;
}

export async function getOrCreateCard(userId: string) {
  let card = await prisma.metalCard.findUnique({ where: { userId } });

  if (!card) {
    const now = new Date();
    card = await prisma.metalCard.create({
      data: {
        userId,
        cardNumber: generateMaskedNumber(),
        expiryMonth: now.getMonth() + 1,
        expiryYear: now.getFullYear() + 4,
        tier: "OBSIDIAN",
      },
    });
  }

  return {
    id: card.id,
    cardNumber: card.cardNumber,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    isFrozen: card.isFrozen,
    tier: card.tier,
    spentUsd: Number(card.spentCents) / 100,
    limitUsd: Number(card.limitCents) / 100,
  };
}

export async function toggleFreezeCard(userId: string) {
  const card = await prisma.metalCard.findUnique({ where: { userId } });
  if (!card) throw new Error("Card not found");

  const updated = await prisma.metalCard.update({
    where: { userId },
    data: { isFrozen: !card.isFrozen },
  });

  return { isFrozen: updated.isFrozen };
}
