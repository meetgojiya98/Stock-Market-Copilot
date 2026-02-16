"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Plus, ScanSearch, Star, TrendingUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AdvancedMarketChart from "./AdvancedMarketChart";
import Sparkline from "./Sparkline";
import Skeleton from "./Skeleton";
import {
  addPortfolioPosition,
  addWatchlistSymbol,
  fetchTrendingData,
  fetchWatchlistData,
  removeWatchlistSymbol,
} from "../lib/data-client";
import { fetchMarketSeries, type MarketSeriesPoint } from "../lib/market-series";

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
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [prices, setPrices] = useState<Record<string, PriceMeta>>({});
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<MarketSeriesPoint[]>([]);
  const [selectedSource, setSelectedSource] = useState<"local" | "remote" | "synthetic">("local");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; symbol: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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
    try {
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
      if (!selectedSymbol && watchResult.data[0]?.symbol) {
        setSelectedSymbol(watchResult.data[0].symbol);
      }
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    if (!watchlist.length) {
      setSelectedSymbol("");
      setSelectedSeries([]);
      return;
    }

    if (!selectedSymbol || !watchlist.some((row) => row.symbol === selectedSymbol)) {
      setSelectedSymbol(watchlist[0].symbol);
    }
  }, [selectedSymbol, watchlist]);

  useEffect(() => {
    if (!selectedSymbol) return;

    let cancelled = false;
    const loadSeries = async () => {
      const result = await fetchMarketSeries(selectedSymbol, 260, API_BASE);
      if (cancelled) return;
      setSelectedSeries(result.series);
      setSelectedSource(result.source);
      if (result.detail) {
        setError(result.detail);
      }
    };
    loadSeries();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

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
            className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[180px]"
            required
          />
          <button className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-2 text-sm font-semibold">
            <Plus size={14} />
            Add to Watchlist
          </button>

          <span className={`text-xs sm:ml-auto rounded-full px-2.5 py-1 ${dataMode === "remote" ? "badge-positive" : "badge-neutral"}`}>
            {dataMode === "remote" ? "Remote Data" : "Local Data"}
          </span>
        </form>

        {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}

        <div className="space-y-2">
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <div key={`skel-${i}`} className="card-elevated rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton variant="text" width="4rem" />
                    <Skeleton variant="text" width="5rem" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton variant="rect" width="3.5rem" height="1.4rem" />
                    <Skeleton variant="rect" width="4rem" height="1.4rem" />
                    <Skeleton variant="rect" width="6rem" height="1.4rem" />
                  </div>
                </div>
                <Skeleton variant="rect" width="100%" height="68px" />
              </div>
            ))}

          {!loading && sortedWatchlist.length === 0 && (
            <div className="card-elevated rounded-xl p-8 flex flex-col items-center gap-3 text-center">
              <ScanSearch size={48} className="muted opacity-40" />
              <div>
                <div className="font-semibold text-sm">Your watchlist is empty</div>
                <div className="text-xs muted mt-1">
                  Search for stocks to start tracking.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const addInput = document.querySelector<HTMLInputElement>(
                    'input[placeholder="Add symbol"]'
                  );
                  addInput?.focus();
                }}
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2 text-sm font-semibold"
              >
                <Plus size={14} />
                Add Symbol
              </button>
            </div>
          )}

          {!loading && sortedWatchlist.map((item) => {
            const meta = prices[item.symbol] ?? { price: 0, changePct: 0 };
            const note = notes[item.symbol] || "";

            return (
              <div
                key={item.symbol}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, symbol: item.symbol });
                }}
                className={`card-elevated rounded-xl p-4 ${
                  selectedSymbol === item.symbol
                    ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--surface-border))]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-base">{item.symbol}</div>
                      <div className="text-xs muted mt-0.5">
                        {meta.price > 0 ? formatMoney(meta.price) : "Price unavailable"}
                      </div>
                    </div>
                    {meta.price > 0 && (
                      <Sparkline
                        data={Array.from({ length: 7 }, (_, i) =>
                          meta.price * (1 + (Math.random() - 0.48) * 0.03 * (i + 1))
                        )}
                        color={meta.changePct >= 0 ? "var(--positive)" : "var(--negative)"}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.changePct >= 0 ? "badge-positive" : "badge-negative"}`}>
                      {formatPercent(meta.changePct)}
                    </span>
                    <button
                      onClick={() => setSelectedSymbol(item.symbol)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-white/80 dark:bg-black/25 px-2.5 py-1 text-xs"
                    >
                      Chart
                    </button>
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
        <AdvancedMarketChart
          title={`${selectedSymbol || "Watchlist"} Structure`}
          subtitle={`Source: ${
            selectedSource === "synthetic"
              ? "Synthetic Path"
              : selectedSource === "remote"
              ? "Remote API"
              : "Local API"
          }`}
          data={selectedSeries}
          compact
          className="mb-4"
        />

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

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="surface-glass rounded-lg shadow-lg min-w-[180px] z-50 overflow-hidden"
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="px-3 py-2 text-sm hover:bg-[var(--surface-emphasis)] cursor-pointer flex items-center gap-2 transition-colors"
            onClick={async () => {
              await handlePromote(contextMenu.symbol);
              setContextMenu(null);
            }}
          >
            <TrendingUp size={14} />
            Add to Portfolio
          </div>
          <div
            className="px-3 py-2 text-sm hover:bg-[var(--surface-emphasis)] cursor-pointer flex items-center gap-2 transition-colors"
            onClick={() => {
              router.push(`/research?symbol=${contextMenu.symbol}`);
              setContextMenu(null);
            }}
          >
            <BarChart3 size={14} />
            View Chart
          </div>
          <div
            className="px-3 py-2 text-sm hover:bg-[var(--surface-emphasis)] cursor-pointer flex items-center gap-2 transition-colors text-red-600 dark:text-red-300"
            onClick={() => {
              handleRemove(contextMenu.symbol);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Remove from Watchlist
          </div>
        </div>
      )}
    </div>
  );
}
