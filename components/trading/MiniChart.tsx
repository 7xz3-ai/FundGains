"use client";

// components/trading/MiniChart.tsx
// Lightweight TradingView-style mini chart for price history.
// Uses lightweight-charts library for performant rendering.

import { useEffect, useRef, useState } from "react";

interface MiniChartProps {
  pair: string; // e.g. "ETH/USDC"
  visible: boolean;
}

// Generate simulated price data based on pair
function generatePriceData(pair: string) {
  const basePrices: Record<string, number> = {
    "ETH/USDC": 3500,
    "ETH/SOL": 25,
    "USDC/ETH": 0.000286,
    "USDC/SOL": 0.00714,
    "SOL/ETH": 0.04,
    "SOL/USDC": 140,
  };
  const base = basePrices[pair] ?? 100;
  const data: { time: string; value: number }[] = [];
  const now = new Date();
  let price = base * (0.92 + Math.random() * 0.08);

  for (let i = 168; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = `${dateStr}`;
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * base * 0.008;
    price = Math.max(price + change, base * 0.85);
    if (!data.find((p) => p.time === timeStr)) {
      data.push({ time: timeStr, value: parseFloat(price.toFixed(6)) });
    }
  }
  return data;
}

export default function MiniChart({ pair, visible }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    let mounted = true;

    async function initChart() {
      const { createChart, ColorType, LineStyle } = await import("lightweight-charts");
      if (!mounted || !containerRef.current) return;

      // Clear previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 200,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#6B7280",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.03)" },
          horzLines: { color: "rgba(255,255,255,0.03)" },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.06)",
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.06)",
        },
        crosshair: {
          vertLine: { color: "rgba(45,159,255,0.3)", style: LineStyle.Dashed },
          horzLine: { color: "rgba(45,159,255,0.3)", style: LineStyle.Dashed },
        },
      });

      const lc = await import("lightweight-charts");
      const series = chart.addSeries(lc.AreaSeries, {
        lineColor: "#2D9FFF",
        topColor: "rgba(45,159,255,0.2)",
        bottomColor: "rgba(45,159,255,0.0)",
        lineWidth: 2,
      });

      const data = generatePriceData(pair);
      series.setData(data);
      chart.timeScale().fitContent();
      chartRef.current = chart;
      setLoading(false);

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      });
      ro.observe(containerRef.current);

      return () => ro.disconnect();
    }

    setLoading(true);
    initChart();

    return () => {
      mounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [pair, visible]);

  if (!visible) return null;

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-secondary">
          {pair} — 7D Price History
        </span>
        <span className="text-[11px] text-text-dim">Simulated data</span>
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base/50 z-10">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
