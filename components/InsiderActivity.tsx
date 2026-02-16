"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";

type TransactionType = "buy" | "sell";
type FilterMode = "all" | "buy" | "sell";

type InsiderTransaction = {
  id: string;
  symbol: string;
  insiderName: string;
  role: string;
  type: TransactionType;
  shares: number;
  price: number;
  totalValue: number;
  filingDate: string;
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const INSIDER_NAMES: { name: string; role: string }[] = [
  { name: "Timothy D. Cook", role: "CEO" },
  { name: "Luca Maestri", role: "CFO" },
  { name: "Satya Nadella", role: "CEO" },
  { name: "Amy Hood", role: "CFO" },
  { name: "Jensen Huang", role: "CEO" },
  { name: "Colette Kress", role: "CFO" },
  { name: "Sundar Pichai", role: "CEO" },
  { name: "Ruth Porat", role: "CFO" },
  { name: "Andy Jassy", role: "CEO" },
  { name: "Brian Olsavsky", role: "CFO" },
  { name: "Mark Zuckerberg", role: "CEO" },
  { name: "Susan Li", role: "CFO" },
  { name: "Elon Musk", role: "CEO" },
  { name: "Vaibhav Taneja", role: "CFO" },
  { name: "Jamie Dimon", role: "CEO" },
  { name: "Jeremy Barnum", role: "CFO" },
  { name: "Robert A. Iger", role: "CEO" },
  { name: "Sarah J. Friar", role: "Director" },
  { name: "James P. Gorman", role: "Director" },
  { name: "Andrea Jung", role: "Director" },
  { name: "Alex Gorsky", role: "Director" },
  { name: "Ronald D. Sugar", role: "Director" },
  { name: "Monica Lozano", role: "Director" },
  { name: "David C. Thompson", role: "VP Engineering" },
  { name: "Rachel S. Kim", role: "VP Sales" },
  { name: "Michael B. Chen", role: "VP Product" },
];

const SYMBOLS_POOL = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM"];

const PRICE_RANGES: Record<string, [number, number]> = {
  AAPL: [170, 195],
  MSFT: [380, 420],
  NVDA: [650, 850],
  GOOGL: [140, 165],
  AMZN: [170, 195],
  META: [480, 540],
  TSLA: [180, 260],
  JPM: [185, 210],
};

function generateTransactions(): InsiderTransaction[] {
  const rand = seededRandom(20260216);
  const transactions: InsiderTransaction[] = [];

  for (let i = 0; i < 20; i++) {
    const symbolIdx = Math.floor(rand() * SYMBOLS_POOL.length);
    const symbol = SYMBOLS_POOL[symbolIdx];
    const insiderIdx = Math.floor(rand() * INSIDER_NAMES.length);
    const insider = INSIDER_NAMES[insiderIdx];

    // Skew towards sells (60% sell, 40% buy) — realistic pattern
    const type: TransactionType = rand() < 0.4 ? "buy" : "sell";

    const priceRange = PRICE_RANGES[symbol] || [100, 200];
    const price = Number(
      (priceRange[0] + rand() * (priceRange[1] - priceRange[0])).toFixed(2)
    );

    // Sells tend to be larger than buys
    const shares =
      type === "sell"
        ? Math.round(1000 + rand() * 49000) // 1,000-50,000
        : Math.round(500 + rand() * 15000); // 500-15,500

    const totalValue = Number((shares * price).toFixed(2));

    // Filing dates spread over last 90 days
    const daysAgo = Math.floor(rand() * 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const filingDate = date.toISOString().slice(0, 10);

    transactions.push({
      id: `insider-${i}`,
      symbol,
      insiderName: insider.name,
      role: insider.role,
      type,
      shares,
      price,
      totalValue,
      filingDate,
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
  );
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export default function InsiderActivity() {
  const allTransactions = useMemo(() => generateTransactions(), []);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [symbolFilter, setSymbolFilter] = useState("");

  const filtered = useMemo(() => {
    let result = allTransactions;
    if (filter === "buy") result = result.filter((t) => t.type === "buy");
    if (filter === "sell") result = result.filter((t) => t.type === "sell");
    if (symbolFilter.trim()) {
      const sym = symbolFilter.trim().toUpperCase();
      result = result.filter((t) => t.symbol.includes(sym));
    }
    return result;
  }, [allTransactions, filter, symbolFilter]);

  // Summary stats (last 90 days, all transactions)
  const summary = useMemo(() => {
    const buys = allTransactions.filter((t) => t.type === "buy");
    const sells = allTransactions.filter((t) => t.type === "sell");
    const buyValue = buys.reduce((s, t) => s + t.totalValue, 0);
    const sellValue = sells.reduce((s, t) => s + t.totalValue, 0);
    const netSentiment =
      buyValue > sellValue * 1.2
        ? "Bullish"
        : sellValue > buyValue * 1.2
        ? "Bearish"
        : "Neutral";
    return { buyCount: buys.length, sellCount: sells.length, buyValue, sellValue, netSentiment };
  }, [allTransactions]);

  const filters: { label: string; value: FilterMode; icon: React.ReactNode }[] = [
    { label: "All", value: "all", icon: <Filter size={13} /> },
    { label: "Buys Only", value: "buy", icon: <ArrowUpRight size={13} /> },
    { label: "Sells Only", value: "sell", icon: <ArrowDownRight size={13} /> },
  ];

  const sentimentColor =
    summary.netSentiment === "Bullish"
      ? "var(--positive)"
      : summary.netSentiment === "Bearish"
      ? "var(--negative)"
      : "var(--warning)";

  return (
    <div className="space-y-4 fade-up">
      {/* Summary */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]">
            <Shield size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Insider Trading Activity
            </div>
            <p className="text-xs muted mt-0.5">Last 90 days &mdash; SEC Form 4 filings</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl control-surface p-3">
            <div className="text-[11px] tracking-[0.08em] uppercase muted font-semibold">
              Buy Transactions
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <TrendingUp size={14} style={{ color: "var(--positive)" }} />
              <span className="text-lg font-bold metric-value" style={{ color: "var(--positive)" }}>
                {summary.buyCount}
              </span>
            </div>
            <div className="text-[11px] muted">{formatCurrency(summary.buyValue)} total</div>
          </div>

          <div className="rounded-xl control-surface p-3">
            <div className="text-[11px] tracking-[0.08em] uppercase muted font-semibold">
              Sell Transactions
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <TrendingDown size={14} style={{ color: "var(--negative)" }} />
              <span className="text-lg font-bold metric-value" style={{ color: "var(--negative)" }}>
                {summary.sellCount}
              </span>
            </div>
            <div className="text-[11px] muted">{formatCurrency(summary.sellValue)} total</div>
          </div>

          <div className="rounded-xl control-surface p-3">
            <div className="text-[11px] tracking-[0.08em] uppercase muted font-semibold">
              Net Value
            </div>
            <div className="mt-1 text-lg font-bold metric-value">
              {formatCurrency(Math.abs(summary.buyValue - summary.sellValue))}
            </div>
            <div className="text-[11px] muted">
              {summary.buyValue > summary.sellValue ? "net buying" : "net selling"}
            </div>
          </div>

          <div className="rounded-xl control-surface p-3">
            <div className="text-[11px] tracking-[0.08em] uppercase muted font-semibold">
              Insider Sentiment
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <UserCheck size={14} style={{ color: sentimentColor }} />
              <span className="text-lg font-bold" style={{ color: sentimentColor }}>
                {summary.netSentiment}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
              filter === f.value
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}

        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
          <input
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
            placeholder="Filter by symbol"
            className="rounded-lg control-surface bg-white/75 dark:bg-black/25 pl-8 pr-3 py-2 text-xs w-[140px]"
          />
        </div>
        <span className="text-xs muted">{filtered.length} filings</span>
      </div>

      {/* Transaction list */}
      <div className="rounded-2xl surface-glass dynamic-surface overflow-hidden">
        {/* Table header */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_120px_60px_80px_80px_90px_90px] gap-2 px-4 py-2 text-[11px] tracking-[0.08em] uppercase muted font-semibold border-b border-[var(--surface-border)]">
          <span>Insider</span>
          <span>Symbol</span>
          <span>Type</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Price</span>
          <span className="text-right">Total Value</span>
          <span className="text-right">Filing Date</span>
        </div>

        {filtered.length === 0 && (
          <div className="p-4 text-sm text-center muted">
            No transactions match the current filters.
          </div>
        )}

        {filtered.map((txn) => (
          <div
            key={txn.id}
            className="insider-row grid lg:grid-cols-[1fr_120px_60px_80px_80px_90px_90px] gap-2 px-4 py-3 items-center border-b border-[var(--surface-border)] last:border-b-0"
          >
            {/* Insider info */}
            <div>
              <div className="text-sm font-medium">{txn.insiderName}</div>
              <span className="insider-role text-[11px] muted">{txn.role}</span>
            </div>

            {/* Symbol */}
            <div>
              <span className="text-sm font-semibold">{txn.symbol}</span>
            </div>

            {/* Type badge */}
            <div>
              {txn.type === "buy" ? (
                <span className="insider-buy-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[color-mix(in_srgb,var(--positive)_16%,transparent)]" style={{ color: "var(--positive)" }}>
                  <ArrowUpRight size={10} />
                  Buy
                </span>
              ) : (
                <span className="insider-sell-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[color-mix(in_srgb,var(--negative)_16%,transparent)]" style={{ color: "var(--negative)" }}>
                  <ArrowDownRight size={10} />
                  Sell
                </span>
              )}
            </div>

            {/* Shares */}
            <div className="text-right">
              <span className="text-sm font-mono">{txn.shares.toLocaleString()}</span>
            </div>

            {/* Price */}
            <div className="text-right">
              <span className="text-sm font-mono">${txn.price.toFixed(2)}</span>
            </div>

            {/* Total value */}
            <div className="text-right">
              <span className="text-sm font-semibold metric-value">
                {formatCurrency(txn.totalValue)}
              </span>
            </div>

            {/* Filing date */}
            <div className="text-right">
              <span className="text-xs muted">
                {new Date(txn.filingDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
