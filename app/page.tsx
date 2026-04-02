"use client";

// app/page.tsx
// Landing page — Premium fintech design with wallet connect CTA.

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  return (
    <main className="relative min-h-screen bg-mesh flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.06] blur-[140px] bg-[#2D9FFF] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[120px] bg-[#818CF8] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 mb-10 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-md text-[13px] text-text-secondary tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
          Non-Custodial &middot; No KYC &middot; Base Network
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-bold mb-5 leading-[1.05] tracking-tight">
          <span className="gradient-text">ApexYield</span>
          <br />
          <span className="text-white/90">Anonymous</span>
        </h1>

        <p className="text-lg text-text-secondary mb-3 leading-relaxed">
          Your wallet. Your yield. No questions asked.
        </p>
        <p className="text-[15px] text-text-muted mb-14 max-w-md mx-auto leading-relaxed">
          Connect any wallet to instantly see your staking projections.
          Zero signup. Zero KYC. Your identity is your address.
        </p>

        {/* Connect Button */}
        <div className="flex justify-center">
          <ConnectButton
            label="Connect Wallet"
            showBalance={false}
          />
        </div>

        {/* Trust signals */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2D9FFF]">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ),
              label: "Zero-Data Policy",
              desc: "No emails, no names, no IPs stored",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#34D399]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              label: "Non-Custodial",
              desc: "Your keys, your funds. Always.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#818CF8]">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
              label: "Pseudo-Anonymous",
              desc: "ENS name or auto Cyber-Alias",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="card p-6 flex flex-col items-center gap-3 text-center"
            >
              {item.icon}
              <span className="text-[13px] font-semibold text-text-primary tracking-wide">
                {item.label}
              </span>
              <span className="text-[13px] text-text-muted leading-relaxed">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-[13px] text-text-dim">
        Built on Base &middot; Powered by Alchemy
      </footer>
    </main>
  );
}
