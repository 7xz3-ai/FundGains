"use client";

// components/trade/LiveActivityFeed.tsx
// Global live trades feed — creates FOMO / social proof.
// Simulated real-time stream of trades happening on the platform.

import { useEffect, useState, useRef } from "react";

interface TradeEvent {
  id: string;
  type: "buy" | "sell";
  asset: string;
  amount: string;
  price: string;
  time: string;
  trader: string;
}

const ASSETS = ["ETH", "BTC", "SOL", "USDC", "TRX", "LINK"];
const NAMES = [
  "0xA3f7...2e", "0x8B1c...9d", "0xD42e...1f", "0x7F93...4b",
  "0xC6a2...8c", "0x1E5d...3a", "0x9D0f...7e", "0x4Ab8...5c",
  "whale.eth", "defi_max.eth", "yield_king.eth", "apex_trader.eth",
];

function randomTrade(): TradeEvent {
  const type = Math.random() > 0.45 ? "buy" : "sell";
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const amount = (10 + Math.random() * 5000).toFixed(2);
  const prices: Record<string, number> = {
    ETH: 3500, BTC: 67000, SOL: 175, USDC: 1, TRX: 0.12, LINK: 14,
  };
  const price = (prices[asset] ?? 100) * (0.99 + Math.random() * 0.02);
  const trader = NAMES[Math.floor(Math.random() * NAMES.length)];

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    asset,
    amount,
    price: price >= 100 ? price.toFixed(0) : price.toFixed(4),
    time: "now",
    trader,
  };
}

export default function LiveActivityFeed() {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Seed initial trades
    const initial = Array.from({ length: 8 }, () => randomTrade());
    setTrades(initial);

    // Add new trade every 2-5 seconds
    const interval = setInterval(() => {
      setTrades((prev) => {
        const newTrade = randomTrade();
        return [newTrade, ...prev.slice(0, 15)];
      });
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-white/50">
          Live Trades
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
          <span className="text-[9px] text-white/30">LIVE</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden space-y-0.5">
        {trades.map((trade, i) => (
          <div
            key={trade.id}
            className="flex items-center justify-between py-1.5 px-1.5 rounded-lg hover:bg-white/[0.02] transition-all"
            style={{
              opacity: 1 - i * 0.05,
              animation: i === 0 ? "fadeIn 0.3s ease" : undefined,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  trade.type === "buy"
                    ? "bg-[#34D399]/10 text-[#34D399]"
                    : "bg-[#EF4444]/10 text-[#EF4444]"
                }`}
              >
                {trade.type === "buy" ? "BUY" : "SELL"}
              </span>
              <span className="text-[11px] font-mono text-white/70">
                {trade.amount} {trade.asset}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-white/40">
                ${trade.price}
              </p>
              <p className="text-[8px] text-white/20">{trade.trader}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
