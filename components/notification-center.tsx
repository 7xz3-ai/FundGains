"use client";

// components/notification-center.tsx
// AI Portfolio Agent — Notification Center (popover bell icon).
// Shows Smart Alerts in "Professional Banker" tone.

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const ALERT_ICONS: Record<string, string> = {
  YIELD_UPGRADE: "📈",
  REBALANCE: "⚖️",
  RISK_WARNING: "🛡️",
  STREAK_REMINDER: "🔥",
  REFERRAL_EARNED: "💰",
  LEVEL_UP: "⭐",
};

export default function NotificationCenter() {
  const { address } = useAccount();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/alerts?walletAddress=${address}`)
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, [address]);

  async function handleMarkRead(alertId: string) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, action: "read" }),
    });
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleDismiss(alertId: string) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, action: "dismiss" }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[#12121c] transition-colors"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#8080a0]"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00ff88] text-[#050508] text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto z-50 rounded-xl border border-[#1a1a2e] bg-[#0d0d14] shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-[#0d0d14] px-4 py-3 border-b border-[#1a1a2e] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Portfolio Insights
                </h3>
                <p className="text-xs text-[#4a4a6a] font-mono">
                  AI Yield Advisor
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="text-xs font-mono text-[#00ff88]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#4a4a6a] font-mono">
                No insights yet. Your portfolio is being analyzed.
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a2e]">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`px-4 py-3 transition-colors ${
                      alert.isRead ? "opacity-60" : "bg-[#00ff88]/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">
                        {ALERT_ICONS[alert.type] ?? "📋"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {alert.title}
                        </p>
                        <p className="text-xs text-[#8080a0] mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {alert.actionUrl && (
                            <a
                              href={alert.actionUrl}
                              className="text-xs font-mono text-[#00ff88] hover:underline"
                              onClick={() => {
                                handleMarkRead(alert.id);
                                setIsOpen(false);
                              }}
                            >
                              View Details →
                            </a>
                          )}
                          {!alert.isRead && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="text-xs font-mono text-[#4a4a6a] hover:text-[#8080a0]"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="text-xs font-mono text-[#4a4a6a] hover:text-[#ff4466]"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
