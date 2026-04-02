"use client";

// components/dashboard/RecentActivity.tsx
// Slide-out drawer showing the last 10 transactions with "View on Explorer" links.
// Trust Blue accent for action states.

import { useState, useEffect } from "react";

interface Transaction {
  id: string;
  type: "swap" | "stake" | "unstake" | "deposit" | "withdraw" | "lp_add" | "lp_remove";
  description: string;
  amount: string;
  timestamp: string;
  txHash: string;
  status: "confirmed" | "pending" | "failed";
}

interface RecentActivityProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
}

// Simulated recent transactions
const MOCK_TXS: Transaction[] = [
  {
    id: "1",
    type: "stake",
    description: "Staked in USDC Stable-Vault",
    amount: "+500 USDC",
    timestamp: "2 min ago",
    txHash: "0xa1b2c3d4e5f6789012345678901234567890abcd",
    status: "confirmed",
  },
  {
    id: "2",
    type: "swap",
    description: "Converted ETH → USDC",
    amount: "0.15 ETH",
    timestamp: "18 min ago",
    txHash: "0xb2c3d4e5f67890123456789012345678901234ef",
    status: "confirmed",
  },
  {
    id: "3",
    type: "deposit",
    description: "Received ETH",
    amount: "+0.5 ETH",
    timestamp: "1 hr ago",
    txHash: "0xc3d4e5f678901234567890123456789012345678",
    status: "confirmed",
  },
  {
    id: "4",
    type: "lp_add",
    description: "Added ETH/USDC Liquidity",
    amount: "0.2 ETH + 700 USDC",
    timestamp: "3 hrs ago",
    txHash: "0xd4e5f6789012345678901234567890123456789a",
    status: "confirmed",
  },
  {
    id: "5",
    type: "stake",
    description: "Staked in Base ETH Yield",
    amount: "+0.3 ETH",
    timestamp: "5 hrs ago",
    txHash: "0xe5f67890123456789012345678901234567890ab",
    status: "confirmed",
  },
  {
    id: "6",
    type: "swap",
    description: "Converted SOL → USDC",
    amount: "10 SOL",
    timestamp: "8 hrs ago",
    txHash: "0xf678901234567890123456789012345678901234",
    status: "confirmed",
  },
  {
    id: "7",
    type: "unstake",
    description: "Unstaked from Solana Liquid Stake",
    amount: "-5 SOL",
    timestamp: "1 day ago",
    txHash: "0x0789012345678901234567890123456789012345",
    status: "confirmed",
  },
  {
    id: "8",
    type: "deposit",
    description: "Received USDC",
    amount: "+1,000 USDC",
    timestamp: "1 day ago",
    txHash: "0x1890123456789012345678901234567890123456",
    status: "confirmed",
  },
  {
    id: "9",
    type: "swap",
    description: "Converted USDC → ETH",
    amount: "2,000 USDC",
    timestamp: "2 days ago",
    txHash: "0x2901234567890123456789012345678901234567",
    status: "confirmed",
  },
  {
    id: "10",
    type: "lp_remove",
    description: "Removed SOL/USDC Liquidity",
    amount: "3 SOL + 420 USDC",
    timestamp: "3 days ago",
    txHash: "0x3012345678901234567890123456789012345678",
    status: "confirmed",
  },
];

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  swap: { icon: "⇄", color: "text-accent", bg: "bg-accent/10" },
  stake: { icon: "↗", color: "text-[#34D399]", bg: "bg-[#34D399]/10" },
  unstake: { icon: "↙", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  deposit: { icon: "↓", color: "text-[#34D399]", bg: "bg-[#34D399]/10" },
  withdraw: { icon: "↑", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  lp_add: { icon: "+", color: "text-[#818CF8]", bg: "bg-[#818CF8]/10" },
  lp_remove: { icon: "−", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
};

export default function RecentActivity({
  isOpen,
  onClose,
  walletAddress,
}: RecentActivityProps) {
  const [transactions] = useState<Transaction[]>(MOCK_TXS);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0a0a12]/95 backdrop-blur-xl border-l border-white/[0.06] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">
              Recent Activity
            </h2>
            <p className="text-[12px] text-text-dim mt-0.5">
              Last {transactions.length} transactions
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {transactions.map((tx) => {
            const meta = TYPE_ICONS[tx.type] ?? TYPE_ICONS.swap;
            return (
              <div
                key={tx.id}
                className="flex items-start gap-3 px-2 py-3.5 rounded-xl hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center ${meta.color} text-[16px] font-bold flex-shrink-0 mt-0.5`}
                >
                  {meta.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-text-primary truncate">
                      {tx.description}
                    </p>
                    <span
                      className={`text-[12px] font-semibold ml-2 flex-shrink-0 ${
                        tx.type === "deposit" || tx.type === "stake" || tx.type === "lp_add"
                          ? "text-[#34D399]"
                          : "text-text-secondary"
                      }`}
                    >
                      {tx.amount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-text-dim">
                      {tx.timestamp}
                    </span>
                    <a
                      href={`https://basescan.org/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                    >
                      View on Explorer
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15,3 21,3 21,9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.04] flex-shrink-0">
          <a
            href={`https://basescan.org/address/${walletAddress ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl btn-secondary text-[13px] font-medium flex items-center justify-center gap-2"
          >
            View All on BaseScan
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15,3 21,3 21,9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
