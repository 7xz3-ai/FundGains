// hooks/useSwap1Inch.ts
// React hook for real-world swap execution via 1inch
// Handles quote fetching, approval, and transaction execution

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  estimatedGas: number;
  gasPrice: string;
  fee: number;
  allowanceTarget: string;
  protocols: string[][];
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
}

export interface SwapState {
  quote: SwapQuote | null;
  isLoadingQuote: boolean;
  isApproving: boolean;
  isSwapping: boolean;
  txHash: string | null;
  error: string | null;
}

export function useSwap1Inch(
  userId: string,
  fromToken: string,
  toToken: string,
  amount: string
) {
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<SwapState>({
    quote: null,
    isLoadingQuote: false,
    isApproving: false,
    isSwapping: false,
    txHash: null,
    error: null,
  });

  // Fetch swap quote from 1inch
  const { data: quoteData, isLoading: isLoadingQuote } = useQuery({
    queryKey: ["swap-quote", fromToken, toToken, amount, userAddress],
    queryFn: async () => {
      if (!userAddress || !amount || parseFloat(amount) <= 0) return null;

      const params = new URLSearchParams({
        fromToken,
        toToken,
        amount,
        userAddress,
        slippage: "1",
      });

      const res = await fetch(`/api/swap?${params}`);
      if (!res.ok) throw new Error("Failed to fetch quote");

      const data = await res.json();
      return data.quote as SwapQuote;
    },
    enabled: !!(userAddress && amount && parseFloat(amount) > 0),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 30_000,
  });

  // Approve token spending
  const approveToken = useCallback(async () => {
    if (!quoteData || !userAddress) return;

    setState((prev) => ({ ...prev, isApproving: true, error: null }));

    try {
      // ERC-20 approve function signature
      const approveData = {
        address: fromToken as `0x${string}`,
        abi: [
          {
            name: "approve",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [quoteData.allowanceTarget as `0x${string}`, BigInt(amount)],
        account: userAddress,
      };

      const txHash = await writeContractAsync(approveData as any);
      setState((prev) => ({ ...prev, txHash, isApproving: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isApproving: false,
        error: `Approval failed: ${String(error)}`,
      }));
    }
  }, [quoteData, userAddress, fromToken, amount, writeContractAsync]);

  // Execute swap
  const executeSwap = useCallback(async () => {
    if (!quoteData || !userAddress || !userId) return;

    setState((prev) => ({ ...prev, isSwapping: true, error: null }));

    try {
      // Send swap transaction via 1inch router
      const swapData = {
        address: quoteData.tx.to as `0x${string}`,
        abi: [
          {
            name: "swap",
            type: "function",
            stateMutability: "payable",
            inputs: [
              { name: "data", type: "bytes" },
              { name: "minReturn", type: "uint256" },
            ],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "swap",
        args: [quoteData.tx.data as `0x${string}`, quoteData.toAmountMin],
        value: BigInt(quoteData.tx.value || "0"),
        account: userAddress,
      };

      const txHash = await writeContractAsync(swapData as any);

      // Record swap in database
      const recordRes = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userAddress,
          fromToken,
          toToken,
          amount,
          toAmount: quoteData.toAmount,
          txHash,
        }),
      });

      if (!recordRes.ok) throw new Error("Failed to record swap");

      setState((prev) => ({
        ...prev,
        txHash,
        isSwapping: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSwapping: false,
        error: `Swap failed: ${String(error)}`,
      }));
    }
  }, [quoteData, userAddress, userId, fromToken, toToken, amount, writeContractAsync]);

  // Update state with quote data
  if (quoteData && state.quote !== quoteData) {
    setState((prev) => ({ ...prev, quote: quoteData }));
  }

  return {
    ...state,
    isLoadingQuote,
    quote: quoteData,
    approveToken,
    executeSwap,
  };
}

