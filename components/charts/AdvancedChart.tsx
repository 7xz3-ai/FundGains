"use client";

// components/charts/AdvancedChart.tsx
// TradingView Lightweight Charts — candlestick with timeframe selector.
// Dynamically imported (no SSR) since it uses canvas.

import { useEffect, useRef, useState, useCallback } from "react";

// Generate realistic OHLC candle data
function generateCandles(
  basePrice: number,
  count: number,
  intervalMs: number
): Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> {
  const candles = [];
  let price = basePrice - count * 2;
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.48) * 40;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;
    const volume = 100 + Math.random() * 1000;

    candles.push({
      time: now - (count - i) * Math.floor(intervalMs / 1000),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(0)),
    });

    price = close;
  }
  return candles;
}

// Simple RSI calculation
function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(50);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    rsi.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)));
  }
  return rsi;
}

type Timeframe = "1m" | "5m" | "1h" | "1D";

const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "1h": 3_600_000,
  "1D": 86_400_000,
};

export default function AdvancedChart({
  basePrice = 3500,
  symbol = "ETH/USD",
}: {
  basePrice?: number;
  symbol?: string;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [lastCandle, setLastCandle] = useState<{ close: number; change: number } | null>(null);

  const initChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    // Dynamic import — no SSR
    const lc = await import("lightweight-charts");
    const { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries } = lc;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: timeframe !== "1D",
      },
    });

    const candles = generateCandles(basePrice, 100, TIMEFRAME_MS[timeframe]);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34D399",
      downColor: "#EF4444",
      borderUpColor: "#34D399",
      borderDownColor: "#EF4444",
      wickUpColor: "#34D399",
      wickDownColor: "#EF4444",
    });
    candleSeries.setData(candles as any);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(45, 159, 255, 0.15)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)",
      })) as any
    );

    // RSI overlay (simple line)
    if (showRSI) {
      const closes = candles.map((c) => c.close);
      const rsiValues = calculateRSI(closes);
      const rsiSeries = chart.addSeries(LineSeries, {
        color: "#818CF8",
        lineWidth: 1,
        priceScaleId: "rsi",
      });
      rsiSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0.05 },
      });
      rsiSeries.setData(
        rsiValues.map((v, i) => ({ time: candles[i].time, value: v })) as any
      );
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Set last candle info
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    if (last && prev) {
      setLastCandle({
        close: last.close,
        change: ((last.close - prev.close) / prev.close) * 100,
      });
    }

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // Simulate live candle updates
    const interval = setInterval(() => {
      const lastData = candles[candles.length - 1];
      if (!lastData) return;
      const tick = (Math.random() - 0.48) * 8;
      lastData.close = parseFloat((lastData.close + tick).toFixed(2));
      lastData.high = Math.max(lastData.high, lastData.close);
      lastData.low = Math.min(lastData.low, lastData.close);
      candleSeries.update(lastData as any);

      setLastCandle({
        close: lastData.close,
        change: ((lastData.close - (candles[candles.length - 2]?.close ?? lastData.open)) / (candles[candles.length - 2]?.close ?? lastData.open)) * 100,
      });
    }, 1500);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, [basePrice, timeframe, showRSI]);

  useEffect(() => {
    const cleanup = initChart();
    return () => {
      cleanup?.then((fn) => fn?.());
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[12px] font-bold text-white/70">{symbol}</h3>
          {lastCandle && (
            <span
              className={`text-[13px] font-bold font-mono ${
                lastCandle.change >= 0 ? "text-[#34D399]" : "text-[#EF4444]"
              }`}
            >
              ${lastCandle.close.toFixed(2)}{" "}
              <span className="text-[10px]">
                ({lastCandle.change >= 0 ? "+" : ""}
                {lastCandle.change.toFixed(2)}%)
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Timeframes */}
          {(["1m", "5m", "1h", "1D"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-[10px] rounded-lg font-mono transition-all ${
                timeframe === tf
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "text-white/30 hover:text-white/50 border border-transparent"
              }`}
            >
              {tf}
            </button>
          ))}

          <span className="text-white/10 mx-1">|</span>

          {/* Indicators */}
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-mono transition-all ${
              showRSI
                ? "bg-[#818CF8]/20 text-[#818CF8] border border-[#818CF8]/30"
                : "text-white/30 hover:text-white/50 border border-transparent"
            }`}
          >
            RSI
          </button>
          <button
            onClick={() => setShowMACD(!showMACD)}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-mono transition-all ${
              showMACD
                ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30"
                : "text-white/30 hover:text-white/50 border border-transparent"
            }`}
          >
            MACD
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="flex-1 min-h-0 rounded-xl overflow-hidden" />
    </div>
  );
}
