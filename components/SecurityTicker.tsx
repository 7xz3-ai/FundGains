"use client";

// components/SecurityTicker.tsx
// Live Insurance Fund balance ticker for the dashboard footer.
// Fetches from /api/insurance and displays in security-ticker bar.

import { useEffect, useState } from "react";

export default function SecurityTicker() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    async function fetchFund() {
      try {
        const res = await fetch("/api/insurance");
        const data = await res.json();
        if (data.totalBalanceUsd !== undefined) {
          setBalance(data.totalBalanceUsd);
        }
      } catch {
        // silent — don't break dashboard on failure
      }
    }
    fetchFund();
    const interval = setInterval(fetchFund, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const displayBalance =
    balance !== null
      ? balance >= 1_000_000
        ? `$${(balance / 1_000_000).toFixed(1)}M`
        : balance >= 1_000
        ? `$${(balance / 1_000).toFixed(1)}K`
        : `$${balance.toFixed(2)}`
      : "$0.00";

  return (
    <div className="security-ticker py-3 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
        <div className="ticker-dot" />
        <p className="text-[11px] text-text-muted tracking-wide">
          Protected by{" "}
          <span className="font-semibold" style={{ color: "#D4AF37" }}>
            {displayBalance}
          </span>{" "}
          Insurance Fund
        </p>
        <span className="text-[10px] text-text-dim">|</span>
        <p className="text-[10px] text-text-dim">
          SAFUI Protocol
        </p>
      </div>
    </div>
  );
}
