"use client";

// components/games/YieldLottery.tsx
// Yield Jackpot: stake to earn tickets, countdown to next draw.
// Trust Blue gradients for win states.

import { useState, useEffect, useMemo } from "react";

interface YieldLotteryProps {
  walletAddress: string;
  ticketCount?: number;
}

export default function YieldLottery({
  walletAddress,
  ticketCount = 0,
}: YieldLotteryProps) {
  const [tickets, setTickets] = useState(ticketCount);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [lastWinner, setLastWinner] = useState<string | null>(null);

  // Calculate next draw time (every day at 00:00 UTC)
  useEffect(() => {
    function calcTimeLeft() {
      const now = new Date();
      const nextDraw = new Date(now);
      nextDraw.setUTCHours(24, 0, 0, 0);
      const diff = nextDraw.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    }

    setTimeLeft(calcTimeLeft());
    const interval = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate ticket count based on staking
  useEffect(() => {
    setTickets(ticketCount || Math.floor(Math.random() * 5) + 1);
  }, [ticketCount]);

  // Past draws (simulated)
  const pastDraws = useMemo(
    () => [
      {
        date: "Mar 31, 2026",
        winner: "0x7a3...f91c",
        prize: "$2,450.00",
        tickets: 1247,
      },
      {
        date: "Mar 30, 2026",
        winner: "0xb2e...4a8d",
        prize: "$1,890.00",
        tickets: 983,
      },
      {
        date: "Mar 29, 2026",
        winner: "0x4f1...c72b",
        prize: "$3,120.00",
        tickets: 1562,
      },
    ],
    []
  );

  const currentPrize = "$4,280.00";
  const totalTickets = 1_847 + tickets;

  return (
    <div className="card overflow-hidden">
      {/* Header with gradient */}
      <div className="relative px-7 pt-7 pb-5 bg-gradient-to-br from-accent/10 via-transparent to-[#818CF8]/5">
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[11px] font-semibold">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-[#818CF8] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-text-primary">
              Yield Jackpot
            </h3>
            <p className="text-[12px] text-text-muted">
              Stake to earn free tickets
            </p>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="text-center py-4">
          <p className="text-[12px] text-text-dim mb-1">Current Prize Pool</p>
          <p className="text-4xl font-bold gradient-text tracking-tight">
            {currentPrize}
          </p>
          <p className="text-[12px] text-text-dim mt-1">
            {totalTickets.toLocaleString()} tickets in this round
          </p>
        </div>
      </div>

      <div className="px-7 pb-7 space-y-5">
        {/* Countdown */}
        <div>
          <p className="text-[12px] text-text-dim mb-2 text-center">
            Next Draw In
          </p>
          <div className="flex justify-center gap-3">
            {[
              { val: timeLeft.hours, label: "HRS" },
              { val: timeLeft.minutes, label: "MIN" },
              { val: timeLeft.seconds, label: "SEC" },
            ].map((unit) => (
              <div
                key={unit.label}
                className="w-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center"
              >
                <p className="text-xl font-bold text-text-primary font-mono">
                  {String(unit.val).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-text-dim mt-0.5">{unit.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Your Tickets */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-text-dim mb-0.5">Your Tickets</p>
              <p className="text-2xl font-bold text-text-primary">{tickets}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-text-dim mb-0.5">Win Chance</p>
              <p className="text-[15px] font-semibold text-accent">
                {((tickets / totalTickets) * 100).toFixed(3)}%
              </p>
            </div>
          </div>
          <p className="text-[11px] text-text-dim mt-3 border-t border-white/[0.04] pt-3">
            Every stake earns 1 free ticket. More stakes = more chances to win.
          </p>
        </div>

        {/* How It Works */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl bg-white/[0.02] p-3 text-center">
            <p className="text-[18px] mb-1">1</p>
            <p className="text-[11px] text-text-dim">Stake any vault</p>
          </div>
          <div className="flex-1 rounded-xl bg-white/[0.02] p-3 text-center">
            <p className="text-[18px] mb-1">2</p>
            <p className="text-[11px] text-text-dim">Get free ticket</p>
          </div>
          <div className="flex-1 rounded-xl bg-accent/5 p-3 text-center">
            <p className="text-[18px] mb-1">3</p>
            <p className="text-[11px] text-accent font-medium">Win jackpot</p>
          </div>
        </div>

        {/* Past Draws Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-[13px] text-text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-1"
        >
          {showHistory ? "Hide" : "View"} Past Draws
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${showHistory ? "rotate-180" : ""}`}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>

        {showHistory && (
          <div className="space-y-2">
            {pastDraws.map((draw) => (
              <div
                key={draw.date}
                className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
              >
                <div>
                  <p className="text-[13px] text-text-secondary">{draw.date}</p>
                  <p className="text-[11px] text-text-dim font-mono">
                    {draw.winner}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold gradient-text">
                    {draw.prize}
                  </p>
                  <p className="text-[11px] text-text-dim">
                    {draw.tickets} tickets
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
