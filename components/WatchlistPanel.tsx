"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Star, TrendingUp, Trash2 } from "lucide-react";
import {
  addPortfolioPosition,
  addWatchlistSymbol,
  fetchTrendingData,
  fetchWatchlistData,
  removeWatchlistSymbol,
} from "../lib/data-client";

type WatchlistItem = {
  symbol: string;
};

type TrendingItem = {
  symbol: string;
  count: number;
};

type PriceMeta = {
  price: number;
  changePct: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const WATCH_NOTES_KEY = "smc_watch_notes_v1";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

async function fetchQuote(symbol: string): Promise<PriceMeta> {
  if (API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/price/${symbol}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const price = Number(data?.price);
        const changePct = Number(data?.change ?? 0);
        if (Number.isFinite(price) && price > 0) {
          return {
            price,
            changePct: Number.isFinite(changePct) ? changePct : 0,
          };
        }
      }
    } catch {
      // Fall through.
    }
  }

  try {
    const response = await fetch(`/api/stocks/price?symbol=${symbol}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const price = Number(data?.price);
      const changePct = Number(data?.change ?? 0);
      if (Number.isFinite(price) && price > 0) {
        return {
          price,
          changePct: Number.isFinite(changePct) ? changePct : 0,
        };
      }
    }
  } catch {
    // Use zero fallback.
  }

  return { price: 0, changePct: 0 };
}

export default function WatchlistPanel() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [prices, setPrices] = useState<Record<string, PriceMeta>>({});
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");

  const sortedWatchlist = useMemo(
    () =>
      [...watchlist].sort((a, b) => {
        const changeA = prices[a.symbol]?.changePct ?? 0;
        const changeB = prices[b.symbol]?.changePct ?? 0;
        return Math.abs(changeB) - Math.abs(changeA);
      }),
    [watchlist, prices]
  );

  const refreshPrices = async (symbols: string[]) => {
    const unique = [...new Set(symbols)];
    const entries = await Promise.all(unique.map(async (item) => [item, await fetchQuote(item)] as const));
    setPrices(Object.fromEntries(entries));
  };

  const loadWatchlist = async () => {
    setError("");
    const token = localStorage.getItem("access_token") || undefined;

    const [watchResult, trendResult] = await Promise.all([
      fetchWatchlistData(token),
      fetchTrendingData(token),
    ]);

    setWatchlist(watchResult.data);
    setTrending(trendResult.data);
    setDataMode(watchResult.mode);

    if (watchResult.detail) {
      setError(`Switched to Local Mode: ${watchResult.detail}`);
    }

    await refreshPrices(watchResult.data.map((row) => row.symbol));
  };

  useEffect(() => {
    loadWatchlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(WATCH_NOTES_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        setNotes(parsed);
      }
    } catch {
      localStorage.removeItem(WATCH_NOTES_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCH_NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (!watchlist.length) return;
    const interval = window.setInterval(() => {
      refreshPrices(watchlist.map((row) => row.symbol));
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [watchlist]);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;

    const token = localStorage.getItem("access_token") || undefined;
    const result = await addWatchlistSymbol(normalized, token);
    setDataMode(result.mode);

    if (!result.ok) {
      setError(result.detail || "Unable to add symbol.");
      return;
    }

    setSymbol("");
    if (result.detail) {
      setError(`Saved in Local Mode: ${result.detail}`);
    }
    loadWatchlist();
  };

  const handleRemove = async (watchSymbol: string) => {
    const token = localStorage.getItem("access_token") || undefined;
    const result = await removeWatchlistSymbol(watchSymbol, token);
    setDataMode(result.mode);

    if (!result.ok) {
      setError(result.detail || "Unable to remove symbol.");
      return;
    }

    loadWatchlist();
  };

  const handlePromote = async (watchSymbol: string) => {
    const token = localStorage.getItem("access_token") || undefined;
    const result = await addPortfolioPosition(watchSymbol, 1, token);
    setDataMode(result.mode);

    if (!result.ok) {
      setError(result.detail || "Unable to move symbol to portfolio.");
      return;
    }

    setError(`${watchSymbol} added to portfolio (1 share baseline).`);
  };

  return (
    <div className="grid xl:grid-cols-[1.55fr_1fr] gap-4">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="card-elevated rounded-xl p-4 flex flex-wrap gap-2 items-center">
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="Add symbol"
            className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm min-w-[180px]"
            required
          />
          <button className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-2 text-sm font-semibold">
            <Plus size={14} />
            Add to Watchlist
          </button>

          <span className={`text-xs ml-auto rounded-full px-2.5 py-1 ${dataMode === "remote" ? "badge-positive" : "badge-neutral"}`}>
            {dataMode === "remote" ? "Remote Data" : "Local Data"}
          </span>
        </form>

        {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}

        <div className="space-y-2">
          {sortedWatchlist.length === 0 && (
            <div className="card-elevated rounded-xl p-4 text-sm muted">
              Watchlist is empty. Add symbols to start monitoring.
            </div>
          )}

          {sortedWatchlist.map((item) => {
            const meta = prices[item.symbol] ?? { price: 0, changePct: 0 };
            const note = notes[item.symbol] || "";

            return (
              <div
                key={item.symbol}
                className="card-elevated rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base">{item.symbol}</div>
                    <div className="text-xs muted mt-0.5">
                      {meta.price > 0 ? formatMoney(meta.price) : "Price unavailable"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.changePct >= 0 ? "badge-positive" : "badge-negative"}`}>
                      {formatPercent(meta.changePct)}
                    </span>
                    <button
                      onClick={() => handlePromote(item.symbol)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs"
                    >
                      <TrendingUp size={13} />
                      Add to Portfolio
                    </button>
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1 text-xs"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [item.symbol]: event.target.value,
                    }))
                  }
                  placeholder="Add thesis note, trigger, or reminder"
                  className="mt-3 w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs min-h-[68px]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <aside className="card-elevated rounded-xl p-4">
        <h3 className="font-semibold section-title flex items-center gap-2">
          <Star size={15} />
          Trending Symbols
        </h3>
        <p className="text-xs muted mt-1">Most active names across watchlists and portfolios.</p>

        <ul className="mt-3 space-y-2">
          {trending.map((item, index) => (
            <li
              key={`${item.symbol}-${index}`}
              className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-sm flex items-center justify-between"
            >
              <span className="font-semibold">{index + 1}. {item.symbol}</span>
              <span className="text-xs muted">{item.count} score</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
