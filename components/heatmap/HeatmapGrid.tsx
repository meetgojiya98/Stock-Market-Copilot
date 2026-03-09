"use client";

import { useEffect, useState, useMemo } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

type SectorInfo = {
  sector: string;
  color: string;
  symbols: { symbol: string; name: string; weight: number }[];
};

const SECTORS: SectorInfo[] = [
  {
    sector: "Technology",
    color: "#6366f1",
    symbols: [
      { symbol: "AAPL", name: "Apple", weight: 7.5 },
      { symbol: "MSFT", name: "Microsoft", weight: 7.2 },
      { symbol: "NVDA", name: "NVIDIA", weight: 6.8 },
      { symbol: "AVGO", name: "Broadcom", weight: 2.1 },
      { symbol: "CRM", name: "Salesforce", weight: 0.8 },
    ],
  },
  {
    sector: "Consumer Discretionary",
    color: "#f59e0b",
    symbols: [
      { symbol: "AMZN", name: "Amazon", weight: 4.2 },
      { symbol: "TSLA", name: "Tesla", weight: 2.1 },
      { symbol: "HD", name: "Home Depot", weight: 1.0 },
      { symbol: "NKE", name: "Nike", weight: 0.5 },
    ],
  },
  {
    sector: "Communication",
    color: "#3b82f6",
    symbols: [
      { symbol: "META", name: "Meta", weight: 2.8 },
      { symbol: "GOOGL", name: "Alphabet", weight: 4.5 },
      { symbol: "NFLX", name: "Netflix", weight: 0.9 },
      { symbol: "DIS", name: "Disney", weight: 0.6 },
    ],
  },
  {
    sector: "Healthcare",
    color: "#10b981",
    symbols: [
      { symbol: "UNH", name: "UnitedHealth", weight: 1.5 },
      { symbol: "JNJ", name: "J&J", weight: 1.2 },
      { symbol: "LLY", name: "Eli Lilly", weight: 1.8 },
      { symbol: "PFE", name: "Pfizer", weight: 0.5 },
    ],
  },
  {
    sector: "Financials",
    color: "#8b5cf6",
    symbols: [
      { symbol: "JPM", name: "JPMorgan", weight: 1.8 },
      { symbol: "V", name: "Visa", weight: 1.3 },
      { symbol: "MA", name: "Mastercard", weight: 1.1 },
      { symbol: "BAC", name: "BofA", weight: 0.9 },
      { symbol: "GS", name: "Goldman", weight: 0.5 },
    ],
  },
  {
    sector: "Energy",
    color: "#ef4444",
    symbols: [
      { symbol: "XOM", name: "Exxon", weight: 1.3 },
      { symbol: "CVX", name: "Chevron", weight: 0.9 },
      { symbol: "COP", name: "Conoco", weight: 0.4 },
    ],
  },
  {
    sector: "Industrials",
    color: "#64748b",
    symbols: [
      { symbol: "CAT", name: "Caterpillar", weight: 0.6 },
      { symbol: "GE", name: "GE Aero", weight: 0.5 },
      { symbol: "HON", name: "Honeywell", weight: 0.4 },
    ],
  },
  {
    sector: "Consumer Staples",
    color: "#22c55e",
    symbols: [
      { symbol: "PG", name: "P&G", weight: 1.0 },
      { symbol: "KO", name: "Coca-Cola", weight: 0.8 },
      { symbol: "COST", name: "Costco", weight: 0.9 },
    ],
  },
];

type PriceData = {
  price: number;
  change: string;
  changePercent: string;
};

function getHeatColor(changePct: number): string {
  if (changePct > 3) return "#16a34a";
  if (changePct > 2) return "#22c55e";
  if (changePct > 1) return "#4ade80";
  if (changePct > 0.5) return "#86efac";
  if (changePct > 0) return "#bbf7d0";
  if (changePct > -0.5) return "#fecaca";
  if (changePct > -1) return "#fca5a5";
  if (changePct > -2) return "#f87171";
  if (changePct > -3) return "#ef4444";
  return "#dc2626";
}

function getTextColor(changePct: number): string {
  if (Math.abs(changePct) > 1.5) return "#ffffff";
  return changePct >= 0 ? "#166534" : "#991b1b";
}

export default function HeatmapGrid() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const allSymbols = useMemo(() => SECTORS.flatMap((s) => s.symbols.map((x) => x.symbol)), []);

  const fetchPrices = async () => {
    const results: Record<string, PriceData> = {};
    // Fetch in parallel batches of 5
    for (let i = 0; i < allSymbols.length; i += 5) {
      const batch = allSymbols.slice(i, i + 5);
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const res = await fetch(`/api/stocks/price?symbol=${symbol}`);
            if (res.ok) {
              const data = await res.json();
              results[symbol] = {
                price: data.price || 0,
                change: data.change || "0",
                changePercent: data.changePercent || "0%",
              };
            }
          } catch { /* skip */ }
        })
      );
    }
    setPrices(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
  };

  const parseChangePct = (cp: string): number => {
    return parseFloat(cp.replace("%", "").replace("+", "")) || 0;
  };

  // Sector averages
  const sectorPerf = useMemo(() => {
    const result: Record<string, number> = {};
    for (const sector of SECTORS) {
      const changes = sector.symbols
        .map((s) => prices[s.symbol])
        .filter(Boolean)
        .map((p) => parseChangePct(p.changePercent));
      result[sector.sector] = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    }
    return result;
  }, [prices]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <span className="inline-block w-3 h-3 rounded" style={{ background: "#22c55e" }} /> Bullish
            <span className="inline-block w-3 h-3 rounded ml-2" style={{ background: "#ef4444" }} /> Bearish
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--accent-2)] glass-card transition-colors"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Sector grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {SECTORS.map((sector) => {
          const avgChange = sectorPerf[sector.sector] || 0;
          const positive = avgChange >= 0;
          return (
            <div key={sector.sector} className="glass-card overflow-hidden">
              {/* Sector header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: sector.color }} />
                  <span className="text-xs font-bold text-[var(--ink)]">{sector.sector}</span>
                </div>
                <div className="flex items-center gap-1">
                  {positive ? (
                    <TrendingUp size={11} className="text-[var(--positive)]" />
                  ) : (
                    <TrendingDown size={11} className="text-[var(--negative)]" />
                  )}
                  <span className={`text-[11px] font-bold tabular-nums ${positive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Stock tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[var(--border)]">
                {sector.symbols.map((stock) => {
                  const data = prices[stock.symbol];
                  const changePct = data ? parseChangePct(data.changePercent) : 0;
                  const heatBg = data ? getHeatColor(changePct) : "color-mix(in srgb, var(--ink) 5%, transparent)";
                  const textCol = data ? getTextColor(changePct) : "var(--ink-muted)";

                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => { window.location.href = `/research?symbol=${stock.symbol}`; }}
                      className="relative p-3 text-left transition-all hover:opacity-90 hover:scale-[1.02]"
                      style={{ background: heatBg, color: textCol, minHeight: 70 + stock.weight * 4 }}
                    >
                      {loading ? (
                        <div className="animate-pulse space-y-1">
                          <div className="w-10 h-3 rounded bg-white/20" />
                          <div className="w-14 h-3 rounded bg-white/10" />
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-bold">{stock.symbol}</div>
                          <div className="text-[10px] opacity-75 mb-1">{stock.name}</div>
                          {data && (
                            <>
                              <div className="text-sm font-bold tabular-nums">${data.price.toFixed(2)}</div>
                              <div className="text-[11px] font-semibold tabular-nums">
                                {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
