"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

type WatchlistItem = { symbol: string };

type MoverData = {
  symbol: string;
  price: number;
  changePct: number;
  volumeChange: number;
};

const WATCHLIST_KEY = "smc_local_watchlist_v2";

function rand(min: number, max: number): number {
  return +(min + Math.random() * (max - min)).toFixed(2);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function generateMoverData(symbols: string[]): MoverData[] {
  return symbols.map((symbol) => ({
    symbol,
    price: rand(20, 500),
    changePct: rand(-15, 15),
    volumeChange: rand(-60, 120),
  }));
}

export default function WatchlistMovers() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [movers, setMovers] = useState<MoverData[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(false);

  const loadWatchlist = useCallback(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      if (raw) {
        const parsed: WatchlistItem[] = JSON.parse(raw);
        setWatchlist(parsed);
        return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }, []);

  const generateData = useCallback(
    (list?: WatchlistItem[]) => {
      const items = list || watchlist;
      if (!items.length) return;
      setLoading(true);
      setTimeout(() => {
        const data = generateMoverData(items.map((w) => w.symbol));
        setMovers(data);
        setLoading(false);
      }, 600);
    },
    [watchlist]
  );

  useEffect(() => {
    const list = loadWatchlist();
    if (list.length) {
      const data = generateMoverData(list.map((w) => w.symbol));
      setMovers(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedMovers = useMemo(
    () => [...movers].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)),
    [movers]
  );

  const bigMovers = useMemo(
    () => sortedMovers.filter((m) => Math.abs(m.changePct) >= threshold),
    [sortedMovers, threshold]
  );

  const moverCount = bigMovers.length;
  const totalCount = movers.length;

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2">
              <Activity size={13} style={{ color: "var(--accent)" }} />
              Watchlist Movers
            </div>
            <p className="text-sm muted mt-1">
              {totalCount
                ? `Tracking ${totalCount} stock${totalCount > 1 ? "s" : ""} from your watchlist.`
                : "No stocks in your watchlist. Add some on the Watchlist page."}
            </p>
          </div>
          <button
            onClick={() => generateData()}
            disabled={loading || !watchlist.length}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Threshold slider and stats */}
      {movers.length > 0 && (
        <div className="grid sm:grid-cols-[1fr_auto] gap-4">
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
              <SlidersHorizontal size={13} />
              Alert Threshold
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className="text-sm font-bold metric-value min-w-[50px] text-right">
                {threshold}%
              </span>
            </div>
            <p className="text-[11px] muted mt-1.5">
              Stocks moving more than {threshold}% will be highlighted as big movers.
            </p>
          </div>

          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 min-w-[140px] text-center">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Movers
            </div>
            <div className="text-2xl font-bold metric-value mt-1" style={{ color: "var(--accent)" }}>
              {moverCount}
            </div>
            <div className="text-[11px] muted">of {totalCount} stocks</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <BarChart3 size={28} className="mx-auto animate-pulse" style={{ color: "var(--accent)" }} />
          <p className="mt-3 text-sm muted">Fetching price changes...</p>
        </div>
      )}

      {/* Movers list */}
      {sortedMovers.length > 0 && !loading && (
        <div className="space-y-2">
          {sortedMovers.map((m) => {
            const isBigMover = Math.abs(m.changePct) >= threshold;
            const isUp = m.changePct >= 0;

            return (
              <div
                key={m.symbol}
                className={`rounded-2xl surface-glass dynamic-surface p-4 flex items-center justify-between gap-3 flex-wrap ${
                  isBigMover
                    ? isUp
                      ? "border border-emerald-400/40"
                      : "border border-red-400/40"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {isBigMover && (
                    <AlertCircle
                      size={16}
                      style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                    />
                  )}
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {m.symbol}
                      {isBigMover && (
                        <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-[var(--surface-emphasis)] text-[var(--ink-muted)]">
                          BIG MOVER
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] muted">{formatMoney(m.price)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div
                      className="flex items-center gap-1 text-sm font-semibold justify-end"
                      style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                    >
                      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {formatPercent(m.changePct)}
                    </div>
                    <div className="text-[11px] muted">
                      Vol: {m.volumeChange > 0 ? "+" : ""}
                      {m.volumeChange.toFixed(0)}%
                    </div>
                  </div>

                  <div
                    className="w-16 h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10"
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (Math.abs(m.changePct) / 15) * 100)}%`,
                        backgroundColor: isUp ? "var(--positive)" : "var(--negative)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!movers.length && !loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Activity size={28} className="mx-auto muted" />
          <p className="mt-3 text-sm muted">
            {watchlist.length
              ? "Click Refresh to see price changes for your watchlist."
              : "Add stocks to your watchlist first, then come back to see movers."}
          </p>
        </div>
      )}
    </div>
  );
}
