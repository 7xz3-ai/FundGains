"use client";

// components/GlobalTickerTape.tsx
// Binance-style scrolling ticker showing top assets, 24h volume, and top gainers.
// Borderless, minimal, Geist Mono numbers + Inter labels.

import { useEffect, useState } from "react";

interface TickerItem {
  symbol: string;
  price: string;
  change: number;
}

const INITIAL_TICKERS: TickerItem[] = [
  { symbol: "BTC", price: "67,240", change: 2.41 },
  { symbol: "ETH", price: "3,512", change: 1.87 },
  { symbol: "SOL", price: "178.50", change: 5.12 },
  { symbol: "BNB", price: "612.30", change: -0.34 },
  { symbol: "TRX", price: "0.1241", change: 3.67 },
  { symbol: "LINK", price: "14.82", change: -1.22 },
  { symbol: "USDC", price: "1.0001", change: 0.01 },
  { symbol: "AERO", price: "1.34", change: 8.91 },
];

export default function GlobalTickerTape() {
  const [tickers, setTickers] = useState(INITIAL_TICKERS);

  // Simulate price ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => ({
          ...t,
          change: parseFloat((t.change + (Math.random() - 0.5) * 0.4).toFixed(2)),
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Duplicate for seamless loop
  const doubled = [...tickers, ...tickers];

  return (
    <div className="w-full overflow-hidden bg-[#050508]/60 border-b border-white/[0.03] h-8 flex items-center">
      <div className="flex items-center gap-8 animate-ticker whitespace-nowrap">
        {doubled.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-white/40 font-medium">
              {t.symbol}/USD
            </span>
            <span className="text-[10px] font-mono text-white/70 font-semibold">
              ${t.price}
            </span>
            <span
              className={`text-[10px] font-mono font-semibold ${
                t.change >= 0 ? "text-[#34D399]" : "text-[#EF4444]"
              }`}
            >
              {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker-scroll 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
