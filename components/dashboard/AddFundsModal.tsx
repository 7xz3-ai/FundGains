"use client";

// components/dashboard/AddFundsModal.tsx
// Multi-asset deposit modal with chain abstraction.
// Users only see assets — no network logos or chain names.
// Premium glass design with Trust Blue accent.

import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

const DEPOSIT_ASSETS = [
  { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  { symbol: "USDT", name: "Tether", color: "#26A17B" },
  { symbol: "SOL", name: "Solana", color: "#9945FF" },
  { symbol: "TRX", name: "TRON", color: "#FF0013" },
  { symbol: "LINK", name: "Chainlink", color: "#2A5ADA" },
  { symbol: "AERO", name: "Aerodrome", color: "#0052FF" },
];

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export default function AddFundsModal({
  isOpen,
  onClose,
  walletAddress,
}: AddFundsModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(DEPOSIT_ASSETS[0]);

  const handleCopy = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-3xl bg-[#0d0d14]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Add Funds
              </h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                Deposit any supported asset to your wallet
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="px-7 pb-7 space-y-5">
            {/* Asset Selector */}
            <div>
              <label className="text-[12px] text-text-dim mb-2.5 block">
                Select Asset
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DEPOSIT_ASSETS.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                      selectedAsset.symbol === asset.symbol
                        ? "bg-accent/10 border border-accent/30 shadow-[0_0_12px_rgba(45,159,255,0.1)]"
                        : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: asset.color }}
                    >
                      {asset.symbol.slice(0, 1)}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        selectedAsset.symbol === asset.symbol
                          ? "text-accent"
                          : "text-text-muted"
                      }`}
                    >
                      {asset.symbol}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 rounded-2xl bg-white relative">
                <QRCodeSVG
                  value={walletAddress}
                  size={160}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#050508"
                  includeMargin={false}
                />
                {/* Asset badge overlay */}
                <div
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-md"
                  style={{ backgroundColor: selectedAsset.color }}
                >
                  {selectedAsset.symbol.slice(0, 1)}
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div>
              <label className="text-[12px] text-text-dim mb-2 block">
                Deposit Address
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 overflow-hidden">
                  <p className="text-[13px] text-text-secondary font-mono truncate">
                    {walletAddress}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    copied
                      ? "bg-[#34D399]/10 text-[#34D399]"
                      : "bg-white/[0.04] text-text-muted hover:text-text-primary hover:bg-white/[0.06]"
                  }`}
                  title="Copy address"
                >
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[12px] text-text-dim">or</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>

            {/* Buy with Card */}
            <a
              href="https://pay.coinbase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 rounded-2xl text-center text-[14px] font-semibold bg-white/[0.04] border border-white/[0.06] text-text-primary hover:bg-white/[0.06] transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Buy {selectedAsset.symbol} with Card
              </span>
            </a>

            {/* Info — no chain/network references */}
            <p className="text-[11px] text-text-dim text-center leading-relaxed">
              Scan the QR code from your mobile wallet or copy the address above.
              <br />
              Routing is handled automatically — just send {selectedAsset.symbol}.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
