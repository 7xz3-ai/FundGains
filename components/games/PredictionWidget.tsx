"use client";

// components/games/PredictionWidget.tsx
// "Will ETH be higher or lower in 5 minutes?" interactive prediction card.
// Trust Blue gradients for win states.

import { useState, useEffect, useCallback } from "react";

interface PredictionWidgetProps {
  currentEthPrice: number;
}

type Prediction = "higher" | "lower" | null;
type PredictionState = "idle" | "pending" | "resolved";

export default function PredictionWidget({
  currentEthPrice,
}: PredictionWidgetProps) {
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [state, setState] = useState<PredictionState>("idle");
  const [lockedPrice, setLockedPrice] = useState(0);
  const [resolvedPrice, setResolvedPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [streak, setStreak] = useState(0);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [totalWon, setTotalWon] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (state !== "pending") return;
    if (timeLeft <= 0) {
      // Resolve prediction
      const priceChange = (Math.random() - 0.48) * currentEthPrice * 0.005;
      const newPrice = parseFloat((lockedPrice + priceChange).toFixed(2));
      setResolvedPrice(newPrice);
      setState("resolved");
      setTotalPlayed((p) => p + 1);

      const won =
        (prediction === "higher" && newPrice > lockedPrice) ||
        (prediction === "lower" && newPrice < lockedPrice);

      if (won) {
        setStreak((s) => s + 1);
        setTotalWon((w) => w + 1);
      } else {
        setStreak(0);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [state, timeLeft, lockedPrice, prediction, currentEthPrice]);

  const handlePredict = useCallback(
    (dir: "higher" | "lower") => {
      setPrediction(dir);
      setLockedPrice(currentEthPrice);
      setTimeLeft(300);
      setState("pending");
    },
    [currentEthPrice]
  );

  function handleReset() {
    setPrediction(null);
    setState("idle");
    setResolvedPrice(0);
    setTimeLeft(300);
  }

  const won =
    state === "resolved" &&
    ((prediction === "higher" && resolvedPrice > lockedPrice) ||
      (prediction === "lower" && resolvedPrice < lockedPrice));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary">
              Price Prediction
            </h3>
            <p className="text-[11px] text-text-dim">5-minute ETH forecast</p>
          </div>
        </div>
        {streak > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[11px] font-bold">
            {streak} streak
          </span>
        )}
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Current Price */}
        <div className="text-center py-2">
          <p className="text-[12px] text-text-dim mb-1">
            {state === "pending"
              ? "Locked Price"
              : state === "resolved"
              ? "Result"
              : "Current ETH Price"}
          </p>
          {state === "resolved" ? (
            <div className="space-y-1">
              <p className="text-[14px] text-text-muted line-through">
                ${lockedPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p
                className={`text-2xl font-bold ${
                  won ? "gradient-text" : "text-[#EF4444]"
                }`}
              >
                ${resolvedPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold text-text-primary">
              $
              {(state === "pending" ? lockedPrice : currentEthPrice).toLocaleString(
                "en-US",
                { minimumFractionDigits: 2 }
              )}
            </p>
          )}
        </div>

        {/* Idle: Choose prediction */}
        {state === "idle" && (
          <>
            <p className="text-[13px] text-text-muted text-center">
              Will ETH be higher or lower in 5 minutes?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePredict("higher")}
                className="py-4 rounded-2xl bg-[#34D399]/5 border border-[#34D399]/10 hover:border-[#34D399]/30 transition-all group"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2"
                  className="mx-auto mb-1 group-hover:translate-y-[-2px] transition-transform"
                >
                  <polyline points="18,15 12,9 6,15" />
                </svg>
                <span className="text-[14px] font-semibold text-[#34D399]">
                  Higher
                </span>
              </button>
              <button
                onClick={() => handlePredict("lower")}
                className="py-4 rounded-2xl bg-[#EF4444]/5 border border-[#EF4444]/10 hover:border-[#EF4444]/30 transition-all group"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  className="mx-auto mb-1 group-hover:translate-y-[2px] transition-transform"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
                <span className="text-[14px] font-semibold text-[#EF4444]">
                  Lower
                </span>
              </button>
            </div>
          </>
        )}

        {/* Pending: Countdown */}
        {state === "pending" && (
          <div className="text-center space-y-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold ${
                prediction === "higher"
                  ? "bg-[#34D399]/10 text-[#34D399]"
                  : "bg-[#EF4444]/10 text-[#EF4444]"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline
                  points={
                    prediction === "higher" ? "18,15 12,9 6,15" : "6,9 12,15 18,9"
                  }
                />
              </svg>
              You predicted {prediction}
            </div>

            <div className="flex justify-center">
              <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-2xl font-bold text-text-primary font-mono">
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </p>
                <p className="text-[11px] text-text-dim mt-0.5">remaining</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-1000"
                style={{ width: `${((300 - timeLeft) / 300) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Resolved: Result */}
        {state === "resolved" && (
          <div className="text-center space-y-3">
            <div
              className={`rounded-2xl p-4 ${
                won
                  ? "bg-gradient-to-br from-accent/10 to-[#818CF8]/5 border border-accent/20"
                  : "bg-[#EF4444]/5 border border-[#EF4444]/10"
              }`}
            >
              <p
                className={`text-[18px] font-bold ${
                  won ? "gradient-text" : "text-[#EF4444]"
                }`}
              >
                {won ? "You Won!" : "Not This Time"}
              </p>
              <p className="text-[12px] text-text-muted mt-1">
                ETH moved{" "}
                {resolvedPrice > lockedPrice ? "up" : "down"}{" "}
                {Math.abs(
                  ((resolvedPrice - lockedPrice) / lockedPrice) * 100
                ).toFixed(3)}
                %
              </p>
            </div>

            <button
              onClick={handleReset}
              className="btn-primary w-full py-3 rounded-2xl text-[14px] font-semibold"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Stats */}
        {totalPlayed > 0 && (
          <div className="flex justify-center gap-6 pt-2 border-t border-white/[0.04]">
            <div className="text-center">
              <p className="text-[12px] text-text-dim">Played</p>
              <p className="text-[14px] font-semibold text-text-primary">
                {totalPlayed}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[12px] text-text-dim">Won</p>
              <p className="text-[14px] font-semibold text-[#34D399]">
                {totalWon}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[12px] text-text-dim">Win Rate</p>
              <p className="text-[14px] font-semibold text-accent">
                {totalPlayed > 0
                  ? ((totalWon / totalPlayed) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
