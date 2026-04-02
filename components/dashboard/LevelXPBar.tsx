"use client";

// components/dashboard/LevelXPBar.tsx
// Sleek, minimal Level & XP progress bar for the top navigation profile section.

import { useState } from "react";

// XP thresholds matching the gamification service
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];

function xpToNextLevel(xp: number, level: number): { current: number; needed: number; progress: number } {
  const maxLevel = LEVEL_THRESHOLDS.length;
  if (level >= maxLevel) return { current: xp, needed: xp, progress: 100 };

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 1000;
  const progressXp = xp - currentThreshold;
  const neededXp = nextThreshold - currentThreshold;
  const progress = Math.min(100, Math.max(0, (progressXp / neededXp) * 100));

  return { current: progressXp, needed: neededXp, progress };
}

export default function LevelXPBar({
  level,
  xp,
}: {
  level: number;
  xp: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { current, needed, progress } = xpToNextLevel(xp, level);

  return (
    <div
      className="relative hidden sm:flex items-center gap-2 cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Level badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent/10 border border-accent/10">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-accent"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
        <span className="text-[12px] font-semibold text-accent">
          Lv.{level}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-[#818CF8] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-56 z-50 rounded-2xl bg-[#0d0d14]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-text-primary">
              Level {level}
            </span>
            <span className="text-[12px] text-text-muted">
              {xp.toLocaleString()} XP total
            </span>
          </div>

          {/* Full progress bar */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-[#818CF8] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-dim">
              {current} / {needed} XP
            </span>
            <span className="text-[11px] text-accent font-medium">
              {Math.round(progress)}%
            </span>
          </div>

          <p className="text-[11px] text-text-dim mt-2 pt-2 border-t border-white/[0.04]">
            Earn XP by staking, converting, and referring friends.
          </p>
        </div>
      )}
    </div>
  );
}
