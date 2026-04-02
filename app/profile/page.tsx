"use client";

// app/profile/page.tsx
// Pseudo-anonymous profile page with gamification display.
// Premium fintech design. Zero PII.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import LevelXPBar from "@/components/dashboard/LevelXPBar";

interface UserProfile {
  walletAddress: string;
  displayName: string;
  ensName: string | null;
  cyberAlias: string | null;
  cashBalanceUsd: number;
  stakedBalanceUsd: number;
}

interface GamificationData {
  xp: number;
  level: number;
  badges: Array<{ badge: string; earnedAt: string }>;
  streak: { currentStreak: number; longestStreak: number } | null;
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];

function getXPProgress(xp: number, level: number) {
  const maxLevel = LEVEL_THRESHOLDS.length;
  if (level >= maxLevel) return { current: xp, needed: xp, progress: 100 };
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 1000;
  const progressXp = xp - currentThreshold;
  const neededXp = nextThreshold - currentThreshold;
  const progress = Math.min(100, Math.max(0, (progressXp / neededXp) * 100));
  return { current: progressXp, needed: neededXp, progress };
}

const BADGE_DISPLAY: Record<string, { label: string; color: string }> = {
  FIRST_STAKE: { label: "First Stake", color: "text-[#34D399]" },
  YIELD_HUNTER: { label: "Yield Hunter", color: "text-[#F59E0B]" },
  DIVERSIFIER: { label: "Diversifier", color: "text-[#2D9FFF]" },
  SOCIAL_BUTTERFLY: { label: "Social Butterfly", color: "text-[#818CF8]" },
  WHALE: { label: "Whale", color: "text-[#C084FC]" },
  DIAMOND_HANDS: { label: "Diamond Hands", color: "text-[#34D399]" },
  SWAP_PRO: { label: "Swap Pro", color: "text-[#2D9FFF]" },
  MARKET_MASTER: { label: "Market Master", color: "text-[#F59E0B]" },
};

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }
    if (!address) return;

    Promise.all([
      fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      }).then((r) => r.json()),
      fetch(`/api/gamification?walletAddress=${address}`).then((r) => r.json()),
    ]).then(([profileData, gamData]) => {
      setProfile(profileData);
      setGamification(gamData);
    });
  }, [isConnected, address, router]);

  if (!isConnected || !profile) return null;

  const shortAddr = `${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}`;
  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const { current, needed, progress } = getXPProgress(xp, level);

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Dashboard
          </button>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-6">
        {/* Avatar & Identity */}
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-[#818CF8]/20 border border-white/[0.06] flex items-center justify-center mb-5 text-3xl text-text-primary font-bold select-none">
            {profile.cyberAlias?.[0]?.toUpperCase() ?? "?"}
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">
            {profile.ensName ? (
              <span className="gradient-text">{profile.ensName}</span>
            ) : (
              profile.cyberAlias
            )}
          </h1>

          <p className="text-[14px] text-text-muted mb-4">{shortAddr}</p>

          {/* Level & XP */}
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
                <span className="text-[13px] font-semibold text-accent">Level {level}</span>
              </div>
              <span className="text-[12px] text-text-dim">{current} / {needed} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-[#818CF8] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[12px] text-text-dim mt-1.5 text-center">
              {xp.toLocaleString()} XP total
            </p>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-6 text-center">
            <p className="text-[13px] text-text-muted mb-1.5">Cash Balance</p>
            <p className="text-2xl font-bold text-text-primary tracking-tight">
              ${profile.cashBalanceUsd.toFixed(2)}
            </p>
          </div>
          <div className="card p-6 text-center border-accent/10">
            <p className="text-[13px] text-text-muted mb-1.5">Staked</p>
            <p className="text-2xl font-bold gradient-text-green tracking-tight">
              ${profile.stakedBalanceUsd.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Badges */}
        {gamification && gamification.badges.length > 0 && (
          <div className="card p-7">
            <h2 className="text-[15px] font-semibold text-text-primary mb-4">
              Badges Earned
            </h2>
            <div className="flex flex-wrap gap-2">
              {gamification.badges.map((b) => {
                const display = BADGE_DISPLAY[b.badge] ?? {
                  label: b.badge,
                  color: "text-text-muted",
                };
                return (
                  <span
                    key={b.badge}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border border-white/[0.06] bg-white/[0.02] ${display.color}`}
                  >
                    {display.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Streak */}
        {gamification?.streak && (
          <div className="card p-7">
            <h2 className="text-[15px] font-semibold text-text-primary mb-4">
              Daily Streak
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 text-center">
                <p className="text-[12px] text-text-dim mb-1">Current</p>
                <p className="text-2xl font-bold text-[#F59E0B]">
                  {gamification.streak.currentStreak}
                </p>
                <p className="text-[11px] text-text-dim">days</p>
              </div>
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 text-center">
                <p className="text-[12px] text-text-dim mb-1">Longest</p>
                <p className="text-2xl font-bold text-text-primary">
                  {gamification.streak.longestStreak}
                </p>
                <p className="text-[11px] text-text-dim">days</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy manifest */}
        <div className="card p-7">
          <h2 className="text-[15px] font-semibold text-text-primary mb-4">
            Privacy Manifest
          </h2>
          <div className="space-y-3">
            {[
              "No email address collected or stored",
              "No IP address logged or retained",
              "No real name associated with account",
              "Private keys never leave your device",
              "ENS name fetched client-side, never stored permanently",
              "Cyber-Alias is deterministic from wallet hash",
            ].map((line) => (
              <div key={line} className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#34D399] mt-0.5 flex-shrink-0">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
                <span className="text-[13px] text-text-secondary leading-relaxed">
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
