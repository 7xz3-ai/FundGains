"use client";

// components/trade/OrderBook.tsx
// Live scrolling order book — Bids (Electric Green) / Asks (Neon Red).
// Simulated market depth with realistic spread.

import { useEffect, useState, useRef, useCallback } from "react";

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

function generateOrders(
  basePrice: number,
  side: "bid" | "ask",
  count: number
): OrderLevel[] {
  const orders: OrderLevel[] = [];
  let cumulative = 0;
  for (let i = 0; i < count; i++) {
    const offset = (i + 1) * (0.5 + Math.random() * 2);
    const price =
      side === "bid" ? basePrice - offset : basePrice + offset;
    const size = parseFloat((0.1 + Math.random() * 4).toFixed(4));
    cumulative += size;
    orders.push({
      price: parseFloat(price.toFixed(2)),
      size,
      total: parseFloat(cumulative.toFixed(4)),
    });
  }
  return orders;
}

export default function OrderBook({
  currentPrice,
  previousPrice,
}: {
  currentPrice: number;
  previousPrice: number;
}) {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [pulse, setPulse] = useState(false);
  const prevPriceRef = useRef(currentPrice);

  const refreshBook = useCallback(() => {
    setBids(generateOrders(currentPrice, "bid", 12));
    setAsks(generateOrders(currentPrice, "ask", 12));
  }, [currentPrice]);

  useEffect(() => {
    refreshBook();
  }, [refreshBook]);

  // Pulse on price change
  useEffect(() => {
    if (Math.abs(currentPrice - prevPriceRef.current) > 0.01) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      prevPriceRef.current = currentPrice;
      return () => clearTimeout(t);
    }
  }, [currentPrice]);

  const maxBidTotal = bids.length ? bids[bids.length - 1]?.total ?? 1 : 1;
  const maxAskTotal = asks.length ? asks[asks.length - 1]?.total ?? 1 : 1;
  const priceUp = currentPrice >= previousPrice;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-white/50">
          Order Book
        </h3>
        <span className="text-[10px] text-white/30">ETH/USD</span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-3 text-[9px] text-white/30 uppercase tracking-wider mb-1 px-1">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (reversed — lowest ask at bottom) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {[...asks].reverse().map((ask, i) => (
          <div key={`ask-${i}`} className="relative grid grid-cols-3 text-[11px] py-[3px] px-1 hover:bg-white/[0.03]">
            <div
              className="absolute right-0 top-0 bottom-0 opacity-10"
              style={{
                width: `${(ask.total / maxAskTotal) * 100}%`,
                backgroundColor: "#EF4444",
              }}
            />
            <span className="relative z-10 font-mono text-[#EF4444]">
              {ask.price.toFixed(2)}
            </span>
            <span className="relative z-10 text-right font-mono text-white/60">
              {ask.size.toFixed(4)}
            </span>
            <span className="relative z-10 text-right font-mono text-white/40">
              {ask.total.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Last Price — large, bold, pulses */}
      <div
        className={`py-3 my-1 text-center border-y border-white/[0.06] transition-all duration-300 ${
          pulse ? "scale-[1.02]" : ""
        }`}
      >
        <span
          className={`text-xl font-bold font-mono transition-colors ${
            priceUp ? "text-[#34D399]" : "text-[#EF4444]"
          } ${pulse ? (priceUp ? "drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]") : ""}`}
        >
          ${currentPrice.toFixed(2)}
        </span>
        <span className="text-[10px] ml-2 text-white/30">
          {priceUp ? "▲" : "▼"}
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {bids.map((bid, i) => (
          <div key={`bid-${i}`} className="relative grid grid-cols-3 text-[11px] py-[3px] px-1 hover:bg-white/[0.03]">
            <div
              className="absolute left-0 top-0 bottom-0 opacity-10"
              style={{
                width: `${(bid.total / maxBidTotal) * 100}%`,
                backgroundColor: "#34D399",
              }}
            />
            <span className="relative z-10 font-mono text-[#34D399]">
              {bid.price.toFixed(2)}
            </span>
            <span className="relative z-10 text-right font-mono text-white/60">
              {bid.size.toFixed(4)}
            </span>
            <span className="relative z-10 text-right font-mono text-white/40">
              {bid.total.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="pt-2 text-center text-[10px] text-white/25">
        Spread: ${asks.length && bids.length
          ? (asks[0].price - bids[0].price).toFixed(2)
          : "—"}
      </div>
    </div>
  );
}
