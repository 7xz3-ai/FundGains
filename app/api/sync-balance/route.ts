// app/api/sync-balance/route.ts
// Emergency Balance Sync — fetches real-time ETH + USDC balance for target
// address on Base mainnet via viem, then updates the user's Prisma record.

import { NextResponse } from "next/server";
import { createPublicClient, http, formatEther, formatUnits } from "viem";
import { base } from "viem/chains";
import { prisma } from "@/lib/prisma";

// Target wallet on Base mainnet
const TARGET_ADDRESS = "0x8d69F2fF94376ae99A2aE87E0BF1039FC0d7Dc3f" as const;

// USDC on Base — 6 decimals
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function POST() {
  try {
    // Fetch ETH and USDC balances in parallel
    const [ethBalanceWei, usdcBalanceRaw] = await Promise.all([
      publicClient.getBalance({ address: TARGET_ADDRESS }),
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [TARGET_ADDRESS],
      }),
    ]);

    const ethBalance = parseFloat(formatEther(ethBalanceWei));
    const usdcBalance = parseFloat(formatUnits(usdcBalanceRaw, 6));

    // Fetch ETH price for USD conversion (use fallback if unavailable)
    let ethPriceUsd = 3500; // fallback
    try {
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        { next: { revalidate: 60 } }
      );
      const priceData = await priceRes.json();
      if (priceData?.ethereum?.usd) {
        ethPriceUsd = priceData.ethereum.usd;
      }
    } catch {
      // Use fallback price
    }

    const ethValueUsd = ethBalance * ethPriceUsd;
    const totalUsd = ethValueUsd + usdcBalance;

    // Convert to BigInt cents for Prisma storage
    const totalCents = BigInt(Math.round(totalUsd * 100));

    // Upsert user record — create if missing, update if exists
    const user = await prisma.user.upsert({
      where: { walletAddress: TARGET_ADDRESS },
      update: {
        cashBalance: totalCents,
      },
      create: {
        walletAddress: TARGET_ADDRESS,
        cashBalance: totalCents,
      },
    });

    return NextResponse.json({
      success: true,
      address: TARGET_ADDRESS,
      balances: {
        eth: ethBalance.toFixed(6),
        usdc: usdcBalance.toFixed(2),
        ethPriceUsd,
        ethValueUsd: ethValueUsd.toFixed(2),
        totalUsd: totalUsd.toFixed(2),
        totalCents: totalCents.toString(),
      },
      userId: user.id,
    });
  } catch (err: any) {
    console.error("[sync-balance] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // GET also supported for convenience (e.g., manual browser check)
  return POST();
}
