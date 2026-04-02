// services/intent-router.service.ts
// Intent-Based Router — Chain Abstraction Layer
// Users only see assets; all bridging, wrapping, and routing is handled invisibly.
// Provides clean loading states: "Optimizing global route..."

export interface RouteStep {
  action: "swap" | "bridge" | "wrap" | "unwrap" | "stake" | "approve";
  fromAsset: string;
  toAsset: string;
  protocol: string;
  estimatedTimeSec: number;
}

export interface IntentRoute {
  steps: RouteStep[];
  totalEstimatedTimeSec: number;
  totalFeePct: number;
  statusMessage: string;
}

// ─── Asset-to-Chain Mapping (invisible to user) ───

const ASSET_CHAIN_MAP: Record<string, { chain: string; isNative: boolean; wrappedAs?: string }> = {
  ETH:   { chain: "base",    isNative: true },
  USDC:  { chain: "base",    isNative: true },
  USDT:  { chain: "base",    isNative: true },
  cbBTC: { chain: "base",    isNative: true },
  SOL:   { chain: "solana",  isNative: true },
  TRX:   { chain: "tron",    isNative: true, wrappedAs: "wTRX" },
  LINK:  { chain: "base",    isNative: true },
  AERO:  { chain: "base",    isNative: true },
};

/**
 * Resolve the optimal route for a user intent.
 * Handles cross-chain bridging and wrapping transparently.
 */
export function resolveIntentRoute(
  fromAsset: string,
  toAsset: string,
  action: "stake" | "swap" | "deposit"
): IntentRoute {
  const from = ASSET_CHAIN_MAP[fromAsset];
  const to = ASSET_CHAIN_MAP[toAsset];

  if (!from || !to) {
    return {
      steps: [],
      totalEstimatedTimeSec: 0,
      totalFeePct: 0,
      statusMessage: "Unsupported asset pair",
    };
  }

  const steps: RouteStep[] = [];
  let totalTime = 0;
  let totalFee = 0;

  // Same chain — direct operation
  if (from.chain === to.chain) {
    if (fromAsset !== toAsset) {
      steps.push({
        action: "swap",
        fromAsset,
        toAsset,
        protocol: "Aerodrome DEX",
        estimatedTimeSec: 3,
      });
      totalTime += 3;
      totalFee += 0.3;
    }

    if (action === "stake") {
      steps.push({
        action: "stake",
        fromAsset: toAsset,
        toAsset: `v${toAsset}`,
        protocol: "ApexYield Vault",
        estimatedTimeSec: 5,
      });
      totalTime += 5;
    }

    return {
      steps,
      totalEstimatedTimeSec: totalTime,
      totalFeePct: totalFee,
      statusMessage:
        steps.length <= 1
          ? "Processing transaction..."
          : "Optimizing route...",
    };
  }

  // Cross-chain — needs bridging
  // Step 1: Bridge from source chain to Base
  if (from.chain !== "base") {
    steps.push({
      action: "bridge",
      fromAsset,
      toAsset: from.wrappedAs ?? fromAsset,
      protocol: "LayerZero Bridge",
      estimatedTimeSec: 30,
    });
    totalTime += 30;
    totalFee += 0.1;
  }

  // Step 2: Swap if needed
  const bridgedAsset = from.wrappedAs ?? fromAsset;
  if (bridgedAsset !== toAsset) {
    steps.push({
      action: "swap",
      fromAsset: bridgedAsset,
      toAsset,
      protocol: "Aerodrome DEX",
      estimatedTimeSec: 3,
    });
    totalTime += 3;
    totalFee += 0.3;
  }

  // Step 3: Stake if action is stake
  if (action === "stake") {
    steps.push({
      action: "stake",
      fromAsset: toAsset,
      toAsset: `v${toAsset}`,
      protocol: "ApexYield Vault",
      estimatedTimeSec: 5,
    });
    totalTime += 5;
  }

  return {
    steps,
    totalEstimatedTimeSec: totalTime,
    totalFeePct: totalFee,
    statusMessage: "Optimizing global route...",
  };
}

/**
 * Get a human-readable loading message for the current route step.
 */
export function getRouteStepMessage(step: RouteStep): string {
  switch (step.action) {
    case "bridge":
      return `Bridging ${step.fromAsset} via ${step.protocol}...`;
    case "swap":
      return `Converting ${step.fromAsset} to ${step.toAsset}...`;
    case "wrap":
      return `Wrapping ${step.fromAsset}...`;
    case "unwrap":
      return `Unwrapping ${step.fromAsset}...`;
    case "stake":
      return `Staking into ${step.protocol}...`;
    case "approve":
      return `Approving ${step.fromAsset} allowance...`;
    default:
      return "Processing...";
  }
}
