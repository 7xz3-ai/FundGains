"use client";

// app/governance/page.tsx
// Governance DAO — Weighted Voting (Balance * sqrt(XP)).
// Sovereign Gold (#FFD700) accent for DAO elements.
// Obsidian Liquid design.

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Proposal {
  id: string;
  title: string;
  description: string;
  requestedUsd: number;
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVoters: number;
  quorumRequired: number;
  quorumMet: boolean;
  endsAt: string;
  createdAt: string;
  creator: string;
}

interface TreasuryData {
  totalBalanceUsd: number;
  totalInflowUsd: number;
  totalOutflowUsd: number;
}

const GOLD = "#FFD700";

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ALL">("ACTIVE");

  // Create proposal form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [creating, setCreating] = useState(false);

  // Vote feedback
  const [votingId, setVotingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function load() {
      try {
        const [govRes, treasuryRes] = await Promise.all([
          fetch(`/api/governance${activeTab === "ACTIVE" ? "?status=ACTIVE" : ""}`),
          fetch("/api/treasury"),
        ]);
        const govData = await govRes.json();
        const treasuryData = await treasuryRes.json();
        setProposals(govData.proposals ?? []);
        setTreasury(treasuryData);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeTab]);

  async function handleVote(proposalId: string, choice: "FOR" | "AGAINST" | "ABSTAIN") {
    if (!address) return;
    setVotingId(proposalId);
    setMessage(null);

    try {
      const res = await fetch("/api/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          walletAddress: address,
          proposalId,
          choice,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({
          type: "success",
          text: `Vote cast with ${data.votePower.toLocaleString()} power`,
        });
        // Refresh
        const refreshRes = await fetch(`/api/governance${activeTab === "ACTIVE" ? "?status=ACTIVE" : ""}`);
        const refreshData = await refreshRes.json();
        setProposals(refreshData.proposals ?? []);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setVotingId(null);
    }
  }

  async function handleCreateProposal() {
    if (!address || !newTitle.trim() || !newDesc.trim()) return;
    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          walletAddress: address,
          title: newTitle.trim(),
          description: newDesc.trim(),
          requestedUsd: parseFloat(newAmount) || 0,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "Proposal created!" });
        setShowCreate(false);
        setNewTitle("");
        setNewDesc("");
        setNewAmount("");
        // Refresh
        const refreshRes = await fetch("/api/governance?status=ACTIVE");
        const refreshData = await refreshRes.json();
        setProposals(refreshData.proposals ?? []);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setCreating(false);
    }
  }

  function timeRemaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  }

  function voteBar(proposal: Proposal) {
    const total = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    if (total === 0) return { forPct: 0, againstPct: 0, abstainPct: 0 };
    return {
      forPct: (proposal.votesFor / total) * 100,
      againstPct: (proposal.votesAgainst / total) * 100,
      abstainPct: (proposal.votesAbstain / total) * 100,
    };
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
              onClick={() => router.push("/launchpad")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Launchpad
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: GOLD }}>
            Governance DAO
          </h1>
          <p className="text-[14px] text-text-muted max-w-lg mx-auto">
            Shape the future of ApexYield. Your vote power = Balance x sqrt(XP).
          </p>
        </div>

        {/* Treasury Stats */}
        {treasury && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 text-center" style={{ borderColor: `${GOLD}20` }}>
              <p className="text-[11px] text-text-dim mb-1">Treasury Balance</p>
              <p className="text-2xl font-bold" style={{ color: GOLD }}>
                ${treasury.totalBalanceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-[11px] text-text-dim mb-1">Total Inflows</p>
              <p className="text-xl font-bold text-[#34D399]">
                +${treasury.totalInflowUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-[11px] text-text-dim mb-1">Funded Proposals</p>
              <p className="text-xl font-bold text-text-primary">
                ${treasury.totalOutflowUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

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

        {/* Tabs + Create */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["ACTIVE", "ALL"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setLoading(true); }}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                  activeTab === tab
                    ? "text-white"
                    : "bg-white/[0.03] text-text-muted hover:text-text-primary border border-white/[0.06]"
                }`}
                style={activeTab === tab ? { backgroundColor: GOLD, color: "#0b0e11" } : {}}
              >
                {tab === "ALL" ? "All Proposals" : "Active"}
              </button>
            ))}
          </div>
          {isConnected && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="btn-primary px-5 py-2.5 text-[13px]"
              style={{ backgroundColor: GOLD, color: "#0b0e11" }}
            >
              {showCreate ? "Cancel" : "+ New Proposal"}
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="card p-6 space-y-4" style={{ borderColor: `${GOLD}20` }}>
            <h3 className="text-[15px] font-semibold" style={{ color: GOLD }}>
              Create Proposal
            </h3>
            <input
              type="text"
              placeholder="Proposal title..."
              className="input-field text-[14px]"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={200}
            />
            <textarea
              placeholder="Describe your proposal in detail..."
              className="input-field text-[14px] min-h-[100px] resize-none"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              maxLength={2000}
            />
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[11px] text-text-dim mb-1 block">
                  Treasury Funds Requested (USD)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="input-field text-[14px]"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <button
                onClick={handleCreateProposal}
                disabled={creating || !newTitle.trim() || !newDesc.trim()}
                className="btn-primary px-6 py-3.5 text-[13px]"
                style={{ backgroundColor: GOLD, color: "#0b0e11" }}
              >
                {creating ? "Creating..." : "Submit Proposal"}
              </button>
            </div>
          </div>
        )}

        {/* Proposals */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
          </div>
        ) : proposals.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-text-muted text-[14px]">No proposals yet. Be the first to create one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => {
              const bars = voteBar(proposal);
              const isActive = proposal.status === "ACTIVE" && new Date(proposal.endsAt) > new Date();

              return (
                <div key={proposal.id} className="card p-6 sm:p-8 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-[16px] font-bold text-text-primary">
                          {proposal.title}
                        </h3>
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                          style={
                            proposal.status === "ACTIVE"
                              ? { backgroundColor: `${GOLD}20`, color: GOLD }
                              : proposal.status === "PASSED"
                              ? { backgroundColor: "rgba(52,211,153,0.15)", color: "#34D399" }
                              : { backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }
                          }
                        >
                          {proposal.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-text-dim">
                        by {proposal.creator} · {timeRemaining(proposal.endsAt)} left
                      </p>
                    </div>
                    {proposal.requestedUsd > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-text-dim">Requesting</p>
                        <p className="text-[15px] font-bold" style={{ color: GOLD }}>
                          ${proposal.requestedUsd.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    {proposal.description}
                  </p>

                  {/* Vote Bar */}
                  <div>
                    <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-white/[0.04]">
                      {bars.forPct > 0 && (
                        <div
                          className="h-full rounded-l-full"
                          style={{ width: `${bars.forPct}%`, backgroundColor: "#34D399" }}
                        />
                      )}
                      {bars.againstPct > 0 && (
                        <div
                          className="h-full"
                          style={{ width: `${bars.againstPct}%`, backgroundColor: "#EF4444" }}
                        />
                      )}
                      {bars.abstainPct > 0 && (
                        <div
                          className="h-full rounded-r-full"
                          style={{ width: `${bars.abstainPct}%`, backgroundColor: "#6B7280" }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between mt-2 text-[11px]">
                      <span className="text-[#34D399]">For: {proposal.votesFor.toLocaleString()}</span>
                      <span className="text-[#EF4444]">Against: {proposal.votesAgainst.toLocaleString()}</span>
                      <span className="text-text-dim">Abstain: {proposal.votesAbstain.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-text-dim">
                      <span>{proposal.totalVoters} voters</span>
                      <span>
                        Quorum: {proposal.quorumMet ? (
                          <span className="text-[#34D399]">Met</span>
                        ) : (
                          "Not met"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Vote buttons */}
                  {isActive && isConnected && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVote(proposal.id, "FOR")}
                        disabled={votingId === proposal.id}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 hover:bg-[#34D399]/20"
                      >
                        Vote For
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, "AGAINST")}
                        disabled={votingId === proposal.id}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 hover:bg-[#EF4444]/20"
                      >
                        Vote Against
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, "ABSTAIN")}
                        disabled={votingId === proposal.id}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors bg-white/[0.04] text-text-muted border border-white/[0.06] hover:bg-white/[0.08]"
                      >
                        Abstain
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
