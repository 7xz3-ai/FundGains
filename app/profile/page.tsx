"use client";

// app/profile/page.tsx
// Pseudo-anonymous profile page.
// Shows ENS name (if registered) or generated Cyber-Alias.
// Zero PII — no real name, no email shown.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface UserProfile {
  walletAddress: string;
  displayName: string;
  ensName: string | null;
  cyberAlias: string | null;
  cashBalanceUsd: number;
  stakedBalanceUsd: number;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }
    if (!address) return;

    fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    })
      .then((r) => r.json())
      .then(setProfile);
  }, [isConnected, address, router]);

  if (!isConnected || !profile) return null;

  const shortAddr = `${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}`;

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
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Avatar — derived from alias, never a real photo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full glow-border flex items-center justify-center mb-4 bg-[#0d0d14] text-3xl select-none">
            {profile.cyberAlias?.[0] ?? "?"}
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">
            {profile.ensName ? (
              <span className="gradient-text">{profile.ensName}</span>
            ) : (
              <span className="font-mono">{profile.cyberAlias}</span>
            )}
          </h1>

          <p className="text-sm font-mono text-[#4a4a6a]">{shortAddr}</p>

          {profile.ensName && profile.cyberAlias && (
            <p className="mt-2 text-xs font-mono text-[#00ff88]/60">
              Cyber-Alias: {profile.cyberAlias}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card p-5 text-center">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-1">
              Cash Balance
            </p>
            <p className="text-2xl font-bold text-white">
              ${profile.cashBalanceUsd.toFixed(2)}
            </p>
          </div>
          <div className="card p-5 text-center border-[#00ff88]/20">
            <p className="text-xs font-mono text-[#4a4a6a] uppercase tracking-widest mb-1">
              Staked
            </p>
            <p className="text-2xl font-bold text-[#00ff88]">
              ${profile.stakedBalanceUsd.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Privacy manifest */}
        <div className="card p-6 border-[#00ff88]/10">
          <h2 className="text-sm font-semibold text-[#00ff88] uppercase tracking-widest mb-4 font-mono">
            // Privacy Manifest
          </h2>
          <ul className="space-y-3 text-sm font-mono">
            {[
              "No email address collected or stored",
              "No IP address logged or retained",
              "No real name associated with account",
              "Private keys never leave your device",
              "ENS name fetched client-side, never stored permanently",
              "Cyber-Alias is deterministic — same hash every time",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-[#4a4a6a]">
                <span className="text-[#00ff88] mt-0.5">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
