"use client";

// components/notification-center.tsx
// AI Portfolio Agent — Notification Center (popover bell icon).
// Premium glass design with polite banking tone.

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

const ALERT_ICONS: Record<string, React.ReactNode> = {
  YIELD_UPGRADE: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#34D399]">
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </svg>
  ),
  REBALANCE: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#2D9FFF]">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  RISK_WARNING: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F59E0B]">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  LEVEL_UP: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#818CF8]">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

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
        className="relative p-2 rounded-xl hover:bg-white/[0.04] transition-colors"
        aria-label="Notifications"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-muted"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto z-50 rounded-2xl border border-white/[0.06] bg-[#0d0d14]/95 backdrop-blur-xl shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 bg-[#0d0d14]/95 backdrop-blur-xl px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text-primary text-[14px]">
                  Portfolio Insights
                </h3>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Smart Yield Advisor
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="text-[12px] text-accent font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[14px] text-text-muted">No insights yet.</p>
                <p className="text-[13px] text-text-dim mt-1">
                  Your portfolio is being analyzed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`px-5 py-4 transition-colors ${
                      alert.isRead ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center mt-0.5">
                        {ALERT_ICONS[alert.type] ?? DEFAULT_ICON}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary">
                          {alert.title}
                        </p>
                        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2.5">
                          {alert.actionUrl && (
                            <a
                              href={alert.actionUrl}
                              className="text-[12px] text-accent hover:text-accent/80 font-medium transition-colors"
                              onClick={() => {
                                handleMarkRead(alert.id);
                                setIsOpen(false);
                              }}
                            >
                              View Details
                            </a>
                          )}
                          {!alert.isRead && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="text-[12px] text-text-dim hover:text-text-muted transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="text-[12px] text-text-dim hover:text-[#EF4444] transition-colors"
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
