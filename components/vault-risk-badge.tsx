"use client";

// components/vault-risk-badge.tsx
// Safety Shield icon for staking vaults.
// Click to see full Risk Score breakdown.

import { useState } from "react";

interface VaultRisk {
  riskScore: number;
  riskLabel: string;
  auditStatus: string;
  auditor: string | null;
  tvlUsd: number;
  contractAgeDays: number;
  impermanentLossRisk: number;
}

const SCORE_COLORS: Record<string, string> = {
  "Very Safe": "text-green-400 border-green-400/30 bg-green-400/5",
  "Low Risk": "text-blue-400 border-blue-400/30 bg-blue-400/5",
  Moderate: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  Elevated: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  "High Risk": "text-red-400 border-red-400/30 bg-red-400/5",
};

const SHIELD_COLORS: Record<string, string> = {
  "Very Safe": "text-green-400",
  "Low Risk": "text-blue-400",
  Moderate: "text-yellow-400",
  Elevated: "text-orange-400",
  "High Risk": "text-red-400",
};

export default function VaultRiskBadge({
  vaultId,
  compact = false,
}: {
  vaultId: string;
  compact?: boolean;
}) {
  const [risk, setRisk] = useState<VaultRisk | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!risk && !loading) {
      setLoading(true);
      try {
        const res = await fetch(`/api/vault-risk?vaultId=${vaultId}`);
        if (res.ok) setRisk(await res.json());
      } catch {
        /* silently fail */
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  const shieldColor = risk
    ? SHIELD_COLORS[risk.riskLabel] ?? "text-[#8080a0]"
    : "text-[#8080a0]";

  return (
    <div className="relative inline-block">
      {/* Shield Icon */}
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 ${shieldColor} hover:opacity-80 transition-opacity`}
        title="View Safety Score"
      >
        <svg
          width={compact ? 14 : 16}
          height={compact ? 14 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {!compact && risk && (
          <span className="text-xs font-mono font-semibold">
            {risk.riskScore}/10
          </span>
        )}
      </button>

      {/* Risk Detail Popup */}
      {isOpen && risk && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-72 z-50 rounded-xl border border-[#1a1a2e] bg-[#0d0d14] shadow-2xl p-4">
            {/* Score Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Safety Score</h4>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  SCORE_COLORS[risk.riskLabel] ?? ""
                }`}
              >
                {risk.riskScore}/10 · {risk.riskLabel}
              </span>
            </div>

            {/* Score Bar */}
            <div className="w-full h-2 rounded-full bg-[#1a1a2e] mb-4">
              <div
                className={`h-2 rounded-full transition-all ${
                  risk.riskScore <= 3
                    ? "bg-green-400"
                    : risk.riskScore <= 6
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${(risk.riskScore / 10) * 100}%` }}
              />
            </div>

            {/* Detail Rows */}
            <div className="space-y-2 text-xs">
              <Row
                label="Audit"
                value={
                  risk.auditStatus === "audited"
                    ? `✓ ${risk.auditor ?? "Audited"}`
                    : risk.auditStatus === "partial"
                    ? `◐ Partial (${risk.auditor ?? "In Progress"})`
                    : "✗ Unaudited"
                }
                color={
                  risk.auditStatus === "audited"
                    ? "text-green-400"
                    : risk.auditStatus === "partial"
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              />
              <Row
                label="TVL"
                value={`$${(risk.tvlUsd / 1_000_000).toFixed(1)}M`}
              />
              <Row
                label="Contract Age"
                value={`${risk.contractAgeDays} days`}
              />
              <Row
                label="IL Risk"
                value={`${risk.impermanentLossRisk}/10`}
                color={
                  risk.impermanentLossRisk <= 3
                    ? "text-green-400"
                    : "text-yellow-400"
                }
              />
            </div>

            <p className="mt-3 text-[10px] text-[#4a4a6a] font-mono">
              Risk assessment is informational only. Always DYOR.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#4a4a6a] font-mono">{label}</span>
      <span className={`font-mono font-semibold ${color ?? "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
