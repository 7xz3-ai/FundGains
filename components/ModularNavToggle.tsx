"use client";

// components/ModularNavToggle.tsx
// Modular view toggle: Simple (Coinbase) | Pro (Binance) | Earn (OKX).
// Drives layout density and feature visibility across the dashboard.

export type ViewMode = "simple" | "pro" | "earn";

interface ModularNavToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODES: { id: ViewMode; label: string; description: string }[] = [
  { id: "simple", label: "Simple", description: "Clean overview" },
  { id: "pro", label: "Pro", description: "Full terminal" },
  { id: "earn", label: "Earn", description: "Yield & vaults" },
];

export default function ModularNavToggle({ mode, onChange }: ModularNavToggleProps) {
  return (
    <div className="inline-flex items-center rounded-2xl bg-white/[0.03] border border-white/[0.06] p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`relative px-4 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
            mode === m.id
              ? "bg-accent/15 text-accent shadow-sm"
              : "text-text-dim hover:text-text-muted"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
