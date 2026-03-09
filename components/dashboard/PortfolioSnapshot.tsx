"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, TrendingUp, TrendingDown, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Holding = {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice?: number;
};

/* Mini donut SVG for allocation visualization */
function AllocationDonut({ holdings }: { holdings: { symbol: string; value: number; color: string }[] }) {
  const total = holdings.reduce((sum, h) => sum + h.value, 0);
  if (total === 0) return null;

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={radius} fill="none" stroke="color-mix(in srgb, var(--ink) 6%, transparent)" strokeWidth="5" />
      {holdings.map((h, i) => {
        const pct = h.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={i}
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke={h.color}
            strokeWidth="5"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        );
      })}
    </svg>
  );
}

const ALLOC_COLORS = [
  "var(--accent-2)",
  "var(--positive)",
  "var(--warning)",
  "#a78bfa",
  "#f472b6",
];

export default function PortfolioSnapshot() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_portfolio_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed?.holdings ?? [];
        setHoldings(list.slice(0, 5));
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Empty state with CTA */
  if (!holdings.length) {
    return (
      <div className="glass-card p-6 flex flex-col items-center text-center">
        <div
          className="p-3 rounded-2xl mb-3"
          style={{ background: "color-mix(in srgb, var(--accent-2) 10%, transparent)" }}
        >
          <BriefcaseBusiness size={28} className="text-[var(--accent-2)]" />
        </div>
        <p className="text-sm font-medium text-[var(--ink)]">No portfolio positions yet</p>
        <p className="text-xs text-[var(--ink-muted)] mt-1 mb-4 max-w-[220px]">
          Add your holdings to track performance and get AI-powered insights.
        </p>
        <button
          onClick={() => router.push("/portfolio")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{ background: "var(--accent-2)" }}
        >
          <PlusCircle size={14} />
          Add Holdings
        </button>
      </div>
    );
  }

  /* Calculate totals */
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * (h.currentPrice ?? h.avgCost), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isTotalPositive = totalPnl >= 0;

  /* Allocation data for donut */
  const allocData = holdings.map((h, i) => ({
    symbol: h.symbol,
    value: h.shares * (h.currentPrice ?? h.avgCost),
    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
  }));

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Portfolio Snapshot</h3>

      {/* Summary header with donut */}
      <div className="flex items-center gap-4 p-3 rounded-xl mb-3"
        style={{
          background: isTotalPositive
            ? "linear-gradient(135deg, color-mix(in srgb, var(--positive) 6%, transparent), color-mix(in srgb, var(--positive) 2%, transparent))"
            : "linear-gradient(135deg, color-mix(in srgb, var(--negative) 6%, transparent), color-mix(in srgb, var(--negative) 2%, transparent))",
        }}
      >
        <AllocationDonut holdings={allocData} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-0.5">
            Total Value
          </div>
          <div className="text-xl font-bold text-[var(--ink)]">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isTotalPositive ? (
              <TrendingUp size={12} className="text-[var(--positive)]" />
            ) : (
              <TrendingDown size={12} className="text-[var(--negative)]" />
            )}
            <span
              className="text-xs font-bold"
              style={{ color: isTotalPositive ? "var(--positive)" : "var(--negative)" }}
            >
              {isTotalPositive ? "+" : ""}${totalPnl.toFixed(2)} ({isTotalPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Holdings list */}
      <div className="space-y-0.5">
        {holdings.map((h, i) => {
          const value = h.shares * (h.currentPrice ?? h.avgCost);
          const pnl = h.currentPrice ? (h.currentPrice - h.avgCost) * h.shares : 0;
          const pnlPct = h.avgCost > 0 && h.currentPrice ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
          const isPositive = pnl >= 0;

          return (
            <div
              key={h.symbol}
              className="flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] hover:translate-x-0.5 cursor-default group"
            >
              <div className="flex items-center gap-2.5">
                {/* Color allocation dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                />
                <div>
                  <span className="font-semibold text-sm text-[var(--ink)] group-hover:text-[var(--accent-2)] transition-colors">
                    {h.symbol}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)] ml-2">{h.shares} shares</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[var(--ink)]">
                  ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: isPositive ? "var(--positive)" : "var(--negative)",
                      background: isPositive
                        ? "color-mix(in srgb, var(--positive) 8%, transparent)"
                        : "color-mix(in srgb, var(--negative) 8%, transparent)",
                    }}
                  >
                    {isPositive ? "+" : ""}{pnlPct.toFixed(1)}%
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
                  >
                    {isPositive ? "+" : ""}${pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
