"use client";

import { useMemo } from "react";

type Holding = { symbol: string; shares: number; currentPrice?: number; avgCost?: number };

const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e", "#64748b"];

export default function AllocationPieChart({ holdings }: { holdings: Holding[] }) {
  const data = useMemo(() => {
    const items = holdings
      .map((h) => ({
        symbol: h.symbol,
        value: h.shares * (h.currentPrice ?? h.avgCost ?? 0),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((sum, d) => sum + d.value, 0);
    return items.map((d, i) => ({
      ...d,
      percent: total > 0 ? (d.value / total) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }));
  }, [holdings]);

  if (data.length === 0) return null;

  // Build conic-gradient
  let gradientParts: string[] = [];
  let cumPct = 0;
  for (const d of data) {
    gradientParts.push(`${d.color} ${cumPct}% ${cumPct + d.percent}%`);
    cumPct += d.percent;
  }

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-[var(--ink)] mb-3">Portfolio Allocation</h4>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div
          className="shrink-0 w-24 h-24 rounded-full"
          style={{
            background: `conic-gradient(${gradientParts.join(", ")})`,
            mask: "radial-gradient(circle at center, transparent 40%, black 41%)",
            WebkitMask: "radial-gradient(circle at center, transparent 40%, black 41%)",
          }}
        />
        {/* Legend */}
        <div className="flex-1 space-y-1.5 max-h-28 overflow-y-auto">
          {data.map((d) => (
            <div key={d.symbol} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="font-semibold text-[var(--ink)] min-w-[40px]">{d.symbol}</span>
              <span className="text-[var(--ink-muted)] tabular-nums">{d.percent.toFixed(1)}%</span>
              <span className="text-[var(--ink-muted)] tabular-nums ml-auto">${(d.value / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
