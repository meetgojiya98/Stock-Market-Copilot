"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, ArrowRight, ShieldCheck, PieChart } from "lucide-react";

type PortfolioRow = { symbol: string; shares: number };

type StockMeta = {
  price: number;
  sector: string;
  riskScore: number;
};

const SECTORS = ["Technology", "Healthcare", "Finance", "Consumer", "Energy", "Industrial", "Real Estate", "Utilities"];

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

function getMeta(symbol: string): StockMeta {
  const seed = hashSymbol(symbol);
  const rng = seededRng(seed);
  return {
    price: +(30 + rng() * 420).toFixed(2),
    sector: SECTORS[Math.floor(rng() * SECTORS.length)],
    riskScore: +(1 + rng() * 9).toFixed(1),
  };
}

function computeAllocations(rows: PortfolioRow[]) {
  const items = rows.map((r) => {
    const meta = getMeta(r.symbol);
    return { ...r, ...meta, value: +(meta.price * r.shares).toFixed(2) };
  });
  const total = items.reduce((s, i) => s + i.value, 0);
  return { items, total };
}

function sectorBreakdown(rows: PortfolioRow[]) {
  const { items, total } = computeAllocations(rows);
  const sectors: Record<string, number> = {};
  for (const item of items) {
    sectors[item.sector] = (sectors[item.sector] || 0) + item.value;
  }
  return Object.entries(sectors)
    .map(([sector, value]) => ({ sector, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
}

function avgRisk(rows: PortfolioRow[]) {
  if (rows.length === 0) return 0;
  const { items, total } = computeAllocations(rows);
  if (total === 0) return 0;
  return items.reduce((s, i) => s + i.riskScore * (i.value / total), 0);
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function AllocationBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-24 truncate">{label}</span>
      <div className="flex-1 h-4 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs metric-value w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function WhatIfSimulator() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState(10);
  const [action, setAction] = useState<"buy" | "sell">("buy");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_local_portfolio_v2");
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  const proposed = useMemo(() => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || shares <= 0) return portfolio;
    const copy = [...portfolio.map((r) => ({ ...r }))];
    const existing = copy.find((r) => r.symbol === sym);

    if (action === "buy") {
      if (existing) existing.shares += shares;
      else copy.push({ symbol: sym, shares });
    } else {
      if (existing) {
        existing.shares = Math.max(0, existing.shares - shares);
        if (existing.shares === 0) return copy.filter((r) => r.symbol !== sym);
      }
    }
    return copy;
  }, [portfolio, symbol, shares, action]);

  const hasChange = symbol.trim().length > 0 && shares > 0;
  const currentAlloc = computeAllocations(portfolio);
  const proposedAlloc = computeAllocations(proposed);
  const currentSectors = sectorBreakdown(portfolio);
  const proposedSectors = sectorBreakdown(proposed);
  const currentRisk = avgRisk(portfolio);
  const proposedRisk = avgRisk(proposed);

  const COLORS = ["var(--accent)", "var(--positive)", "#f59e0b", "#3b82f6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

  return (
    <div className="space-y-4">
      {/* Input panel */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Simulate a Change</span>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <label className="text-xs space-y-1">
            <div className="muted">Symbol</div>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. TSLA"
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs space-y-1">
            <div className="muted">Shares</div>
            <input
              type="number"
              min={1}
              value={shares}
              onChange={(e) => setShares(Math.max(1, +e.target.value))}
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs space-y-1">
            <div className="muted">Action</div>
            <div className="flex gap-1">
              {(["buy", "sell"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize border ${
                    action === a
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                      : "border-[var(--surface-border)]"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </label>
          <div className="flex items-end">
            {hasChange && (
              <div className="rounded-lg border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-2 text-xs">
                {action === "buy" ? "+" : "-"}{shares} shares of <strong>{symbol.toUpperCase()}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Before / After comparison */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Current */}
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={14} className="muted" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Current Portfolio</span>
          </div>
          <div className="metric-value text-xl font-semibold mb-3">{formatMoney(currentAlloc.total)}</div>
          <div className="space-y-2">
            {currentSectors.map((s, i) => (
              <AllocationBar key={s.sector} label={s.sector} pct={s.pct} color={COLORS[i % COLORS.length]} />
            ))}
          </div>
          <div className="mt-3 rounded-xl control-surface p-3 flex items-center gap-2">
            <ShieldCheck size={13} className="muted" />
            <span className="text-xs muted">Risk Level:</span>
            <span className="text-sm metric-value font-semibold">{currentRisk.toFixed(1)} / 10</span>
          </div>
        </div>

        {/* Proposed */}
        <div className={`rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up ${hasChange ? "border border-[var(--accent)]" : ""}`}>
          <div className="flex items-center gap-2 mb-3">
            {hasChange ? <ArrowRight size={14} className="text-[var(--accent)]" /> : <PieChart size={14} className="muted" />}
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              {hasChange ? "After Change" : "Proposed Portfolio"}
            </span>
          </div>
          <div className="metric-value text-xl font-semibold mb-3">
            {formatMoney(proposedAlloc.total)}
            {hasChange && proposedAlloc.total !== currentAlloc.total && (
              <span className={`text-sm ml-2 ${proposedAlloc.total > currentAlloc.total ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                ({proposedAlloc.total > currentAlloc.total ? "+" : ""}{formatMoney(proposedAlloc.total - currentAlloc.total)})
              </span>
            )}
          </div>
          <div className="space-y-2">
            {proposedSectors.map((s, i) => (
              <AllocationBar key={s.sector} label={s.sector} pct={s.pct} color={COLORS[i % COLORS.length]} />
            ))}
          </div>
          <div className="mt-3 rounded-xl control-surface p-3 flex items-center gap-2">
            <ShieldCheck size={13} className={hasChange && proposedRisk !== currentRisk ? "text-[var(--accent)]" : "muted"} />
            <span className="text-xs muted">Risk Level:</span>
            <span className="text-sm metric-value font-semibold">{proposedRisk.toFixed(1)} / 10</span>
            {hasChange && proposedRisk !== currentRisk && (
              <span className={`text-xs ml-1 ${proposedRisk > currentRisk ? "text-[var(--negative)]" : "text-[var(--positive)]"}`}>
                ({proposedRisk > currentRisk ? "+" : ""}{(proposedRisk - currentRisk).toFixed(1)})
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasChange && portfolio.length > 0 && (
        <div className="text-center py-4">
          <p className="muted text-sm">Enter a stock symbol and share count above to see how it would change your portfolio.</p>
        </div>
      )}
      {portfolio.length === 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center fade-up">
          <FlaskConical size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="muted text-sm">No stocks in your portfolio yet. Add stocks on the Portfolio page, then come back to simulate changes.</p>
        </div>
      )}
    </div>
  );
}
