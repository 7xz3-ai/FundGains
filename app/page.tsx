"use client";

// app/page.tsx
// Landing page — Connect Wallet CTA with Cyber-Noir design.
// No signup, no email. Your wallet IS your identity.

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Redirect to dashboard immediately after wallet connect
  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  return (
    <main className="relative min-h-screen cyber-grid scanlines flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px] bg-[#00ff88] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-5 blur-[100px] bg-[#0066ff] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/5 text-[#00ff88] text-xs font-mono tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          NO-KYC · NON-CUSTODIAL · BASE NETWORK
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-bold mb-4 leading-none">
          <span className="gradient-text">ApexYield</span>
          <br />
          <span className="text-white/90">Anonymous</span>
        </h1>

        <p className="text-lg text-[#8080a0] mb-4 font-mono">
          Your wallet. Your yield. No questions asked.
        </p>
        <p className="text-sm text-[#4a4a6a] mb-12 max-w-md mx-auto">
          Connect any wallet to instantly see your staking projections.
          Zero signup. Zero KYC. Your identity is your address.
        </p>

        {/* Connect Button */}
        <div className="flex justify-center">
          <ConnectButton
            label="Connect Wallet → Start Earning"
            showBalance={false}
          />
        </div>

        {/* Privacy assurances */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔒", label: "Zero-Data Policy", desc: "No emails, no names, no IPs stored" },
            { icon: "⛓", label: "Non-Custodial", desc: "Your keys, your funds. Always." },
            { icon: "👤", label: "Pseudo-Anonymous", desc: "ENS name or auto Cyber-Alias" },
          ].map((item) => (
            <div
              key={item.label}
              className="card p-4 flex flex-col items-center gap-2"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold text-[#00ff88] uppercase tracking-wide">
                {item.label}
              </span>
              <span className="text-xs text-[#4a4a6a]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-[#2a2a4a] font-mono">
        Built on Base · Powered by Alchemy · No rug, no KYC
      </footer>
    </main>
  );
}
