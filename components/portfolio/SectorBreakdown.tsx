"use client";

import { useMemo } from "react";

type Holding = { symbol: string; shares: number; currentPrice?: number; avgCost?: number };

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", AVGO: "Technology", CRM: "Technology", AMD: "Technology", INTC: "Technology", ORCL: "Technology",
  AMZN: "Consumer Disc.", TSLA: "Consumer Disc.", HD: "Consumer Disc.", NKE: "Consumer Disc.",
  META: "Communication", GOOGL: "Communication", GOOG: "Communication", NFLX: "Communication", DIS: "Communication",
  UNH: "Healthcare", JNJ: "Healthcare", LLY: "Healthcare", PFE: "Healthcare", ABBV: "Healthcare", MRK: "Healthcare",
  JPM: "Financials", V: "Financials", MA: "Financials", BAC: "Financials", GS: "Financials", WFC: "Financials",
  XOM: "Energy", CVX: "Energy", COP: "Energy",
  PG: "Consumer Staples", KO: "Consumer Staples", PEP: "Consumer Staples", COST: "Consumer Staples", WMT: "Consumer Staples",
  CAT: "Industrials", GE: "Industrials", HON: "Industrials", UPS: "Industrials",
  NEE: "Utilities", DUK: "Utilities",
  SPY: "ETF", QQQ: "ETF", VOO: "ETF", VTI: "ETF", IWM: "ETF", DIA: "ETF",
  PLTR: "Technology", SOFI: "Financials", COIN: "Financials",
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#6366f1",
  "Consumer Disc.": "#f59e0b",
  Communication: "#3b82f6",
  Healthcare: "#10b981",
  Financials: "#8b5cf6",
  Energy: "#ef4444",
  "Consumer Staples": "#22c55e",
  Industrials: "#64748b",
  Utilities: "#06b6d4",
  ETF: "#ec4899",
  Other: "#a1a1aa",
};

export default function SectorBreakdown({ holdings }: { holdings: Holding[] }) {
  const sectors = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    for (const h of holdings) {
      const val = h.shares * (h.currentPrice ?? h.avgCost ?? 0);
      if (val <= 0) continue;
      const sector = SECTOR_MAP[h.symbol] || "Other";
      map[sector] = (map[sector] || 0) + val;
      total += val;
    }
    return Object.entries(map)
      .map(([sector, value]) => ({ sector, value, percent: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  if (sectors.length === 0) return null;

  const maxPercent = Math.max(...sectors.map((s) => s.percent));

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-[var(--ink)] mb-3">Sector Exposure</h4>
      <div className="space-y-2">
        {sectors.map((s) => (
          <div key={s.sector}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-[var(--ink)]">{s.sector}</span>
              <span className="text-[11px] text-[var(--ink-muted)] tabular-nums">{s.percent.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(s.percent / maxPercent) * 100}%`,
                  background: SECTOR_COLORS[s.sector] || SECTOR_COLORS.Other,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
