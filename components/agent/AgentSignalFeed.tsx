"use client";

import { TrendingUp, TrendingDown, AlertTriangle, Minus, Zap, Radio } from "lucide-react";
import type { AgentSignal } from "../../lib/agents/types";

const SIGNAL_ICON: Record<string, typeof TrendingUp> = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  alert: AlertTriangle,
  action: Zap,
  neutral: Minus,
};

const SIGNAL_COLOR: Record<string, string> = {
  bullish: "var(--positive)",
  bearish: "var(--negative)",
  alert: "var(--warning)",
  action: "var(--accent-2)",
  neutral: "var(--ink-muted)",
};

const SIGNAL_LABEL: Record<string, string> = {
  bullish: "Bullish",
  bearish: "Bearish",
  alert: "Alert",
  action: "Action",
  neutral: "Neutral",
};

/* Format timestamp as relative time */
function formatRelativeTime(timestamp: string | number): string {
  const now = Date.now();
  const then = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const diffMs = now - then;
  if (diffMs < 0 || isNaN(diffMs)) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* Mini confidence bar */
function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div
        className="h-[4px] w-12 rounded-full overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--ink) 8%, transparent)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: color,
          }}
        />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

export default function AgentSignalFeed({ signals, limit = 20 }: { signals: AgentSignal[]; limit?: number }) {
  const visible = signals.slice(0, limit);

  if (!visible.length) {
    return (
      <div className="glass-card p-8 flex flex-col items-center text-center">
        <div
          className="p-3 rounded-2xl mb-3"
          style={{ background: "color-mix(in srgb, var(--accent-2) 10%, transparent)" }}
        >
          <Radio size={24} className="text-[var(--accent-2)] opacity-60" />
        </div>
        <p className="text-sm font-medium text-[var(--ink)]">No signals yet</p>
        <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-[240px]">
          Deploy agents to start receiving real-time trading signals and alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-[var(--border)]">
      {visible.map((signal, i) => {
        const Icon = SIGNAL_ICON[signal.type] || Minus;
        const color = SIGNAL_COLOR[signal.type] || "var(--ink-muted)";
        const label = SIGNAL_LABEL[signal.type] || signal.type;
        const relativeTime = formatRelativeTime(signal.timestamp);

        return (
          <div
            key={`${signal.timestamp}-${i}`}
            className="flex items-start gap-3 p-3 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] hover:translate-x-0.5 cursor-default"
          >
            {/* Signal type icon */}
            <div
              className="mt-0.5 p-1.5 rounded-lg shrink-0"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
            >
              <Icon size={14} style={{ color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-semibold text-xs" style={{ color }}>
                  {signal.symbol}
                </span>

                {/* Signal type badge */}
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 10%, transparent)`,
                  }}
                >
                  {label}
                </span>

                <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">
                  {signal.agentId.replace("-", " ")}
                </span>
              </div>
              <p className="text-sm text-[var(--ink)] leading-snug">{signal.message}</p>

              {/* Confidence bar */}
              <ConfidenceBar value={signal.confidence} color={color} />
            </div>

            {/* Relative timestamp */}
            <div className="text-right shrink-0 pt-0.5">
              <div className="text-[10px] text-[var(--ink-muted)] font-medium">{relativeTime}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
