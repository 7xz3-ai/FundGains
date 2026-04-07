"use client";

// app/card/page.tsx
// Virtual Metal Card — Obsidian tier.
// 3D shimmer that reacts to mouse movement, Freeze toggle, View PIN modal.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface CardData {
  id: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  isFrozen: boolean;
  tier: string;
  spentUsd: number;
  limitUsd: number;
}

const GOLD = "#D4AF37";

export default function CardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, mouseX: 50, mouseY: 50 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!address) return;
    async function load() {
      try {
        const res = await fetch(`/api/card?walletAddress=${address}`);
        const data = await res.json();
        if (!data.error) setCard(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  // 3D tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (y - 0.5) * -20,
      rotateY: (x - 0.5) * 20,
      mouseX: x * 100,
      mouseY: y * 100,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, mouseX: 50, mouseY: 50 });
  }, []);

  async function handleFreeze() {
    if (!address) return;
    setFreezing(true);
    try {
      const res = await fetch("/api/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          action: card?.isFrozen ? "unfreeze" : "freeze",
        }),
      });
      const data = await res.json();
      if (card) setCard({ ...card, isFrozen: data.isFrozen });
    } catch {
      // silent
    } finally {
      setFreezing(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </button>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: GOLD }}>
            Obsidian Card
          </h1>
          <p className="text-[14px] text-text-muted max-w-md mx-auto">
            Your premium virtual debit card. Spend crypto anywhere.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
          </div>
        ) : card ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* 3D Metal Card */}
            <div className="flex justify-center">
              <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="metal-card w-full max-w-[400px] aspect-[1.586/1] p-6 sm:p-8 cursor-default select-none"
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                  ["--mouse-x" as string]: `${tilt.mouseX}%`,
                  ["--mouse-y" as string]: `${tilt.mouseY}%`,
                }}
              >
                <div className="flex flex-col justify-between h-full relative z-10">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: `${GOLD}80` }}>
                        {card.tier}
                      </p>
                      <p className="text-[14px] font-bold text-white/90 mt-0.5">
                        ApexYield
                      </p>
                    </div>
                    {card.isFrozen && (
                      <span
                        className="text-[10px] font-bold px-3 py-1 rounded-full"
                        style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}
                      >
                        FROZEN
                      </span>
                    )}
                  </div>

                  {/* Chip */}
                  <div className="my-4">
                    <div
                      className="w-10 h-7 rounded-md"
                      style={{
                        background: `linear-gradient(135deg, ${GOLD}40, ${GOLD}80, ${GOLD}40)`,
                        border: `1px solid ${GOLD}30`,
                      }}
                    />
                  </div>

                  {/* Card number */}
                  <p className="text-[18px] sm:text-[20px] font-mono font-semibold text-white/80 tracking-[0.15em]">
                    {card.cardNumber}
                  </p>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Valid Thru</p>
                      <p className="text-[14px] font-mono text-white/70">
                        {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Limit</p>
                      <p className="text-[14px] font-mono" style={{ color: GOLD }}>
                        ${card.limitUsd.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Controls */}
            <div className="space-y-4">
              {/* Spending */}
              <div className="card p-6">
                <h3 className="text-[14px] font-semibold text-text-primary mb-4">Spending</h3>
                <div className="flex justify-between text-[12px] text-text-muted mb-2">
                  <span>${card.spentUsd.toFixed(2)} spent</span>
                  <span>${card.limitUsd.toLocaleString()} limit</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (card.spentUsd / card.limitUsd) * 100)}%`,
                      background: `linear-gradient(90deg, ${GOLD}, #F5D76E)`,
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleFreeze}
                  disabled={freezing}
                  className="card p-5 text-center hover:border-white/[0.12] transition-all"
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: card.isFrozen ? "rgba(52, 211, 153, 0.12)" : "rgba(239, 68, 68, 0.12)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={card.isFrozen ? "#34D399" : "#EF4444"} strokeWidth="1.5">
                      {card.isFrozen ? (
                        <>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </>
                      ) : (
                        <>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </>
                      )}
                    </svg>
                  </div>
                  <p className="text-[12px] font-semibold text-text-primary">
                    {freezing ? "..." : card.isFrozen ? "Unfreeze Card" : "Freeze Card"}
                  </p>
                  <p className="text-[10px] text-text-dim mt-0.5">
                    {card.isFrozen ? "Enable transactions" : "Disable all transactions"}
                  </p>
                </button>

                <button
                  onClick={() => setShowPin(true)}
                  className="card p-5 text-center hover:border-white/[0.12] transition-all"
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `rgba(212, 175, 55, 0.12)` }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <p className="text-[12px] font-semibold text-text-primary">View PIN</p>
                  <p className="text-[10px] text-text-dim mt-0.5">Reveal your card PIN</p>
                </button>
              </div>

              {/* Card details */}
              <div className="card p-6 space-y-3">
                <h3 className="text-[14px] font-semibold text-text-primary">Card Details</h3>
                {[
                  { label: "Card Type", value: `${card.tier} Virtual Debit` },
                  { label: "Network", value: "Visa" },
                  { label: "Currency", value: "USD (Multi-asset)" },
                  { label: "Status", value: card.isFrozen ? "Frozen" : "Active" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-[12px]">
                    <span className="text-text-muted">{item.label}</span>
                    <span className="text-text-primary font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <button
                onClick={() => router.push("/withdraw")}
                className="w-full card p-4 text-center hover:border-white/[0.12] transition-all"
              >
                <p className="text-[13px] font-semibold text-text-primary">Cash Out to Bank</p>
                <p className="text-[11px] text-text-dim">Withdraw USDC/USDT to your bank account</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            {isConnected ? (
              <p className="text-text-muted text-[14px]">Unable to load card data.</p>
            ) : (
              <ConnectButton />
            )}
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </main>

      {/* View PIN Modal */}
      {showPin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-8 max-w-sm w-full mx-4 space-y-5">
            <div className="text-center">
              <h3 className="text-[16px] font-bold text-text-primary mb-1">Your Card PIN</h3>
              <p className="text-[12px] text-text-muted">Keep this confidential</p>
            </div>
            <div className="flex justify-center gap-3">
              {["*", "*", "*", "*"].map((d, i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: "rgba(212, 175, 55, 0.08)",
                    border: `1px solid rgba(212, 175, 55, 0.2)`,
                    color: GOLD,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-dim text-center">
              For security, PIN is only visible in the mobile app with biometric verification.
            </p>
            <button
              onClick={() => setShowPin(false)}
              className="w-full btn-secondary py-3 text-[13px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
