"use client";

import { useEffect, useMemo, useState } from "react";
import { Grid3X3, TrendingUp, TrendingDown, Eye } from "lucide-react";

type PortfolioRow = { symbol: string; shares: number };

type HeatBlock = {
  symbol: string;
  shares: number;
  price: number;
  changePct: number;
  value: number;
};

function hashSymbol(symbol: string) {
  return symbol.split("").reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 7), 137);
}

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function generateMock(row: PortfolioRow): HeatBlock {
  const seed = hashSymbol(row.symbol);
  const rng = seededRng(seed);
  const price = +(30 + rng() * 420).toFixed(2);
  const changePct = +((rng() - 0.45) * 8).toFixed(2);
  return {
    symbol: row.symbol,
    shares: row.shares,
    price,
    changePct,
    value: +(price * row.shares).toFixed(2),
  };
}

function colorForChange(pct: number): string {
  if (pct >= 4) return "rgba(22,163,74,0.7)";
  if (pct >= 2) return "rgba(34,197,94,0.55)";
  if (pct >= 0.5) return "rgba(74,222,128,0.4)";
  if (pct >= 0) return "rgba(134,239,172,0.25)";
  if (pct >= -2) return "rgba(252,165,165,0.3)";
  if (pct >= -4) return "rgba(248,113,113,0.5)";
  return "rgba(220,38,38,0.65)";
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

export default function PortfolioHeatmap() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_local_portfolio_v2");
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  const blocks = useMemo(() => {
    const mapped = portfolio.map(generateMock);
    return mapped.sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const totalValue = blocks.reduce((s, b) => s + b.value, 0);
  const gainers = blocks.filter((b) => b.changePct > 0).length;
  const losers = blocks.filter((b) => b.changePct < 0).length;
  const weightedChange = totalValue > 0 ? blocks.reduce((s, b) => s + b.changePct * (b.value / totalValue), 0) : 0;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid sm:grid-cols-3 gap-3 fade-up">
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Total Value</span>
          </div>
          <div className="metric-value text-2xl font-semibold">{formatMoney(totalValue)}</div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[var(--positive)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Gainers / Losers</span>
          </div>
          <div className="metric-value text-2xl font-semibold">
            <span className="text-[var(--positive)]">{gainers}</span>
            <span className="muted mx-1">/</span>
            <span className="text-[var(--negative)]">{losers}</span>
          </div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            {weightedChange >= 0 ? <TrendingUp size={14} className="text-[var(--positive)]" /> : <TrendingDown size={14} className="text-[var(--negative)]" />}
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Weighted Change</span>
          </div>
          <div className={`metric-value text-2xl font-semibold ${weightedChange >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {weightedChange >= 0 ? "+" : ""}{weightedChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Visual Map</span>
          <span className="text-xs muted ml-auto">Block size = position value</span>
        </div>

        {blocks.length === 0 ? (
          <div className="text-center py-8">
            <Grid3X3 size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
            <p className="muted text-sm">No stocks in your portfolio. Add some on the Portfolio page to see the heatmap.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {blocks.map((block) => {
              const pct = totalValue > 0 ? (block.value / totalValue) * 100 : 0;
              const minW = Math.max(80, Math.min(pct * 4, 320));
              const minH = Math.max(70, Math.min(pct * 2.5, 140));
              const isHovered = hoveredSymbol === block.symbol;

              return (
                <div
                  key={block.symbol}
                  className="rounded-xl flex flex-col items-center justify-center cursor-default transition-all duration-200"
                  style={{
                    background: colorForChange(block.changePct),
                    minWidth: `${minW}px`,
                    minHeight: `${minH}px`,
                    flex: `${Math.max(1, Math.round(pct))} 1 0`,
                    border: isHovered ? "2px solid var(--accent)" : "1px solid var(--surface-border)",
                    transform: isHovered ? "scale(1.03)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHoveredSymbol(block.symbol)}
                  onMouseLeave={() => setHoveredSymbol(null)}
                >
                  <div className="font-semibold text-sm section-title">{block.symbol}</div>
                  <div className={`text-xs font-semibold mt-0.5 ${block.changePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {block.changePct >= 0 ? "+" : ""}{block.changePct}%
                  </div>
                  {isHovered && (
                    <div className="text-[10px] muted mt-1 text-center leading-tight">
                      {formatMoney(block.value)}<br />{block.shares} shares @ ${block.price.toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {blocks.length > 0 && (
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Legend:</span>
            {[
              { label: "+4%+", color: "rgba(22,163,74,0.7)" },
              { label: "+2%", color: "rgba(34,197,94,0.55)" },
              { label: "~0%", color: "rgba(134,239,172,0.25)" },
              { label: "-2%", color: "rgba(252,165,165,0.3)" },
              { label: "-4%+", color: "rgba(220,38,38,0.65)" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded" style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
