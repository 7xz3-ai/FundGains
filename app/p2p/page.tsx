"use client";

// app/p2p/page.tsx
// P2P Gateway — Person-to-Person USDC marketplace.
// Verified Merchant list with trust badges, local payment methods.
// Obsidian Liquid design.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface Merchant {
  id: string;
  name: string;
  avatar: string;
  completionRate: number;
  totalTrades: number;
  isVerified: boolean;
  avgRelease: string;
  online: boolean;
  offers: Offer[];
}

interface Offer {
  id: string;
  side: "buy" | "sell";
  asset: string;
  fiatCurrency: string;
  price: number;
  minAmount: number;
  maxAmount: number;
  paymentMethods: string[];
}

const PAYMENT_COLORS: Record<string, string> = {
  Zelle: "#6D1ED4",
  Revolut: "#0075EB",
  SEPA: "#1A3C6D",
  "Bank Transfer": "#4B5563",
  "Apple Pay": "#000000",
  Venmo: "#008CFF",
};

const MERCHANTS: Merchant[] = [
  {
    id: "m1",
    name: "CryptoVault Pro",
    avatar: "CV",
    completionRate: 99.8,
    totalTrades: 12847,
    isVerified: true,
    avgRelease: "< 2 min",
    online: true,
    offers: [
      { id: "o1", side: "sell", asset: "USDC", fiatCurrency: "USD", price: 1.001, minAmount: 50, maxAmount: 50000, paymentMethods: ["Zelle", "Bank Transfer"] },
      { id: "o2", side: "buy", asset: "USDC", fiatCurrency: "USD", price: 0.998, minAmount: 100, maxAmount: 25000, paymentMethods: ["Zelle", "Revolut"] },
    ],
  },
  {
    id: "m2",
    name: "EUROdesk",
    avatar: "ED",
    completionRate: 99.5,
    totalTrades: 8432,
    isVerified: true,
    avgRelease: "< 5 min",
    online: true,
    offers: [
      { id: "o3", side: "sell", asset: "USDC", fiatCurrency: "EUR", price: 0.922, minAmount: 50, maxAmount: 100000, paymentMethods: ["SEPA", "Revolut"] },
      { id: "o4", side: "sell", asset: "USDT", fiatCurrency: "EUR", price: 0.923, minAmount: 50, maxAmount: 80000, paymentMethods: ["SEPA"] },
    ],
  },
  {
    id: "m3",
    name: "SwiftTrade",
    avatar: "ST",
    completionRate: 98.9,
    totalTrades: 5210,
    isVerified: true,
    avgRelease: "< 3 min",
    online: false,
    offers: [
      { id: "o5", side: "sell", asset: "USDC", fiatCurrency: "USD", price: 1.002, minAmount: 100, maxAmount: 30000, paymentMethods: ["Zelle", "Apple Pay", "Venmo"] },
    ],
  },
  {
    id: "m4",
    name: "AtlasFX",
    avatar: "AF",
    completionRate: 99.2,
    totalTrades: 3890,
    isVerified: false,
    avgRelease: "< 8 min",
    online: true,
    offers: [
      { id: "o6", side: "sell", asset: "USDC", fiatCurrency: "USD", price: 1.003, minAmount: 25, maxAmount: 10000, paymentMethods: ["Bank Transfer", "Zelle"] },
      { id: "o7", side: "buy", asset: "USDT", fiatCurrency: "USD", price: 0.997, minAmount: 50, maxAmount: 15000, paymentMethods: ["Zelle"] },
    ],
  },
  {
    id: "m5",
    name: "LiquidNode",
    avatar: "LN",
    completionRate: 99.9,
    totalTrades: 21300,
    isVerified: true,
    avgRelease: "< 1 min",
    online: true,
    offers: [
      { id: "o8", side: "sell", asset: "USDC", fiatCurrency: "USD", price: 1.000, minAmount: 500, maxAmount: 200000, paymentMethods: ["Bank Transfer", "SEPA", "Revolut"] },
      { id: "o9", side: "buy", asset: "USDC", fiatCurrency: "USD", price: 0.999, minAmount: 500, maxAmount: 150000, paymentMethods: ["Bank Transfer", "SEPA"] },
    ],
  },
];

type Tab = "buy" | "sell";

export default function P2PPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("buy");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");

  const allPayments = ["All", ...new Set(MERCHANTS.flatMap((m) => m.offers.flatMap((o) => o.paymentMethods)))];

  // Flatten offers with merchant info, filter by tab + payment
  const filteredOffers = MERCHANTS.flatMap((m) =>
    m.offers
      .filter((o) => {
        // "buy" tab = user wants to buy = merchant is selling
        const sideMatch = tab === "buy" ? o.side === "sell" : o.side === "buy";
        const paymentMatch = paymentFilter === "All" || o.paymentMethods.includes(paymentFilter);
        return sideMatch && paymentMatch;
      })
      .map((o) => ({ ...o, merchant: m }))
  ).sort((a, b) => (tab === "buy" ? a.price - b.price : b.price - a.price));

  return (
    <div className="min-h-screen bg-mesh">
      <nav className="bg-base/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="font-bold text-lg tracking-tight">
            <span className="gradient-text">ApexYield</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/trade")}
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Trade
            </button>
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            P2P Gateway
          </h1>
          <p className="text-[14px] text-text-muted max-w-lg mx-auto">
            Buy and sell USDC directly with verified merchants. Escrow-protected.
          </p>
        </div>

        {/* Tabs + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["buy", "sell"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  tab === t
                    ? t === "buy"
                      ? "bg-[#34D399] text-[#0b0e11]"
                      : "bg-[#EF4444] text-white"
                    : "bg-white/[0.04] text-text-muted border border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {t === "buy" ? "Buy USDC" : "Sell USDC"}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {allPayments.map((pm) => (
              <button
                key={pm}
                onClick={() => setPaymentFilter(pm)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  paymentFilter === pm
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "text-text-dim border border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>

        {/* Offer List */}
        <div className="space-y-3">
          {filteredOffers.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-text-muted text-[14px]">No offers match your filters.</p>
            </div>
          ) : (
            filteredOffers.map((offer) => (
              <div key={offer.id} className="card p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Merchant info */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white"
                        style={{ backgroundColor: offer.merchant.isVerified ? "#2D9FFF" : "#4B5563" }}
                      >
                        {offer.merchant.avatar}
                      </div>
                      {offer.merchant.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#34D399] border-2 border-[#0b0e11]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-text-primary">
                          {offer.merchant.name}
                        </span>
                        {offer.merchant.isVerified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#2D9FFF">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-dim">
                        <span
                          className={`font-bold ${
                            offer.merchant.completionRate >= 99
                              ? "text-[#34D399]"
                              : offer.merchant.completionRate >= 98
                              ? "text-[#F59E0B]"
                              : "text-text-muted"
                          }`}
                        >
                          {offer.merchant.completionRate}%
                        </span>
                        {offer.merchant.completionRate >= 99 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#34D399]/10 text-[#34D399] text-[8px] font-bold">
                            TRUSTED
                          </span>
                        )}
                        <span>{offer.merchant.totalTrades.toLocaleString()} trades</span>
                        <span>{offer.merchant.avgRelease}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-1 flex items-center gap-6">
                    <div>
                      <p className="text-[10px] text-text-dim">Price</p>
                      <p className="text-[18px] font-bold font-mono text-text-primary">
                        ${offer.price.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-dim">Range</p>
                      <p className="text-[12px] font-mono text-text-secondary">
                        ${offer.minAmount.toLocaleString()} — ${offer.maxAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Payment methods */}
                  <div className="flex flex-wrap gap-1.5">
                    {offer.paymentMethods.map((pm) => (
                      <span
                        key={pm}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium text-white/80"
                        style={{
                          backgroundColor: `${PAYMENT_COLORS[pm] ?? "#4B5563"}20`,
                          border: `1px solid ${PAYMENT_COLORS[pm] ?? "#4B5563"}40`,
                        }}
                      >
                        {pm}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    className={`px-6 py-2.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                      tab === "buy"
                        ? "bg-[#34D399] text-[#0b0e11] hover:bg-[#2DC08A]"
                        : "bg-[#EF4444] text-white hover:bg-[#DC3545]"
                    }`}
                  >
                    {tab === "buy" ? `Buy ${offer.asset}` : `Sell ${offer.asset}`}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Trust info */}
        <div className="card p-6 border-l-2 border-[#2D9FFF]">
          <h4 className="text-[13px] font-semibold text-text-primary mb-2">Escrow Protection</h4>
          <p className="text-[12px] text-text-muted leading-relaxed">
            All P2P trades are secured by ApexYield smart contract escrow. Funds are held on-chain until
            both parties confirm completion. Disputes are resolved by our arbitration DAO within 24 hours.
          </p>
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
