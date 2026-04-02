"use client";

// app/dashboard/referral/page.tsx
// Tiered Referral dashboard — premium fintech design.

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

  if (!isConnected) return null;

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
          <span className="font-semibold gradient-text text-[15px]">Referrals</span>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Hero */}
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">
            Earn While They Earn
          </h1>
          <p className="text-[14px] text-text-muted max-w-md mx-auto leading-relaxed">
            Share your referral link. Earn 5% of your friends&apos; yield (Tier 1)
            and 1% of their friends&apos; yield (Tier 2). Passive income, compounded.
          </p>
        </div>

        {/* Referral Code */}
        <div className="card p-7">
          <p className="text-[13px] text-text-muted font-medium mb-3">
            Your Referral Code
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl bg-white/[0.02] border border-white/[0.04] px-5 py-3.5 text-[18px] font-semibold text-accent">
              {stats?.referralCode ?? "..."}
            </div>
            <button
              onClick={handleCopy}
              className={`px-5 py-3.5 rounded-2xl text-[14px] font-semibold transition-all ${
                copied
                  ? "bg-[#34D399] text-white"
                  : "btn-primary"
              }`}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Tier Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5 text-center">
            <p className="text-[12px] text-text-dim mb-1.5">Friends</p>
            <p className="text-2xl font-bold text-text-primary">
              {stats?.directReferrals ?? 0}
            </p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-[12px] text-text-dim mb-1.5">Tier 1 Earned</p>
            <p className="text-2xl font-bold gradient-text-green">
              ${stats?.tier1EarnedUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[11px] text-text-dim mt-0.5">5% yield-share</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-[12px] text-text-dim mb-1.5">Tier 2 Earned</p>
            <p className="text-2xl font-bold text-[#818CF8]">
              ${stats?.tier2EarnedUsd.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[11px] text-text-dim mt-0.5">1% yield-share</p>
          </div>
        </div>

        {/* Total */}
        <div className="card p-8 text-center border-accent/10">
          <p className="text-[13px] text-text-muted mb-2">Total Referral Earnings</p>
          <p className="text-3xl font-bold gradient-text-green tracking-tight">
            ${stats?.totalEarnedUsd.toFixed(2) ?? "0.00"}
          </p>
        </div>

        {/* How It Works */}
        <div className="card p-7">
          <h2 className="text-[15px] font-semibold text-text-primary mb-5">
            How Tiered Rewards Work
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-[#34D399]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[13px] font-bold text-[#34D399]">T1</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-primary">
                  Direct Referral (5% yield-share)
                </p>
                <p className="text-[13px] text-text-muted mt-0.5 leading-relaxed">
                  When your friend earns staking yield, you automatically receive 5% as a bonus.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-[#818CF8]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[13px] font-bold text-[#818CF8]">T2</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-primary">
                  Friend-of-Friend (1% yield-share)
                </p>
                <p className="text-[13px] text-text-muted mt-0.5 leading-relaxed">
                  When your friend&apos;s friends earn yield, you receive 1%. Network effects, compounded.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Earnings */}
        {stats?.recentEarnings && stats.recentEarnings.length > 0 && (
          <div className="card p-7">
            <h2 className="text-[15px] font-semibold text-text-primary mb-4">
              Recent Earnings
            </h2>
            <div className="space-y-1">
              {stats.recentEarnings.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                >
                  <span
                    className={`text-[13px] font-medium ${
                      e.tier === 1 ? "text-[#34D399]" : "text-[#818CF8]"
                    }`}
                  >
                    Tier {e.tier}
                  </span>
                  <span className="text-[14px] font-semibold text-text-primary">
                    +${e.amountUsd.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
