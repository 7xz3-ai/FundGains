"use client";

// components/vault-risk-badge.tsx
// Security Shield icon for staking vaults.
// Hover to see Risk Score (1-10) with premium tooltip design.

import { useState, useEffect } from "react";

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
  "Very Safe": "text-[#34D399]",
  "Low Risk": "text-[#2D9FFF]",
  Moderate: "text-[#F59E0B]",
  Elevated: "text-[#F97316]",
  "High Risk": "text-[#EF4444]",
};

const SCORE_BG: Record<string, string> = {
  "Very Safe": "bg-[#34D399]/10 border-[#34D399]/20",
  "Low Risk": "bg-[#2D9FFF]/10 border-[#2D9FFF]/20",
  Moderate: "bg-[#F59E0B]/10 border-[#F59E0B]/20",
  Elevated: "bg-[#F97316]/10 border-[#F97316]/20",
  "High Risk": "bg-[#EF4444]/10 border-[#EF4444]/20",
};

const BAR_COLORS: Record<string, string> = {
  "Very Safe": "bg-[#34D399]",
  "Low Risk": "bg-[#2D9FFF]",
  Moderate: "bg-[#F59E0B]",
  Elevated: "bg-[#F97316]",
  "High Risk": "bg-[#EF4444]",
};

export default function VaultRiskBadge({
  vaultId,
  compact = false,
}: {
  vaultId: string;
  compact?: boolean;
}) {
  const [risk, setRisk] = useState<VaultRisk | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Prefetch risk data on mount
  useEffect(() => {
    if (fetched) return;
    setLoading(true);
    fetch(`/api/vault-risk?vaultId=${vaultId}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setRisk(data);
        setFetched(true);
      })
      .catch(() => setFetched(true))
      .finally(() => setLoading(false));
  }, [vaultId, fetched]);

  const shieldColor = risk
    ? SCORE_COLORS[risk.riskLabel] ?? "text-text-muted"
    : "text-text-muted";

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shield Icon */}
      <div
        className={`inline-flex items-center gap-1.5 ${shieldColor} cursor-pointer transition-opacity hover:opacity-80`}
        title="Security Score"
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
          <span className="text-[12px] font-semibold">
            {risk.riskScore}/10
          </span>
        )}
      </div>

      {/* Hover Tooltip */}
      {isHovered && risk && (
        <div className="absolute left-0 top-full mt-2 w-72 z-50 rounded-2xl bg-[#0d0d14]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl p-5 animate-fade-in">
          {/* Score Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[14px] font-semibold text-text-primary">Security Score</h4>
            <span
              className={`px-2.5 py-1 rounded-xl text-[12px] font-semibold border ${
                SCORE_BG[risk.riskLabel] ?? ""
              } ${SCORE_COLORS[risk.riskLabel] ?? ""}`}
            >
              {risk.riskScore}/10
            </span>
          </div>

          {/* Score Bar */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] mb-5">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                BAR_COLORS[risk.riskLabel] ?? "bg-text-muted"
              }`}
              style={{ width: `${(risk.riskScore / 10) * 100}%` }}
            />
          </div>

          {/* Detail Rows */}
          <div className="space-y-2.5">
            <DetailRow
              label="Risk Level"
              value={risk.riskLabel}
              color={SCORE_COLORS[risk.riskLabel]}
            />
            <DetailRow
              label="Audit"
              value={
                risk.auditStatus === "audited"
                  ? risk.auditor ?? "Audited"
                  : risk.auditStatus === "partial"
                  ? `Partial (${risk.auditor ?? "In Progress"})`
                  : "Unaudited"
              }
              color={
                risk.auditStatus === "audited"
                  ? "text-[#34D399]"
                  : risk.auditStatus === "partial"
                  ? "text-[#F59E0B]"
                  : "text-[#EF4444]"
              }
            />
            <DetailRow
              label="TVL"
              value={`$${(risk.tvlUsd / 1_000_000).toFixed(1)}M`}
            />
            <DetailRow
              label="Contract Age"
              value={`${risk.contractAgeDays} days`}
            />
            <DetailRow
              label="IL Risk"
              value={`${risk.impermanentLossRisk}/10`}
              color={
                risk.impermanentLossRisk <= 3
                  ? "text-[#34D399]"
                  : "text-[#F59E0B]"
              }
            />
          </div>

          <p className="mt-4 text-[11px] text-text-dim pt-3 border-t border-white/[0.04]">
            Risk assessment is informational only. Always DYOR.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isHovered && loading && (
        <div className="absolute left-0 top-full mt-2 w-48 z-50 rounded-2xl bg-[#0d0d14]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl p-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-[13px] text-text-muted">Loading score...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
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
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className={`text-[13px] font-medium ${color ?? "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}
