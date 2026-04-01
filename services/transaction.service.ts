// services/transaction.service.ts
// Atomic ledger operations using Prisma interactive transactions.
// Every balance mutation is wrapped in a single PostgreSQL transaction —
// if anything throws, Postgres rolls back the entire block (no partial state).

import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus, Prisma } from "@prisma/client";

export class InsufficientFundsError extends Error {
  constructor() {
    super("INSUFFICIENT_FUNDS");
    this.name = "InsufficientFundsError";
  }
}

export class ConcurrentModificationError extends Error {
  constructor() {
    super("CONCURRENT_MODIFICATION");
    this.name = "ConcurrentModificationError";
  }
}

export class DuplicateTransactionError extends Error {
  constructor(public readonly txId: string) {
    super("DUPLICATE_IDEMPOTENCY_KEY");
    this.name = "DuplicateTransactionError";
  }
}

interface BaseTransactionParams {
  userId: string;
  idempotencyKey: string; // client-generated UUID per logical request
  amountCents: bigint;
  assetSymbol?: string;
  assetAmount?: Prisma.Decimal;
  priceAtTimeCents?: bigint;
}

interface StakeParams extends BaseTransactionParams {
  vaultId: string;
  apyBps: number;
}

// ---------------------------------------------------------------------------
// processDeposit — credit cashBalance when P2P inbound detected
// ---------------------------------------------------------------------------
export async function processDeposit(params: BaseTransactionParams & { txHash: string }) {
  // Idempotency: safe replay if same key already confirmed
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing?.status === TransactionStatus.CONFIRMED) return existing;

  return _executeTransaction({
    ...params,
    type: TransactionType.DEPOSIT,
    cashDelta: params.amountCents,
    stakedDelta: 0n,
    txHash: params.txHash,
  });
}

// ---------------------------------------------------------------------------
// processStake — deduct cashBalance, create StakedAsset, credit stakedBalance
// ---------------------------------------------------------------------------
export async function processStake(params: StakeParams) {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing?.status === TransactionStatus.CONFIRMED) return existing;

  return prisma.$transaction(
    async (tx) => {
      // Lock user row
      const users = await tx.$queryRaw<
        Array<{ id: string; cashBalance: bigint; stakedBalance: bigint; version: number }>
      >`SELECT id, "cashBalance", "stakedBalance", version FROM "User" WHERE id = ${params.userId} FOR UPDATE`;

      const user = users[0];
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.cashBalance < params.amountCents) throw new InsufficientFundsError();

      // Create transaction record as PROCESSING (idempotency anchor)
      const ledgerTx = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: TransactionType.STAKE,
          status: TransactionStatus.PROCESSING,
          idempotencyKey: params.idempotencyKey,
          amountCents: params.amountCents,
          assetSymbol: params.assetSymbol,
          assetAmount: params.assetAmount,
          priceAtTimeCents: params.priceAtTimeCents,
        },
      });

      // Deduct cash, credit staked with optimistic lock
      const updated = await tx.user.updateMany({
        where: { id: params.userId, version: user.version },
        data: {
          cashBalance: { decrement: params.amountCents },
          stakedBalance: { increment: params.amountCents },
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) throw new ConcurrentModificationError();

      // Create staked asset position
      const stakedAsset = await tx.stakedAsset.create({
        data: {
          userId: params.userId,
          vaultId: params.vaultId,
          assetSymbol: params.assetSymbol ?? "ETH",
          amountStaked: params.assetAmount ?? new Prisma.Decimal(0),
          apyBps: params.apyBps,
          principalCents: params.amountCents,
        },
      });

      // Confirm transaction
      return tx.transaction.update({
        where: { id: ledgerTx.id },
        data: {
          status: TransactionStatus.CONFIRMED,
          stakedAssetId: stakedAsset.id,
          processedAt: new Date(),
        },
      });
    },
    { timeout: 10_000 }
  );
}

// ---------------------------------------------------------------------------
// processUnstake — credit cashBalance, close StakedAsset, deduct stakedBalance
// ---------------------------------------------------------------------------
export async function processUnstake(
  params: BaseTransactionParams & { stakedAssetId: string }
) {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing?.status === TransactionStatus.CONFIRMED) return existing;

  return prisma.$transaction(
    async (tx) => {
      const users = await tx.$queryRaw<
        Array<{ id: string; cashBalance: bigint; stakedBalance: bigint; version: number }>
      >`SELECT id, "cashBalance", "stakedBalance", version FROM "User" WHERE id = ${params.userId} FOR UPDATE`;

      const user = users[0];
      if (!user) throw new Error("USER_NOT_FOUND");

      const asset = await tx.stakedAsset.findFirst({
        where: { id: params.stakedAssetId, userId: params.userId, isActive: true },
      });
      if (!asset) throw new Error("STAKED_ASSET_NOT_FOUND");

      const totalReturn = asset.principalCents + asset.accruedYieldCents;

      const ledgerTx = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: TransactionType.UNSTAKE,
          status: TransactionStatus.PROCESSING,
          idempotencyKey: params.idempotencyKey,
          amountCents: totalReturn,
          assetSymbol: asset.assetSymbol,
          stakedAssetId: params.stakedAssetId,
        },
      });

      const updated = await tx.user.updateMany({
        where: { id: params.userId, version: user.version },
        data: {
          cashBalance: { increment: totalReturn },
          stakedBalance: { decrement: asset.principalCents },
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) throw new ConcurrentModificationError();

      await tx.stakedAsset.update({
        where: { id: params.stakedAssetId },
        data: { isActive: false, unstakedAt: new Date() },
      });

      return tx.transaction.update({
        where: { id: ledgerTx.id },
        data: { status: TransactionStatus.CONFIRMED, processedAt: new Date() },
      });
    },
    { timeout: 10_000 }
  );
}

// ---------------------------------------------------------------------------
// processWithdrawal — deduct cashBalance (funds go to external address)
// ---------------------------------------------------------------------------
export async function processWithdrawal(params: BaseTransactionParams & { toAddress: string }) {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing?.status === TransactionStatus.CONFIRMED) return existing;

  return _executeTransaction({
    ...params,
    type: TransactionType.WITHDRAWAL,
    cashDelta: -params.amountCents,
    stakedDelta: 0n,
    requireSufficientCash: true,
  });
}

// ---------------------------------------------------------------------------
// cleanupStaleTransactions — run via cron every 5 minutes
// Marks PROCESSING txns older than 15 min as FAILED (crash recovery).
// ---------------------------------------------------------------------------
export async function cleanupStaleTransactions() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  return prisma.transaction.updateMany({
    where: {
      status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
      createdAt: { lt: cutoff },
    },
    data: {
      status: TransactionStatus.FAILED,
      errorMessage: "Server timeout / crash recovery — safe to retry",
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helper for simple single-step balance changes
// ---------------------------------------------------------------------------
async function _executeTransaction(params: {
  userId: string;
  idempotencyKey: string;
  type: TransactionType;
  amountCents: bigint;
  cashDelta: bigint;
  stakedDelta: bigint;
  assetSymbol?: string;
  txHash?: string;
  requireSufficientCash?: boolean;
}) {
  return prisma.$transaction(
    async (tx) => {
      const users = await tx.$queryRaw<
        Array<{ id: string; cashBalance: bigint; version: number }>
      >`SELECT id, "cashBalance", version FROM "User" WHERE id = ${params.userId} FOR UPDATE`;

      const user = users[0];
      if (!user) throw new Error("USER_NOT_FOUND");
      if (params.requireSufficientCash && user.cashBalance < params.amountCents) {
        throw new InsufficientFundsError();
      }

      const ledgerTx = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: params.type,
          status: TransactionStatus.PROCESSING,
          idempotencyKey: params.idempotencyKey,
          amountCents: params.amountCents,
          assetSymbol: params.assetSymbol,
          txHash: params.txHash,
        },
      });

      const updated = await tx.user.updateMany({
        where: { id: params.userId, version: user.version },
        data: {
          cashBalance: { increment: params.cashDelta },
          stakedBalance: { increment: params.stakedDelta },
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) throw new ConcurrentModificationError();

      return tx.transaction.update({
        where: { id: ledgerTx.id },
        data: { status: TransactionStatus.CONFIRMED, processedAt: new Date() },
      });
    },
    { timeout: 10_000 }
  );
}
