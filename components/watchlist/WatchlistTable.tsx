"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Zap, Search, Star, RefreshCw } from "lucide-react";
import { fetchWatchlistData, addWatchlistSymbol, removeWatchlistSymbol } from "../../lib/data-client";
import Sparkline from "../Sparkline";

type WatchItem = {
  symbol: string;
  price?: number;
  change?: string;
  changePercent?: string;
  chartData?: number[];
  loading?: boolean;
};

export default function WatchlistTable() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadWatchlist = useCallback(async () => {
    const result = await fetchWatchlistData();
    const watchItems: WatchItem[] = result.data.map((r) => ({ symbol: r.symbol, loading: true }));
    setItems(watchItems);
    // Fetch prices for each
    for (const item of watchItems) {
      try {
        const [priceRes, chartRes] = await Promise.all([
          fetch(`/api/stocks/price?symbol=${item.symbol}`),
          fetch(`/api/stocks/chart?symbol=${item.symbol}&limit=14`),
        ]);
        const priceData = priceRes.ok ? await priceRes.json() : {};
        const chartData = chartRes.ok ? await chartRes.json() : {};
        const closes = (chartData.data || []).map((d: { close: number }) => d.close).reverse();
        setItems((prev) =>
          prev.map((i) =>
            i.symbol === item.symbol
              ? { ...i, price: priceData.price, change: priceData.change, changePercent: priceData.changePercent, chartData: closes, loading: false }
              : i
          )
        );
      } catch {
        setItems((prev) => prev.map((i) => (i.symbol === item.symbol ? { ...i, loading: false } : i)));
      }
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleAdd = async () => {
    const sym = input.trim().toUpperCase();
    if (!sym || adding) return;
    if (items.some((i) => i.symbol === sym)) { setInput(""); return; }
    setAdding(true);
    await addWatchlistSymbol(sym);
    setInput("");
    setAdding(false);
    loadWatchlist();
  };

  const handleRemove = async (symbol: string) => {
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
    await removeWatchlistSymbol(symbol);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
  };

  const handleAnalyze = (symbol: string) => {
    window.location.href = `/terminal?cmd=/scan ${symbol}`;
  };

  const isPositive = (change?: string) => {
    if (!change) return true;
    return !change.startsWith("-");
  };

  return (
    <div className="space-y-4">
      {/* Add + Refresh Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 glass-card px-3 py-2">
          <Search size={14} className="text-[var(--ink-muted)]" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add symbol (e.g. AAPL)"
            className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] outline-none"
            maxLength={10}
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || adding}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: "var(--accent-2)" }}
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl glass-card text-[var(--ink-muted)] hover:text-[var(--accent-2)] transition-colors"
          title="Refresh prices"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="glass-card p-10 text-center">
          <Star size={36} className="mx-auto mb-3 text-[var(--ink-muted)] opacity-50" />
          <h3 className="text-base font-semibold text-[var(--ink)] mb-1">Your watchlist is empty</h3>
          <p className="text-sm text-[var(--ink-muted)] max-w-sm mx-auto">
            Add stock symbols above to start tracking prices with live updates and sparklines.
          </p>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] px-4 py-3">Symbol</th>
                  <th className="text-right text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] px-4 py-3">Price</th>
                  <th className="text-right text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] px-4 py-3">Change</th>
                  <th className="text-center text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] px-4 py-3 hidden sm:table-cell">14D Chart</th>
                  <th className="text-right text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const positive = isPositive(item.change);
                  return (
                    <tr key={item.symbol} className="border-b border-[var(--border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Star size={12} className="text-[var(--accent-2)]" fill="var(--accent-2)" />
                          <span className="text-sm font-bold text-[var(--ink)]">{item.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.loading ? (
                          <div className="w-16 h-4 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] animate-pulse ml-auto" />
                        ) : (
                          <span className="text-sm font-semibold text-[var(--ink)] tabular-nums">
                            {item.price != null ? `$${item.price.toFixed(2)}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.loading ? (
                          <div className="w-14 h-4 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] animate-pulse ml-auto" />
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            {positive ? <TrendingUp size={12} className="text-[var(--positive)]" /> : <TrendingDown size={12} className="text-[var(--negative)]" />}
                            <span className={`text-xs font-semibold tabular-nums ${positive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                              {item.change || "—"} ({item.changePercent || "—"})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex justify-center">
                          {item.chartData && item.chartData.length > 1 ? (
                            <Sparkline data={item.chartData} width={80} height={28} color={positive ? "var(--positive)" : "var(--negative)"} />
                          ) : (
                            <div className="w-20 h-7 rounded bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleAnalyze(item.symbol)}
                            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] transition-colors"
                            title="Analyze with AI"
                          >
                            <Zap size={13} />
                          </button>
                          <button
                            onClick={() => handleRemove(item.symbol)}
                            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_8%,transparent)] transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
