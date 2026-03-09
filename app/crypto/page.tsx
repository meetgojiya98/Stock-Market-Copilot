"use client";

import { useState, useMemo, Fragment } from "react";
import PageShell from "../../components/PageShell";
import {
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Globe,
  Activity,
  Gauge,
} from "lucide-react";
import {
  getMockCryptoData,
  formatCryptoPrice,
  formatMarketCap,
  type CryptoAsset,
} from "../../lib/crypto-data";

type SortKey = keyof CryptoAsset;
type SortDir = "asc" | "desc";

export default function CryptoPage() {
  const allCryptos = useMemo(() => getMockCryptoData(), []);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Mock market stats
  const totalMarketCap = allCryptos.reduce((s, c) => s + c.marketCap, 0);
  const btcDominance = ((allCryptos[0]?.marketCap ?? 0) / totalMarketCap * 100).toFixed(1);
  const fearGreedIndex = 62; // mock

  const filtered = useMemo(() => {
    let data = [...allCryptos];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return data;
  }, [allCryptos, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  return (
    <PageShell
      title="Crypto Markets"
      subtitle="Track top cryptocurrencies with real-time mock data"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("table")}
            className="glass-card p-2 transition-colors"
            style={{
              color: viewMode === "table" ? "var(--accent-2)" : "var(--ink-muted)",
              borderColor: viewMode === "table" ? "var(--accent-2)" : "var(--surface-border)",
            }}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className="glass-card p-2 transition-colors"
            style={{
              color: viewMode === "cards" ? "var(--accent-2)" : "var(--ink-muted)",
              borderColor: viewMode === "cards" ? "var(--accent-2)" : "var(--surface-border)",
            }}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      }
    >
      {/* Market stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <Globe size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Total Market Cap</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
            {formatMarketCap(totalMarketCap)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <Activity size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">BTC Dominance</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
            {btcDominance}%
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <Gauge size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Fear & Greed Index</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              {fearGreedIndex}
            </p>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{
                color: "var(--warning)",
                background: "rgba(245,158,11,0.1)",
              }}
            >
              Greed
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card flex items-center gap-2 px-3 py-2 mt-4">
        <Search size={16} style={{ color: "var(--ink-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or symbol..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--ink)" }}
        />
      </div>

      {/* Table view */}
      {viewMode === "table" && (
        <div className="glass-card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                {[
                  { key: "rank" as SortKey, label: "#" },
                  { key: "name" as SortKey, label: "Name" },
                  { key: "symbol" as SortKey, label: "Symbol" },
                  { key: "price" as SortKey, label: "Price" },
                  { key: "change24h" as SortKey, label: "24h %" },
                  { key: "marketCap" as SortKey, label: "Market Cap" },
                  { key: "volume24h" as SortKey, label: "Volume (24h)" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIcon column={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isUp = c.change24h >= 0;
                const isExpanded = expandedRow === c.symbol;
                return (
                  <Fragment key={c.symbol}>
                    <tr
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : c.symbol)
                      }
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: isExpanded
                          ? "none"
                          : "1px solid var(--surface-border)",
                      }}
                    >
                      <td className="px-4 py-3" style={{ color: "var(--ink-muted)" }}>
                        {c.rank}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                        {c.name}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--ink-muted)" }}>
                        {c.symbol}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                        ${formatCryptoPrice(c.price)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                        >
                          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isUp ? "+" : ""}{c.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                        {formatMarketCap(c.marketCap)}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ink-muted)" }}>
                        {formatMarketCap(c.volume24h)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                        <td colSpan={7} className="px-4 py-4" style={{ background: "var(--surface-2)" }}>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>Rank</span>
                              <p className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                                #{c.rank}
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>Price</span>
                              <p className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                                ${formatCryptoPrice(c.price)}
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>Market Cap</span>
                              <p className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                                {formatMarketCap(c.marketCap)}
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>24h Volume</span>
                              <p className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                                {formatMarketCap(c.volume24h)}
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>24h Change</span>
                              <p
                                className="font-semibold mt-0.5"
                                style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                              >
                                {isUp ? "+" : ""}{c.change24h.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>Volume / MCap</span>
                              <p className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                                {((c.volume24h / c.marketCap) * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>Category</span>
                              <p className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                                {c.rank <= 3 ? "Layer 1" : c.rank <= 10 ? "Major Alt" : "Alt"}
                              </p>
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-muted)" }}>Sentiment</span>
                              <p
                                className="font-semibold mt-0.5"
                                style={{ color: isUp ? "var(--positive)" : "var(--warning)" }}
                              >
                                {isUp ? "Bullish" : "Neutral"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards view */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {filtered.map((c) => {
            const isUp = c.change24h >= 0;
            return (
              <div key={c.symbol} className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                      {c.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {c.symbol}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink-muted)",
                    }}
                  >
                    #{c.rank}
                  </span>
                </div>
                <p className="text-lg font-bold mb-1" style={{ color: "var(--ink)" }}>
                  ${formatCryptoPrice(c.price)}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1 text-sm font-semibold"
                    style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                  >
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isUp ? "+" : ""}{c.change24h.toFixed(2)}%
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    MCap: {formatMarketCap(c.marketCap)}
                  </span>
                </div>
                <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--surface-border)" }}>
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Vol: {formatMarketCap(c.volume24h)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="glass-card p-8 mt-4 text-center" style={{ color: "var(--ink-muted)" }}>
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No cryptocurrencies match your search.</p>
        </div>
      )}
    </PageShell>
  );
}

