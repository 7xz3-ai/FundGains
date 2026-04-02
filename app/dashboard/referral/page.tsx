"use client";

// app/dashboard/referral/page.tsx
// Tiered Referral dashboard — share code, track earnings across Tier 1 & 2.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface ReferralStats {
  referralCode: string;
  directReferrals: number;
  totalEarnedUsd: number;
  tier1EarnedUsd: number;
  tier2EarnedUsd: number;
  recentEarnings: Array<{ tier: number; amountUsd: number; date: string }>;
}

export default function ReferralPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    fetch(`/api/referral?walletAddress=${address}`)
      .then((r) => r.json())
      .then(setStats);
  }, [isConnected, address]);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  function handleCopy() {
    if (!stats?.referralCode) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}?ref=${stats.referralCode}`;
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen cyber-grid">
      <nav className="border-b border-[#1a1a2e] bg-[#050508]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-mono text-[#4a4a6a] hover:text-[#00ff88] transition-colors"
          >
            ← Dashboard
          </button>
          <span className="font-bold gradient-text">Referrals</span>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="card p-6 text-center border-[#00ff88]/10">
          <h1 className="text-2xl font-bold text-white mb-2">
            Earn While They Earn
          </h1>
          <p className="text-sm text-[#4a4a6a] font-mono max-w-md mx-auto">
            Share your referral link. Earn 5% of your friends' yield (Tier 1)
            and 1% of their friends' yield (Tier 2). Passive income, compounded.
          </p>
        </div>

        {/* Referral Code */}
        <div className="card p-6">
          <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-3">
            Your Referral Code
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#12121c] border border-[#1a1a2e] rounded-lg px-4 py-3 font-mono text-lg text-[#00ff88]">
              {stats?.referralCode ?? "..."}
            </div>
            <button
              onClick={handleCopy}
              className={`px-4 py-3 rounded-lg text-sm font-mono font-bold transition-all ${
                copied
                  ? "bg-[#00ff88] text-[#050508]"
                  : "border border-[#00ff88]/40 text-[#00ff88] hover:bg-[#00ff88]/10"
              }`}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Tier Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase">
              Friends
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {stats?.directReferrals ?? 0}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase">
              Tier 1 Earned
            </p>
            <p className="text-2xl font-bold text-[#00ff88] mt-1">
              ${stats?.tier1EarnedUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[10px] text-[#4a4a6a] font-mono">5% yield-share</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase">
              Tier 2 Earned
            </p>
            <p className="text-2xl font-bold text-[#00aaff] mt-1">
              ${stats?.tier2EarnedUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[10px] text-[#4a4a6a] font-mono">1% yield-share</p>
          </div>
        </div>

        {/* Total */}
        <div className="card p-6 border-[#00ff88]/20 text-center">
          <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-1">
            Total Referral Earnings
          </p>
          <p className="text-3xl font-bold text-[#00ff88]">
            ${stats?.totalEarnedUsd.toFixed(2) ?? "0.00"}
          </p>
        </div>

        {/* How It Works */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-white mb-4 font-mono uppercase tracking-widest">
            How Tiered Rewards Work
          </h2>
          <div className="space-y-3 text-sm font-mono">
            <div className="flex items-start gap-3">
              <span className="text-[#00ff88] font-bold w-6">T1</span>
              <div>
                <p className="text-white">Direct Referral (5% yield-share)</p>
                <p className="text-xs text-[#4a4a6a]">
                  When your friend earns staking yield, you automatically receive 5% as a bonus.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00aaff] font-bold w-6">T2</span>
              <div>
                <p className="text-white">Friend-of-Friend (1% yield-share)</p>
                <p className="text-xs text-[#4a4a6a]">
                  When your friend's friends earn yield, you receive 1%. Network effects, compounded.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Earnings */}
        {stats?.recentEarnings && stats.recentEarnings.length > 0 && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-white mb-3">
              Recent Earnings
            </h2>
            <div className="space-y-2">
              {stats.recentEarnings.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-[#1a1a2e] last:border-0 text-sm font-mono"
                >
                  <span className={e.tier === 1 ? "text-[#00ff88]" : "text-[#00aaff]"}>
                    Tier {e.tier}
                  </span>
                  <span className="text-white">+${e.amountUsd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
