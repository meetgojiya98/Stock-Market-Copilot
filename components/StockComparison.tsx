"use client";

import { useState, useCallback } from "react";
import { Plus, X, BarChart3, ArrowUpDown } from "lucide-react";

type StockData = {
  symbol: string;
  price: number;
  changePct: number;
  marketCap: string;
  peRatio: number;
  low52: number;
  high52: number;
  volume: string;
};

const STORAGE_KEY = "smc_comparison_v1";

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

function generateMockData(symbol: string): StockData {
  const seed = hashSymbol(symbol);
  const rng = seededRng(seed);
  const price = +(30 + rng() * 420).toFixed(2);
  const changePct = +((rng() - 0.45) * 8).toFixed(2);
  const capBillions = +(price * (0.5 + rng() * 12)).toFixed(1);
  const peRatio = +(8 + rng() * 55).toFixed(1);
  const low52 = +(price * (0.55 + rng() * 0.3)).toFixed(2);
  const high52 = +(price * (1.05 + rng() * 0.45)).toFixed(2);
  const vol = Math.round(800000 + rng() * 50000000);
  return {
    symbol,
    price,
    changePct,
    marketCap: capBillions >= 100 ? `$${(capBillions / 1).toFixed(0)}B` : `$${capBillions}B`,
    peRatio,
    low52,
    high52,
    volume: vol >= 1000000 ? `${(vol / 1000000).toFixed(1)}M` : `${(vol / 1000).toFixed(0)}K`,
  };
}

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return [];
}

export default function StockComparison() {
  const [symbols, setSymbols] = useState<string[]>(() => loadSaved());
  const [input, setInput] = useState("");

  const persist = useCallback((next: string[]) => {
    setSymbols(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym || symbols.includes(sym) || symbols.length >= 3) return;
    persist([...symbols, sym]);
    setInput("");
  };

  const handleRemove = (sym: string) => {
    persist(symbols.filter((s) => s !== sym));
  };

  const stocks = symbols.map(generateMockData);

  const METRICS: { label: string; key: string; render: (s: StockData) => React.ReactNode }[] = [
    {
      label: "Price",
      key: "price",
      render: (s) => (
        <span className="metric-value text-base font-semibold">${s.price.toFixed(2)}</span>
      ),
    },
    {
      label: "Change %",
      key: "changePct",
      render: (s) => (
        <span className={`metric-value font-semibold ${s.changePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
          {s.changePct >= 0 ? "+" : ""}{s.changePct}%
        </span>
      ),
    },
    { label: "Market Cap", key: "marketCap", render: (s) => <span className="metric-value">{s.marketCap}</span> },
    { label: "P/E Ratio", key: "peRatio", render: (s) => <span className="metric-value">{s.peRatio}</span> },
    {
      label: "52-Week Range",
      key: "range",
      render: (s) => (
        <span className="metric-value text-xs">${s.low52} &ndash; ${s.high52}</span>
      ),
    },
    { label: "Volume", key: "volume", render: (s) => <span className="metric-value">{s.volume}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Add bar */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Add Stocks to Compare</span>
        </div>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Symbol (e.g. AAPL)"
            className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[180px]"
            maxLength={6}
          />
          <button
            type="submit"
            disabled={symbols.length >= 3}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus size={13} />
            Add
          </button>
          <span className="text-xs muted ml-auto">{symbols.length}/3 slots used</span>
        </form>

        {symbols.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {symbols.map((sym) => (
              <span
                key={sym}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-3 py-1 text-xs font-semibold"
              >
                {sym}
                <button onClick={() => handleRemove(sym)} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comparison grid */}
      {stocks.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpDown size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Side-by-Side Comparison</span>
          </div>

          {/* Header row */}
          <div
            className="grid gap-3 mb-3"
            style={{ gridTemplateColumns: `140px repeat(${stocks.length}, 1fr)` }}
          >
            <div />
            {stocks.map((s) => (
              <div key={s.symbol} className="rounded-xl control-surface p-3 text-center">
                <div className="font-semibold text-base section-title">{s.symbol}</div>
                <div className={`text-xs mt-0.5 ${s.changePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct}% today
                </div>
              </div>
            ))}
          </div>

          {/* Metric rows */}
          <div className="space-y-2">
            {METRICS.map((metric) => (
              <div
                key={metric.key}
                className="grid gap-3 items-center"
                style={{ gridTemplateColumns: `140px repeat(${stocks.length}, 1fr)` }}
              >
                <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">{metric.label}</div>
                {stocks.map((s) => (
                  <div key={s.symbol} className="rounded-xl control-surface p-3 text-center text-sm">
                    {metric.render(s)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {stocks.length === 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 sm:p-10 text-center fade-up">
          <BarChart3 size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="muted text-sm">Add up to 3 stock symbols above to start comparing them side by side.</p>
        </div>
      )}
    </div>
  );
}
