"use client";

// components/trading/TokenSelector.tsx
// Token selector with search bar, popular tokens, and custom contract address input.

import { useState, useRef, useEffect } from "react";

export interface Token {
  symbol: string;
  name: string;
  color: string;
  address?: string;
}

const DEFAULT_TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  { symbol: "USDT", name: "Tether", color: "#26A17B" },
  { symbol: "SOL", name: "Solana", color: "#9945FF" },
  { symbol: "TRX", name: "TRON", color: "#FF0013" },
  { symbol: "LINK", name: "Chainlink", color: "#2A5ADA" },
  { symbol: "AERO", name: "Aerodrome", color: "#0052FF" },
];

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  excludeSymbol?: string;
}

export default function TokenSelector({
  isOpen,
  onClose,
  onSelect,
  excludeSymbol,
}: TokenSelectorProps) {
  const [search, setSearch] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [customTokens, setCustomTokens] = useState<Token[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setShowManage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allTokens = [...DEFAULT_TOKENS, ...customTokens];
  const filtered = allTokens
    .filter((t) => t.symbol !== excludeSymbol)
    .filter(
      (t) =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
    );

  function handleAddCustom() {
    if (!customAddress || customAddress.length < 10) return;
    const newToken: Token = {
      symbol: `${customAddress.slice(0, 4)}...${customAddress.slice(-4)}`.toUpperCase(),
      name: "Custom Token",
      color: "#6B7280",
      address: customAddress,
    };
    setCustomTokens((prev) => [...prev, newToken]);
    setCustomAddress("");
    setShowManage(false);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-3xl bg-[#0d0d14]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-text-primary">
                Select Token
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search name or paste address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[14px] text-text-primary placeholder-text-dim focus:outline-none focus:border-accent/30 transition-colors"
              />
            </div>
          </div>

          {/* Popular Tokens */}
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {DEFAULT_TOKENS.slice(0, 4)
              .filter((t) => t.symbol !== excludeSymbol)
              .map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => {
                    onSelect(t);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-colors"
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.symbol[0]}
                  </div>
                  <span className="text-[12px] font-medium text-text-primary">
                    {t.symbol}
                  </span>
                </button>
              ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.04] mx-6" />

          {/* Token List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-text-dim">No tokens found</p>
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.symbol + (t.address ?? "")}
                  onClick={() => {
                    onSelect(t);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.symbol[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-text-primary">
                      {t.symbol}
                    </p>
                    <p className="text-[12px] text-text-dim">{t.name}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Manage Tokens */}
          <div className="px-6 pb-6 pt-3 border-t border-white/[0.04]">
            {showManage ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Paste contract address (0x...)"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[13px] text-text-primary placeholder-text-dim focus:outline-none focus:border-accent/30 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustom}
                    className="flex-1 py-2 rounded-xl btn-primary text-[12px]"
                  >
                    Import Token
                  </button>
                  <button
                    onClick={() => setShowManage(false)}
                    className="px-4 py-2 rounded-xl btn-secondary text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowManage(true)}
                className="w-full py-2.5 rounded-xl text-[13px] font-medium text-accent hover:text-accent/80 transition-colors"
              >
                Manage Tokens
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
