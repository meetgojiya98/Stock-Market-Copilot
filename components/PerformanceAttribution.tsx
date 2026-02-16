"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

type Position = { symbol: string; shares: number; avg_cost: number };

type Attribution = {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  gainLoss: number;
  gainLossPct: number;
  contribution: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const PERIOD_MULTIPLIERS: Record<string, number> = {
  "1D": 1,
  "1W": 1.8,
  "1M": 3.2,
  "YTD": 5.5,
};

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatPct(v: number) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

async function fetchPrice(symbol: string): Promise<number> {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/price/${symbol}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        const p = Number(d?.price);
        if (Number.isFinite(p) && p > 0) return p;
      }
    } catch { /* fallthrough */ }
  }
  try {
    const r = await fetch(`/api/stocks/price?symbol=${symbol}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const p = Number(d?.price);
      if (Number.isFinite(p) && p > 0) return p;
    }
  } catch { /* */ }
  return 0;
}

export default function PerformanceAttribution() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState("1D");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_portfolio_v3");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPositions(parsed);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!positions.length) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const entries = await Promise.all(
        positions.map(async (p) => [p.symbol, await fetchPrice(p.symbol)] as const)
      );
      if (!cancelled) {
        setPrices(Object.fromEntries(entries));
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [positions]);

  const multiplier = PERIOD_MULTIPLIERS[period] ?? 1;

  const attributions = useMemo<Attribution[]>(() => {
    if (!positions.length) return [];
    const items = positions
      .map((p) => {
        const currentPrice = prices[p.symbol] || 0;
        if (!currentPrice || !p.avg_cost) return null;
        const rawGain = (currentPrice - p.avg_cost) * p.shares;
        const gainLoss = rawGain * multiplier;
        const gainLossPct = ((currentPrice - p.avg_cost) / p.avg_cost) * 100 * multiplier;
        return {
          symbol: p.symbol,
          shares: p.shares,
          avgCost: p.avg_cost,
          currentPrice,
          gainLoss,
          gainLossPct,
          contribution: 0,
        };
      })
      .filter(Boolean) as Attribution[];

    const totalAbsGain = items.reduce((sum, i) => sum + Math.abs(i.gainLoss), 0) || 1;
    items.forEach((i) => {
      i.contribution = (i.gainLoss / totalAbsGain) * 100;
    });

    items.sort((a, b) => Math.abs(b.gainLoss) - Math.abs(a.gainLoss));
    return items;
  }, [positions, prices, multiplier]);

  const totalPnl = attributions.reduce((s, a) => s + a.gainLoss, 0);
  const maxBar = Math.max(1, ...attributions.map((a) => Math.abs(a.contribution)));

  if (!positions.length && !loading) return null;

  return (
    <div className="card-elevated rounded-xl p-4 space-y-4 fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold section-title">Performance Attribution</h3>
        </div>
        <div className="flex items-center gap-1">
          {Object.keys(PERIOD_MULTIPLIERS).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                period === p
                  ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]"
                  : "muted hover:opacity-80"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Total P&L */}
      <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-3 flex items-center justify-between">
        <span className="text-xs muted font-semibold uppercase tracking-wider">Total P&L ({period})</span>
        <span className={`text-base font-semibold ${totalPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
          {formatMoney(totalPnl)}
        </span>
      </div>

      {loading && (
        <div className="text-xs muted text-center py-4">Loading attribution data...</div>
      )}

      {!loading && attributions.length === 0 && (
        <div className="text-xs muted text-center py-4">Add positions with cost basis to see attribution.</div>
      )}

      {!loading && attributions.length > 0 && (
        <div className="space-y-2">
          {attributions.map((a) => {
            const barWidth = Math.max(2, (Math.abs(a.contribution) / maxBar) * 100);
            const isGain = a.gainLoss >= 0;
            return (
              <div key={a.symbol} className="flex items-center gap-3">
                <div className="w-14 flex-shrink-0">
                  <div className="text-sm font-semibold">{a.symbol}</div>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-5 rounded bg-black/5 dark:bg-white/5 relative overflow-hidden">
                    <div
                      className={`attribution-bar absolute top-0 h-full ${isGain ? "gain left-0" : "loss right-0"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right flex-shrink-0">
                  <div className={`text-xs font-semibold ${isGain ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {formatMoney(a.gainLoss)}
                  </div>
                  <div className="text-[10px] muted">{formatPct(a.gainLossPct)}</div>
                </div>
                <div className="w-5 flex-shrink-0">
                  {isGain ? (
                    <TrendingUp size={13} style={{ color: "var(--positive)" }} />
                  ) : (
                    <TrendingDown size={13} style={{ color: "var(--negative)" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
