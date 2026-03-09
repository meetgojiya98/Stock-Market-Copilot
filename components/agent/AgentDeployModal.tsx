"use client";

import { useState } from "react";
import { X, Rocket } from "lucide-react";
import type { AgentConfig } from "../../lib/agents/types";
import { useAgents } from "../../lib/agents/agent-store";

type Props = {
  config: AgentConfig;
  onClose: () => void;
};

export default function AgentDeployModal({ config, onClose }: Props) {
  const { deploy } = useAgents();
  const [symbolInput, setSymbolInput] = useState("AAPL, MSFT, GOOGL");

  const handleDeploy = () => {
    const symbols = symbolInput
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!symbols.length) return;
    deploy(config.id, symbols);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative glass-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
          <X size={18} className="text-[var(--ink-muted)]" />
        </button>

        <h2 className="text-lg font-bold text-[var(--ink)] mb-1">Deploy {config.name}</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-5">{config.description}</p>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-2">
            Symbols (comma-separated)
          </label>
          <input
            type="text"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-2)] transition-colors"
            placeholder="AAPL, TSLA, NVDA..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--ink-muted)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--accent-2)] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Rocket size={14} />
            Deploy Agent
          </button>
        </div>
      </div>
    </div>
  );
}
