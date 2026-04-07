"use client";

// components/PrestigeProvider.tsx
// Monitors user level and balance. When Level >= 50 OR balance > $10,000,
// applies data-prestige="true" to <html> which swaps Trust Blue to Royal Gold.

import { useEffect } from "react";
import { useAccount, useBalance } from "wagmi";

const PRESTIGE_BALANCE_THRESHOLD = 10_000; // $10,000 USD
const PRESTIGE_LEVEL_THRESHOLD = 50;

export default function PrestigeProvider({
  level,
  ethPriceUsd,
}: {
  level: number;
  ethPriceUsd: number;
}) {
  const { address } = useAccount();
  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address },
  });

  useEffect(() => {
    const ethBalance = balanceData ? parseFloat(balanceData.formatted) : 0;
    const balanceUsd = ethBalance * ethPriceUsd;
    const isPrestige =
      level >= PRESTIGE_LEVEL_THRESHOLD || balanceUsd >= PRESTIGE_BALANCE_THRESHOLD;

    if (isPrestige) {
      document.documentElement.setAttribute("data-prestige", "true");
    } else {
      document.documentElement.removeAttribute("data-prestige");
    }

    return () => {
      document.documentElement.removeAttribute("data-prestige");
    };
  }, [balanceData, ethPriceUsd, level]);

  return null;
}
