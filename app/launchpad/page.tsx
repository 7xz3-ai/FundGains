"use client";

// app/launchpad/page.tsx
// Apex Launchpad — community-funded token launches.
// Only users with balance > 0 see the Contribute button.
// Obsidian Liquid design with Trust Blue accent.

import { useAccount, useBalance } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Project {
  id: string;
  name: string;
  ticker: string;
  description: string;
  targetUsd: number;
  raisedUsd: number;
  progressPct: number;
  minContribUsd: number;
  maxContribUsd: number;
  tokenPrice: string;
  totalSupply: string;
  status: string;
  contributors: number;
  endsAt: string;
}

export default function LaunchpadPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [contribAmount, setContribAmount] = useState<Record<string, string>>({});
  const [contribLoading, setContribLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address && mounted },
  });

  const hasBalance = balanceData ? parseFloat(balanceData.formatted) > 0 : false;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/launchpad");
        const data = await res.json();
        setProjects(data.projects ?? []);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleContribute(projectId: string) {
    const amount = parseFloat(contribAmount[projectId] || "0");
    if (!amount || amount <= 0 || !address) return;

    setContribLoading(projectId);
    setMessage(null);

    try {
      const res = await fetch("/api/launchpad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          projectId,
          amountUsd: amount,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "Contribution successful!" });
        // Refresh projects
        const refreshRes = await fetch("/api/launchpad");
        const refreshData = await refreshRes.json();
        setProjects(refreshData.projects ?? []);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setContribLoading(null);
    }
  }

  function timeRemaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/governance")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Governance
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Apex Launchpad
          </h1>
          <p className="text-[14px] text-text-muted max-w-lg mx-auto">
            Invest in community-vetted projects. Early access to the next generation of DeFi protocols.
          </p>
        </div>

        {/* Status message */}
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

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {projects.map((project) => (
              <div key={project.id} className="card p-6 sm:p-8 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-[14px] font-bold text-white"
                        style={{ backgroundColor: "#2D9FFF" }}
                      >
                        {project.ticker.slice(0, 1)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-text-primary">{project.name}</h2>
                        <span className="text-[12px] font-mono text-text-muted">${project.ticker}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-accent/10 text-accent">
                    {project.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  {project.description}
                </p>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-[12px] text-text-muted mb-2">
                    <span>${project.raisedUsd.toLocaleString()} raised</span>
                    <span>${project.targetUsd.toLocaleString()} target</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, project.progressPct)}%`,
                        background: "linear-gradient(90deg, #2D9FFF, #34D399)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-text-dim">
                    <span>{project.contributors} contributors</span>
                    <span>{timeRemaining(project.endsAt)}</span>
                  </div>
                </div>

                {/* Token Info */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                    <p className="text-[10px] text-text-dim mb-0.5">Token Price</p>
                    <p className="text-[13px] font-bold text-text-primary">{project.tokenPrice}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                    <p className="text-[10px] text-text-dim mb-0.5">Supply</p>
                    <p className="text-[13px] font-bold text-text-primary">{project.totalSupply}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                    <p className="text-[10px] text-text-dim mb-0.5">Min</p>
                    <p className="text-[13px] font-bold text-text-primary">${project.minContribUsd}</p>
                  </div>
                </div>

                {/* Contribute */}
                {isConnected && hasBalance ? (
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Amount (USD)"
                      className="input-field flex-1 text-[14px]"
                      value={contribAmount[project.id] || ""}
                      onChange={(e) =>
                        setContribAmount((prev) => ({
                          ...prev,
                          [project.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      onClick={() => handleContribute(project.id)}
                      disabled={contribLoading === project.id}
                      className="btn-primary px-6 text-[13px] whitespace-nowrap"
                    >
                      {contribLoading === project.id ? "..." : "Contribute"}
                    </button>
                  </div>
                ) : isConnected ? (
                  <div className="py-3 text-center rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <p className="text-[12px] text-text-dim">
                      Deposit funds to unlock contributions
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back */}
        <div className="text-center pt-4">
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
