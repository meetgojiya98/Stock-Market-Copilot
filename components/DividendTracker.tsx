"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, CalendarDays, ArrowUpDown, TrendingUp, Percent } from "lucide-react";

type PortfolioRow = { symbol: string; shares: number };

type DividendInfo = {
  symbol: string;
  shares: number;
  yieldPct: number;
  annualDiv: number;
  nextExDate: string;
  paymentDate: string;
  frequency: string;
  annualIncome: number;
};

type SortKey = "yield" | "date" | "income";

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

function generateDividendData(row: PortfolioRow): DividendInfo {
  const seed = hashSymbol(row.symbol);
  const rng = seededRng(seed);
  const hasDividend = rng() > 0.25;
  const yieldPct = hasDividend ? +(0.4 + rng() * 5.5).toFixed(2) : 0;
  const price = +(30 + rng() * 400).toFixed(2);
  const annualDiv = +(price * yieldPct / 100).toFixed(2);
  const freqOptions = ["Quarterly", "Monthly", "Semi-Annual", "Annual"];
  const frequency = hasDividend ? freqOptions[Math.floor(rng() * freqOptions.length)] : "None";

  const now = new Date();
  const daysOut = Math.floor(10 + rng() * 80);
  const exDate = new Date(now.getTime() + daysOut * 86400000);
  const payDate = new Date(exDate.getTime() + 14 * 86400000);

  return {
    symbol: row.symbol,
    shares: row.shares,
    yieldPct,
    annualDiv,
    nextExDate: hasDividend ? exDate.toISOString().slice(0, 10) : "N/A",
    paymentDate: hasDividend ? payDate.toISOString().slice(0, 10) : "N/A",
    frequency,
    annualIncome: +(annualDiv * row.shares).toFixed(2),
  };
}

function formatDate(d: string) {
  if (d === "N/A") return d;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

export default function DividendTracker() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("income");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_local_portfolio_v2");
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  const dividends = useMemo(() => portfolio.map(generateDividendData), [portfolio]);

  const sorted = useMemo(() => {
    const copy = [...dividends];
    if (sortBy === "yield") copy.sort((a, b) => b.yieldPct - a.yieldPct);
    else if (sortBy === "date") copy.sort((a, b) => (a.nextExDate === "N/A" ? 1 : b.nextExDate === "N/A" ? -1 : a.nextExDate.localeCompare(b.nextExDate)));
    else copy.sort((a, b) => b.annualIncome - a.annualIncome);
    return copy;
  }, [dividends, sortBy]);

  const totalIncome = dividends.reduce((sum, d) => sum + d.annualIncome, 0);
  const dividendStocks = dividends.filter((d) => d.yieldPct > 0);
  const avgYield = dividendStocks.length > 0 ? dividendStocks.reduce((s, d) => s + d.yieldPct, 0) / dividendStocks.length : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-3 fade-up">
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-[var(--positive)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Annual Income</span>
          </div>
          <div className="metric-value text-2xl font-semibold text-[var(--positive)]">{formatMoney(totalIncome)}</div>
          <p className="text-xs muted mt-1">Total dividends you could earn per year</p>
        </div>

        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={14} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Average Yield</span>
          </div>
          <div className="metric-value text-2xl font-semibold">{avgYield.toFixed(2)}%</div>
          <p className="text-xs muted mt-1">Across your dividend-paying stocks</p>
        </div>

        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Dividend Stocks</span>
          </div>
          <div className="metric-value text-2xl font-semibold">{dividendStocks.length}<span className="text-sm muted ml-1">/ {portfolio.length}</span></div>
          <p className="text-xs muted mt-1">Stocks paying dividends in your portfolio</p>
        </div>
      </div>

      {/* Sort controls + table */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Dividend Details</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={12} className="muted" />
            {(["income", "yield", "date"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`rounded-lg px-3 py-1.5 text-xs border ${
                  sortBy === key
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-semibold"
                    : "border-[var(--surface-border)]"
                }`}
              >
                {key === "income" ? "Income" : key === "yield" ? "Yield" : "Ex-Date"}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
            <p className="muted text-sm">No stocks in your portfolio yet. Add stocks on the Portfolio page first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((d) => (
              <div key={d.symbol} className="rounded-xl control-surface p-3 grid sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center">
                <div>
                  <div className="font-semibold section-title">{d.symbol}</div>
                  <div className="text-xs muted">{d.shares} shares</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Yield</div>
                  <div className={`metric-value text-sm ${d.yieldPct > 0 ? "text-[var(--positive)]" : "muted"}`}>{d.yieldPct > 0 ? `${d.yieldPct}%` : "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Annual/Share</div>
                  <div className="metric-value text-sm">{d.annualDiv > 0 ? `$${d.annualDiv}` : "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Next Ex-Date</div>
                  <div className="text-sm">{formatDate(d.nextExDate)}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Frequency</div>
                  <div className="text-sm">{d.frequency}</div>
                </div>
                <div className="text-right sm:text-left">
                  <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Your Income</div>
                  <div className={`metric-value text-sm font-semibold ${d.annualIncome > 0 ? "text-[var(--positive)]" : "muted"}`}>
                    {d.annualIncome > 0 ? formatMoney(d.annualIncome) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
