"use client";

// app/withdraw/page.tsx
// Fiat Off-Ramp — Withdraw USDC/USDT to bank account.
// UI shell for Transak/MoonPay/Stripe integration.
// Obsidian Liquid design.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Withdrawal {
  id: string;
  asset: string;
  amountUsd: number;
  feeUsd: number;
  status: string;
  estimatedDays: number;
  provider: string;
  bankRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

const PROVIDERS = [
  { id: "TRANSAK", name: "Transak", fee: "0.5%", speed: "1-3 days", color: "#5C6BF5" },
  { id: "MOONPAY", name: "MoonPay", fee: "0.5%", speed: "1-2 days", color: "#7B61FF" },
  { id: "STRIPE", name: "Stripe", fee: "0.5%", speed: "1 day", color: "#635BFF" },
];

export default function WithdrawPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [asset, setAsset] = useState<"USDC" | "USDT">("USDC");
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("TRANSAK");
  const [bankRef, setBankRef] = useState("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!address) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/withdraw?walletAddress=${address}`);
        const data = await res.json();
        setWithdrawals(data.withdrawals ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  async function handleWithdraw() {
    const usd = parseFloat(amount);
    if (!usd || usd < 10 || !address) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          asset,
          amountUsd: usd,
          bankRef: bankRef || undefined,
          provider,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({
          type: "success",
          text: `Withdrawal initiated! Estimated arrival: ${data.estimatedDays} business day(s)`,
        });
        setAmount("");
        // Refresh list
        const refreshRes = await fetch(`/api/withdraw?walletAddress=${address}`);
        const refreshData = await refreshRes.json();
        setWithdrawals(refreshData.withdrawals ?? []);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B" },
      PROCESSING: { bg: "rgba(45, 159, 255, 0.12)", text: "#2D9FFF" },
      COMPLETED: { bg: "rgba(52, 211, 153, 0.12)", text: "#34D399" },
      FAILED: { bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444" },
    };
    const s = map[status] ?? map.PENDING;
    return (
      <span
        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        {status}
      </span>
    );
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Cash Out
          </h1>
          <p className="text-[14px] text-text-muted max-w-md mx-auto">
            Withdraw stablecoins to your bank account. Fast, secure, and transparent.
          </p>
        </div>

        {message && (
          <div
            className={`card p-4 text-center text-[13px] font-medium ${
              message.type === "success"
                ? "text-[#34D399] border-[#34D399]/20"
                : "text-[#EF4444] border-[#EF4444]/20"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Withdraw form */}
          <div className="lg:col-span-3 card p-6 sm:p-8 space-y-5">
            <h2 className="text-[15px] font-semibold text-text-primary">Withdraw to Bank</h2>

            {/* Asset selector */}
            <div>
              <label className="text-[11px] text-text-dim mb-2 block">Select Asset</label>
              <div className="grid grid-cols-2 gap-3">
                {(["USDC", "USDT"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAsset(a)}
                    className={`py-3 rounded-xl text-[13px] font-semibold transition-all border ${
                      asset === a
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/[0.06] bg-white/[0.02] text-text-muted hover:border-white/[0.12]"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[11px] text-text-dim mb-2 block">Amount (USD)</label>
              <input
                type="number"
                placeholder="100.00"
                className="input-field text-[16px] font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={10}
              />
              <p className="text-[11px] text-text-dim mt-1">Minimum: $10.00 | Fee: 0.5%</p>
            </div>

            {/* Bank reference */}
            <div>
              <label className="text-[11px] text-text-dim mb-2 block">Bank Account (last 4 digits)</label>
              <input
                type="text"
                placeholder="1234"
                className="input-field text-[14px]"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
              />
            </div>

            {/* Provider */}
            <div>
              <label className="text-[11px] text-text-dim mb-2 block">Payment Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`py-3 px-2 rounded-xl text-center transition-all border ${
                      provider === p.id
                        ? "border-accent bg-accent/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                    }`}
                  >
                    <p className="text-[12px] font-semibold text-text-primary">{p.name}</p>
                    <p className="text-[10px] text-text-dim mt-0.5">{p.speed}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated arrival */}
            {amount && parseFloat(amount) >= 10 && (
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-text-muted">You withdraw</span>
                  <span className="text-text-primary font-semibold">
                    ${parseFloat(amount).toFixed(2)} {asset}
                  </span>
                </div>
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-text-muted">Fee (0.5%)</span>
                  <span className="text-text-dim">
                    -${(parseFloat(amount) * 0.005).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-white/[0.04] pt-2 mt-2 flex justify-between text-[13px]">
                  <span className="text-text-muted">You receive</span>
                  <span className="text-[#34D399] font-bold">
                    ${(parseFloat(amount) * 0.995).toFixed(2)} USD
                  </span>
                </div>
                <p className="text-[11px] text-text-dim mt-3 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  Estimated Arrival: {PROVIDERS.find((p) => p.id === provider)?.speed}
                </p>
              </div>
            )}

            {/* Submit */}
            {isConnected ? (
              <button
                onClick={handleWithdraw}
                disabled={submitting || !amount || parseFloat(amount) < 10}
                className="w-full btn-primary py-3.5 text-[14px]"
              >
                {submitting ? "Processing..." : "Withdraw to Bank"}
              </button>
            ) : (
              <ConnectButton />
            )}
          </div>

          {/* Withdrawal history */}
          <div className="lg:col-span-2 card p-6 space-y-4">
            <h3 className="text-[14px] font-semibold text-text-primary">Recent Withdrawals</h3>
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-text-dim text-[13px]">No withdrawals yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-text-primary">
                        ${w.amountUsd.toFixed(2)} {w.asset}
                      </span>
                      {statusBadge(w.status)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text-dim">
                      <span>{w.provider} {w.bankRef && `· ${w.bankRef}`}</span>
                      <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
