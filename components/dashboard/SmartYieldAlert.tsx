"use client";

// components/dashboard/SmartYieldAlert.tsx
// Smart Yield Assistant — polite banking notification, NOT a chat robot.
// Simulates comparing user's current stake APY against a higher-yielding vault.

import { useEffect, useState } from "react";

interface YieldAlert {
  id: string;
  currentVault: string;
  currentApy: number;
  suggestedVault: string;
  suggestedApy: number;
  asset: string;
  potentialGainUsd: number;
}

export default function SmartYieldAlert({
  walletAddress,
}: {
  walletAddress: string;
}) {
  const [alert, setAlert] = useState<YieldAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [restaking, setRestaking] = useState(false);
  const [restaked, setRestaked] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;

    // Fetch alerts from the existing alerts API and find a YIELD_UPGRADE alert
    fetch(`/api/alerts?walletAddress=${walletAddress}`)
      .then((r) => r.json())
      .then((data) => {
        const yieldAlert = (data.alerts ?? []).find(
          (a: { type: string; isRead: boolean; isDismissed: boolean }) =>
            a.type === "YIELD_UPGRADE" && !a.isDismissed
        );
        if (yieldAlert) {
          // Parse metadata if available, otherwise use simulated data
          const meta = yieldAlert.metadata as Record<string, unknown> | null;
          setAlert({
            id: yieldAlert.id,
            currentVault: (meta?.currentVaultName as string) ?? "Current Vault",
            currentApy: (meta?.currentApyBps as number ?? 480) / 100,
            suggestedVault: (meta?.suggestedVaultName as string) ?? "USDC Stable Vault",
            suggestedApy: (meta?.suggestedApyBps as number ?? 850) / 100,
            asset: (meta?.asset as string) ?? "ETH",
            potentialGainUsd: (meta?.potentialGainUsd as number) ?? 124.50,
          });
        }
      })
      .catch(() => {});
  }, [walletAddress]);

  if (!alert || dismissed || restaked) return null;

  const apyDiff = (alert.suggestedApy - alert.currentApy).toFixed(2);

  async function handleRestake() {
    setRestaking(true);
    // Simulate re-stake action (mark alert as read)
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert!.id, action: "read" }),
      });
    } catch {
      // silently continue
    }
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1500));
    setRestaking(false);
    setRestaked(true);
  }

  return (
    <div className="card p-6 border-accent/10 animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-semibold text-text-primary">
              Yield Opportunity Available
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium">
              +{apyDiff}% APY
            </span>
          </div>

          <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
            Your {alert.asset} position in{" "}
            <span className="text-text-primary font-medium">{alert.currentVault}</span>{" "}
            is earning {alert.currentApy.toFixed(2)}% APY. We found{" "}
            <span className="text-text-primary font-medium">{alert.suggestedVault}</span>{" "}
            offering {alert.suggestedApy.toFixed(2)}% APY — an estimated{" "}
            <span className="text-[#34D399] font-medium">
              +${alert.potentialGainUsd.toFixed(2)}/year
            </span>{" "}
            additional yield on your current stake.
          </p>

          {/* Comparison bar */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex-1">
              <p className="text-[11px] text-text-dim mb-1">Current</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 rounded-full bg-text-muted/30 flex-1">
                  <div
                    className="h-1.5 rounded-full bg-text-muted/60"
                    style={{
                      width: `${(alert.currentApy / alert.suggestedApy) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[12px] text-text-muted font-medium w-14 text-right">
                  {alert.currentApy.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-text-dim mb-1">Suggested</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 rounded-full bg-accent/20 flex-1">
                  <div className="h-1.5 rounded-full bg-accent w-full" />
                </div>
                <span className="text-[12px] text-accent font-medium w-14 text-right">
                  {alert.suggestedApy.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRestake}
              disabled={restaking}
              className="btn-primary text-[13px] px-5 py-2.5"
            >
              {restaking ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "1-Click Re-stake"
              )}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-[13px] text-text-muted hover:text-text-secondary transition-colors px-3 py-2.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
