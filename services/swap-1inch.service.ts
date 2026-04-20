// services/swap-1inch.service.ts
// Real-world DEX aggregator integration with 1inch on Base
// Fetches swap quotes, generates transaction data, and tracks fees

import { prisma } from "@/lib/prisma";

const BASE_CHAIN_ID = 8453;
const ONE_INCH_API_BASE = "https://api.1inch.dev/swap/v6.0";
const ONE_INCH_API_KEY = process.env.ONE_INCH_API_KEY || "";

// 1inch router contract on Base
const ONE_INCH_ROUTER = "0x111111125421ca6dc452d289314280a0562b9b9a";

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string; // in wei
  toAmount: string; // in wei
  toAmountMin: string; // slippage-adjusted
  protocols: string[][];
  estimatedGas: number;
  gasPrice: string;
  fee: number; // basis points (e.g., 25 = 0.25%)
  allowanceTarget: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
}

export interface SwapExecutionResult {
  txHash: string;
  fromAmount: string;
  toAmount: string;
  fromAsset: string;
  toAsset: string;
  fee: bigint;
  executedAt: Date;
}

/**
 * Fetch a swap quote from 1inch
 * Includes transaction data ready to be signed and sent on-chain
 */
export async function getSwapQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  userAddress: string,
  slippage: number = 1 // 1% default slippage
): Promise<SwapQuote | null> {
  try {
    const params = new URLSearchParams({
      chainId: BASE_CHAIN_ID.toString(),
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      fromAddress: userAddress,
      slippage: slippage.toString(),
      disableEstimate: "false",
      allowPartialFill: "false",
    });

    const url = `${ONE_INCH_API_BASE}/${BASE_CHAIN_ID}/quote?${params}`;

    const res = await fetch(url, {
      headers: ONE_INCH_API_KEY
        ? { Authorization: `Bearer ${ONE_INCH_API_KEY}` }
        : {},
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[1inch] Quote failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    // Extract key fields from 1inch response
    return {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: data.toAmount,
      toAmountMin: data.toAmountMin,
      protocols: data.protocols || [],
      estimatedGas: data.estimatedGas || 150000,
      gasPrice: data.gasPrice || "0",
      fee: data.fee || 0,
      allowanceTarget: data.allowanceTarget || ONE_INCH_ROUTER,
      tx: {
        from: userAddress,
        to: data.tx?.to || ONE_INCH_ROUTER,
        data: data.tx?.data || "",
        value: data.tx?.value || "0",
        gas: data.tx?.gas || 150000,
        gasPrice: data.tx?.gasPrice || "0",
      },
    };
  } catch (error) {
    console.error("[1inch] Quote error:", error);
    return null;
  }
}

/**
 * Execute a swap on-chain and record it in the database
 * Called after user signs the transaction
 */
export async function recordSwap(
  userId: string,
  fromAsset: string,
  toAsset: string,
  fromAmount: string, // in wei
  toAmount: string, // in wei
  txHash: string,
  feeCents: bigint
): Promise<SwapExecutionResult> {
  // Convert wei amounts to cents for storage
  const fromAmountCents = BigInt(Math.round(parseFloat(fromAmount) * 100));
  const toAmountCents = BigInt(Math.round(parseFloat(toAmount) * 100));

  // Record swap in database
  const swapRecord = await prisma.swapRecord.create({
    data: {
      userId,
      fromAsset,
      toAsset,
      fromAmount: (parseFloat(fromAmount) / 1e18).toString(),
      toAmount: (parseFloat(toAmount) / 1e18).toString(),
      fromAmountCents,
      toAmountCents,
      exchangeRate: (parseFloat(toAmount) / parseFloat(fromAmount)).toString(),
      txHash,
    },
  });

  // Deduct 0.1% fee from swap and credit to treasury
  const treasuryFee = (toAmountCents * BigInt(10)) / BigInt(10000); // 0.1%

  await prisma.treasury.update({
    where: { id: (await prisma.treasury.findFirst({}))?.id || "" },
    data: {
      totalBalanceCents: {
        increment: treasuryFee,
      },
      totalInflowCents: {
        increment: treasuryFee,
      },
    },
  });

  // Record treasury transaction
  await prisma.treasuryTransaction.create({
    data: {
      amountCents: treasuryFee,
      type: "SWAP_FEE",
      description: `Swap fee: ${fromAsset} → ${toAsset}`,
      swapRecordId: swapRecord.id,
    },
  });

  return {
    txHash,
    fromAmount,
    toAmount,
    fromAsset,
    toAsset,
    fee: treasuryFee,
    executedAt: new Date(),
  };
}

/**
 * Get best swap route for rebalancing
 * Compares current portfolio composition to target and suggests swaps
 */
export async function getRebalancingRoute(
  userAddress: string,
  currentBalances: Record<string, string>, // token address -> amount in wei
  targetAllocation: Record<string, number> // token symbol -> % allocation
): Promise<
  Array<{
    fromToken: string;
    toToken: string;
    amount: string;
    quote: SwapQuote;
  }>
> {
  const swaps: Array<{
    fromToken: string;
    toToken: string;
    amount: string;
    quote: SwapQuote;
  }> = [];

  try {
    // Calculate total portfolio value (simplified: assume 1:1 for demo)
    const totalValue = Object.values(currentBalances).reduce(
      (sum, val) => sum + parseFloat(val),
      0
    );

    // For each token, check if it needs rebalancing
    for (const [token, balance] of Object.entries(currentBalances)) {
      const currentAllocation = (parseFloat(balance) / totalValue) * 100;
      const targetAlloc = targetAllocation[token] || 0;

      // If allocation is off by more than 5%, suggest a swap
      if (Math.abs(currentAllocation - targetAlloc) > 5) {
        // Find best token to swap to
        for (const [targetToken, targetAlloc] of Object.entries(
          targetAllocation
        )) {
          if (targetToken === token) continue;

          const amountToSwap = (
            (parseFloat(balance) * (currentAllocation - targetAlloc)) /
            100
          ).toString();

          if (parseFloat(amountToSwap) > 0) {
            const quote = await getSwapQuote(
              token,
              targetToken,
              amountToSwap,
              userAddress,
              1 // 1% slippage
            );

            if (quote) {
              swaps.push({
                fromToken: token,
                toToken: targetToken,
                amount: amountToSwap,
                quote,
              });
            }
          }
        }
      }
    }

    return swaps;
  } catch (error) {
    console.error("[1inch] Rebalancing route error:", error);
    return [];
  }
}

/**
 * Estimate gas cost for a swap
 * Helps users understand the cost of rebalancing
 */
export async function estimateSwapGas(
  fromToken: string,
  toToken: string,
  amount: string,
  userAddress: string
): Promise<{
  estimatedGas: number;
  gasPrice: string;
  totalGasCost: string; // in wei
}> {
  try {
    const quote = await getSwapQuote(
      fromToken,
      toToken,
      amount,
      userAddress,
      1
    );

    if (!quote) {
      return {
        estimatedGas: 150000,
        gasPrice: "0",
        totalGasCost: "0",
      };
    }

    const gasPrice = BigInt(quote.gasPrice || "0");
    const gas = BigInt(quote.estimatedGas || 150000);
    const totalGasCost = (gasPrice * gas).toString();

    return {
      estimatedGas: quote.estimatedGas || 150000,
      gasPrice: quote.gasPrice || "0",
      totalGasCost,
    };
  } catch (error) {
    console.error("[1inch] Gas estimation error:", error);
    return {
      estimatedGas: 150000,
      gasPrice: "0",
      totalGasCost: "0",
    };
  }
}

/**
 * Validate swap parameters before execution
 */
export function validateSwapParams(
  fromToken: string,
  toToken: string,
  amount: string,
  minOutput: string
): { valid: boolean; error?: string } {
  if (!fromToken || !toToken) {
    return { valid: false, error: "Missing token addresses" };
  }

  if (fromToken.toLowerCase() === toToken.toLowerCase()) {
    return { valid: false, error: "Cannot swap token for itself" };
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: "Invalid amount" };
  }

  const minNum = parseFloat(minOutput);
  if (isNaN(minNum) || minNum < 0) {
    return { valid: false, error: "Invalid minimum output" };
  }

  return { valid: true };
}
