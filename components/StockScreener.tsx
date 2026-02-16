"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  ScanSearch,
  Search,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import EmptyState from "./EmptyState";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
  peRatio: number;
  dividendYield: number;
  volume: number;
  sector: string;
};

type SortKey = keyof Pick<Stock, "symbol" | "price" | "changePct" | "marketCap" | "peRatio" | "dividendYield" | "volume">;
type SortDir = "asc" | "desc";
type CapCategory = "any" | "small" | "mid" | "large";

const STOCKS: Stock[] = [
  { symbol: "AAPL", name: "Apple", price: 189.84, changePct: 1.23, marketCap: 2950, peRatio: 31.2, dividendYield: 0.52, volume: 54200000, sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", price: 415.60, changePct: 0.87, marketCap: 3100, peRatio: 37.5, dividendYield: 0.72, volume: 22100000, sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet", price: 174.12, changePct: -0.34, marketCap: 2140, peRatio: 25.8, dividendYield: 0.0, volume: 25300000, sector: "Communication" },
  { symbol: "AMZN", name: "Amazon", price: 197.45, changePct: 1.56, marketCap: 2040, peRatio: 62.1, dividendYield: 0.0, volume: 44500000, sector: "Consumer Discretionary" },
  { symbol: "NVDA", name: "NVIDIA", price: 875.30, changePct: 3.21, marketCap: 2160, peRatio: 72.4, dividendYield: 0.02, volume: 41800000, sector: "Technology" },
  { symbol: "META", name: "Meta Platforms", price: 502.30, changePct: 0.64, marketCap: 1280, peRatio: 28.9, dividendYield: 0.36, volume: 17600000, sector: "Communication" },
  { symbol: "TSLA", name: "Tesla", price: 248.50, changePct: -2.14, marketCap: 790, peRatio: 68.3, dividendYield: 0.0, volume: 78200000, sector: "Consumer Discretionary" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", price: 412.80, changePct: 0.18, marketCap: 895, peRatio: 10.2, dividendYield: 0.0, volume: 3200000, sector: "Financials" },
  { symbol: "JPM", name: "JPMorgan Chase", price: 198.60, changePct: 0.92, marketCap: 570, peRatio: 12.1, dividendYield: 2.22, volume: 9800000, sector: "Financials" },
  { symbol: "V", name: "Visa", price: 281.20, changePct: 0.45, marketCap: 580, peRatio: 31.5, dividendYield: 0.74, volume: 6700000, sector: "Financials" },
  { symbol: "JNJ", name: "Johnson & Johnson", price: 156.30, changePct: -0.62, marketCap: 377, peRatio: 16.8, dividendYield: 3.02, volume: 7500000, sector: "Healthcare" },
  { symbol: "UNH", name: "UnitedHealth", price: 528.40, changePct: 0.33, marketCap: 488, peRatio: 22.1, dividendYield: 1.38, volume: 3400000, sector: "Healthcare" },
  { symbol: "PG", name: "Procter & Gamble", price: 162.80, changePct: 0.12, marketCap: 383, peRatio: 26.4, dividendYield: 2.38, volume: 6200000, sector: "Consumer Staples" },
  { symbol: "XOM", name: "Exxon Mobil", price: 108.40, changePct: -1.08, marketCap: 430, peRatio: 12.8, dividendYield: 3.42, volume: 16400000, sector: "Energy" },
  { symbol: "HD", name: "Home Depot", price: 356.20, changePct: 0.78, marketCap: 354, peRatio: 24.6, dividendYield: 2.48, volume: 4100000, sector: "Consumer Discretionary" },
  { symbol: "CVX", name: "Chevron", price: 155.60, changePct: -0.88, marketCap: 289, peRatio: 14.2, dividendYield: 3.92, volume: 8200000, sector: "Energy" },
  { symbol: "LLY", name: "Eli Lilly", price: 782.50, changePct: 2.45, marketCap: 740, peRatio: 118.5, dividendYield: 0.64, volume: 4500000, sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer", price: 28.90, changePct: -1.42, marketCap: 163, peRatio: 28.6, dividendYield: 5.68, volume: 31200000, sector: "Healthcare" },
  { symbol: "COST", name: "Costco", price: 718.30, changePct: 0.54, marketCap: 319, peRatio: 48.2, dividendYield: 0.58, volume: 2100000, sector: "Consumer Staples" },
  { symbol: "DIS", name: "Walt Disney", price: 112.40, changePct: -0.28, marketCap: 205, peRatio: 72.8, dividendYield: 0.0, volume: 10500000, sector: "Communication" },
  { symbol: "NEE", name: "NextEra Energy", price: 62.40, changePct: 0.82, marketCap: 128, peRatio: 21.4, dividendYield: 2.88, volume: 9200000, sector: "Utilities" },
  { symbol: "CAT", name: "Caterpillar", price: 328.40, changePct: 1.12, marketCap: 160, peRatio: 17.2, dividendYield: 1.64, volume: 3800000, sector: "Industrials" },
  { symbol: "BA", name: "Boeing", price: 214.30, changePct: -1.85, marketCap: 132, peRatio: -42.0, dividendYield: 0.0, volume: 8900000, sector: "Industrials" },
  { symbol: "AMT", name: "American Tower", price: 198.50, changePct: 0.38, marketCap: 92, peRatio: 42.6, dividendYield: 3.24, volume: 2400000, sector: "Real Estate" },
  { symbol: "NEM", name: "Newmont", price: 42.80, changePct: 1.92, marketCap: 48, peRatio: 18.4, dividendYield: 3.72, volume: 8400000, sector: "Materials" },
  { symbol: "FCX", name: "Freeport-McMoRan", price: 44.60, changePct: 2.34, marketCap: 64, peRatio: 28.8, dividendYield: 0.68, volume: 12100000, sector: "Materials" },
  { symbol: "SO", name: "Southern Co", price: 74.20, changePct: 0.22, marketCap: 81, peRatio: 22.0, dividendYield: 3.78, volume: 4800000, sector: "Utilities" },
  { symbol: "SPG", name: "Simon Property", price: 148.60, changePct: -0.44, marketCap: 49, peRatio: 16.8, dividendYield: 5.12, volume: 2900000, sector: "Real Estate" },
  { symbol: "GE", name: "GE Aerospace", price: 158.20, changePct: 1.38, marketCap: 173, peRatio: 34.2, dividendYield: 0.22, volume: 6200000, sector: "Industrials" },
  { symbol: "KO", name: "Coca-Cola", price: 60.80, changePct: 0.08, marketCap: 262, peRatio: 24.8, dividendYield: 3.08, volume: 12800000, sector: "Consumer Staples" },
];

const SECTORS = [...new Set(STOCKS.map((s) => s.sector))].sort();

function formatCap(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  return `$${value}B`;
}

function formatVolume(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  return `${(value / 1000).toFixed(0)}K`;
}

function capCategory(marketCap: number): CapCategory {
  if (marketCap >= 200) return "large";
  if (marketCap >= 50) return "mid";
  return "small";
}

export default function StockScreener() {
  const [sector, setSector] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPE, setMinPE] = useState("");
  const [maxPE, setMaxPE] = useState("");
  const [minDivYield, setMinDivYield] = useState("");
  const [capFilter, setCapFilter] = useState<CapCategory>("any");
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_local_watchlist_v2");
      const parsed = raw ? JSON.parse(raw) : [];
      setWatchlist(parsed.map((w: { symbol: string }) => w.symbol));
    } catch {
      setWatchlist([]);
    }
  }, []);

  const results = useMemo(() => {
    let filtered = [...STOCKS];

    if (sector) filtered = filtered.filter((s) => s.sector === sector);
    if (minPrice) filtered = filtered.filter((s) => s.price >= Number(minPrice));
    if (maxPrice) filtered = filtered.filter((s) => s.price <= Number(maxPrice));
    if (minPE) filtered = filtered.filter((s) => s.peRatio >= Number(minPE));
    if (maxPE) filtered = filtered.filter((s) => s.peRatio <= Number(maxPE));
    if (minDivYield) filtered = filtered.filter((s) => s.dividendYield >= Number(minDivYield));
    if (capFilter !== "any") filtered = filtered.filter((s) => capCategory(s.marketCap) === capFilter);

    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return filtered;
  }, [sector, minPrice, maxPrice, minPE, maxPE, minDivYield, capFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const addToWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) return;
    const next = [...watchlist, symbol];
    setWatchlist(next);
    try {
      const raw = localStorage.getItem("smc_local_watchlist_v2");
      const current = raw ? JSON.parse(raw) : [];
      current.push({ symbol });
      localStorage.setItem("smc_local_watchlist_v2", JSON.stringify(current));
    } catch {
      localStorage.setItem("smc_local_watchlist_v2", JSON.stringify(next.map((s) => ({ symbol: s }))));
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} className="muted" />;
    return sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={14} />
          <span className="text-sm font-semibold section-title">Filters</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <label className="text-xs space-y-1">
            <div className="muted">Sector</div>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            >
              <option value="">All sectors</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            <div className="muted">Price range</div>
            <div className="flex gap-1">
              <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
              <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
            </div>
          </label>
          <label className="text-xs space-y-1">
            <div className="muted">P/E ratio</div>
            <div className="flex gap-1">
              <input type="number" placeholder="Min" value={minPE} onChange={(e) => setMinPE(e.target.value)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
              <input type="number" placeholder="Max" value={maxPE} onChange={(e) => setMaxPE(e.target.value)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
            </div>
          </label>
          <label className="text-xs space-y-1">
            <div className="muted">Min dividend yield %</div>
            <input type="number" placeholder="0" step={0.1} value={minDivYield} onChange={(e) => setMinDivYield(e.target.value)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs muted font-semibold">Market cap:</span>
          {(["any", "large", "mid", "small"] as CapCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCapFilter(c)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                capFilter === c
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                  : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
              }`}
            >
              {c === "any" ? "Any" : c === "large" ? "Large ($200B+)" : c === "mid" ? "Mid ($50-200B)" : "Small (<$50B)"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center gap-2">
        <Search size={14} className="muted" />
        <span className="text-xs muted font-semibold">{results.length} stocks found</span>
      </div>

      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              <th className="text-left py-2 cursor-pointer select-none" onClick={() => toggleSort("symbol")}>
                <span className="inline-flex items-center gap-1">Symbol <SortIcon col="symbol" /></span>
              </th>
              <th className="text-left py-2 hidden sm:table-cell">Name</th>
              <th className="text-left py-2 hidden lg:table-cell">Sector</th>
              <th className="text-right py-2 cursor-pointer select-none" onClick={() => toggleSort("price")}>
                <span className="inline-flex items-center gap-1 justify-end">Price <SortIcon col="price" /></span>
              </th>
              <th className="text-right py-2 cursor-pointer select-none" onClick={() => toggleSort("changePct")}>
                <span className="inline-flex items-center gap-1 justify-end">Change <SortIcon col="changePct" /></span>
              </th>
              <th className="text-right py-2 cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort("marketCap")}>
                <span className="inline-flex items-center gap-1 justify-end">Mkt Cap <SortIcon col="marketCap" /></span>
              </th>
              <th className="text-right py-2 cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("peRatio")}>
                <span className="inline-flex items-center gap-1 justify-end">P/E <SortIcon col="peRatio" /></span>
              </th>
              <th className="text-right py-2 cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("dividendYield")}>
                <span className="inline-flex items-center gap-1 justify-end">Div % <SortIcon col="dividendYield" /></span>
              </th>
              <th className="text-right py-2 cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort("volume")}>
                <span className="inline-flex items-center gap-1 justify-end">Volume <SortIcon col="volume" /></span>
              </th>
              <th className="text-right py-2"></th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    icon={<ScanSearch size={48} />}
                    title="No stocks match"
                    description="Adjust your filters to find stocks."
                  />
                </td>
              </tr>
            )}
            {results.map((stock) => {
              const inWatchlist = watchlist.includes(stock.symbol);
              return (
                <tr key={stock.symbol} className="border-t border-[var(--surface-border)]">
                  <td className="py-2 font-semibold">{stock.symbol}</td>
                  <td className="py-2 text-xs muted hidden sm:table-cell">{stock.name}</td>
                  <td className="py-2 text-xs muted hidden lg:table-cell">{stock.sector}</td>
                  <td className="py-2 text-right metric-value">${stock.price.toFixed(2)}</td>
                  <td className={`py-2 text-right text-xs font-semibold ${stock.changePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {stock.changePct > 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                  </td>
                  <td className="py-2 text-right text-xs muted hidden sm:table-cell">{formatCap(stock.marketCap)}</td>
                  <td className="py-2 text-right text-xs metric-value hidden md:table-cell">{stock.peRatio.toFixed(1)}</td>
                  <td className="py-2 text-right text-xs metric-value hidden md:table-cell">{stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(2)}%` : "---"}</td>
                  <td className="py-2 text-right text-xs muted hidden lg:table-cell">{formatVolume(stock.volume)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => addToWatchlist(stock.symbol)}
                      disabled={inWatchlist}
                      aria-label={inWatchlist ? `${stock.symbol} added to watchlist` : `Add ${stock.symbol} to watchlist`}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold border transition-colors ${
                        inWatchlist
                          ? "border-[var(--positive)] bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] text-[var(--positive)]"
                          : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25 hover:border-[var(--accent)]"
                      }`}
                    >
                      {inWatchlist ? <Check size={11} /> : <Plus size={11} />}
                      {inWatchlist ? "Added" : "Watch"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
