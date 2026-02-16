"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Lightbulb,
  Newspaper,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import EmptyState from "./EmptyState";
import SentimentBadge from "./SentimentBadge";

type PortfolioRow = { symbol: string; shares: number };

type Mover = { symbol: string; changePct: number };

type BriefingEvent = { time: string; title: string };

type BriefingData = {
  date: string;
  market: { name: string; value: string; changePct: number }[];
  topGainers: Mover[];
  topLosers: Mover[];
  portfolioImpact: { symbol: string; changePct: number }[];
  events: BriefingEvent[];
  recommendation: string;
};

const PORTFOLIO_KEY = "smc_local_portfolio_v2";
const BRIEFING_KEY = "smc_daily_briefing_v1";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return +(min + Math.random() * (max - min)).toFixed(2);
}

function generateBriefing(portfolio: PortfolioRow[]): BriefingData {
  const market = [
    { name: "S&P 500", value: (4800 + rand(-200, 200)).toFixed(0), changePct: rand(-2.5, 2.5) },
    { name: "NASDAQ", value: (15200 + rand(-500, 500)).toFixed(0), changePct: rand(-3, 3) },
    { name: "DOW", value: (37500 + rand(-600, 600)).toFixed(0), changePct: rand(-2, 2) },
  ];

  const gainerSymbols = ["NVDA", "AMD", "SMCI", "PLTR", "RIVN", "SOFI"];
  const loserSymbols = ["BA", "INTC", "WBD", "SNAP", "HOOD", "LCID"];

  const topGainers: Mover[] = gainerSymbols
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((s) => ({ symbol: s, changePct: rand(2, 12) }));

  const topLosers: Mover[] = loserSymbols
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((s) => ({ symbol: s, changePct: rand(-12, -2) }));

  const portfolioImpact = portfolio.slice(0, 6).map((p) => ({
    symbol: p.symbol,
    changePct: rand(-5, 5),
  }));

  const allEvents: BriefingEvent[] = [
    { time: "8:30 AM", title: "CPI inflation data release" },
    { time: "10:00 AM", title: "Consumer confidence report" },
    { time: "2:00 PM", title: "FOMC meeting minutes published" },
    { time: "9:30 AM", title: "Weekly jobless claims report" },
    { time: "11:00 AM", title: "Crude oil inventory update" },
    { time: "4:00 PM", title: "Major tech earnings after the bell" },
    { time: "8:00 AM", title: "GDP growth estimate revision" },
  ];
  const events = allEvents.sort(() => Math.random() - 0.5).slice(0, 3);

  const recommendations = [
    "Markets are mixed today. Focus on your strongest holdings and avoid chasing momentum plays.",
    "Volatility is elevated. Consider reviewing your stop-loss levels and trimming overweight positions.",
    "Broad indices are up. This could be a good day to rebalance and lock in gains on your biggest winners.",
    "Sector rotation is underway. Watch for relative strength shifts and adjust your watchlist accordingly.",
    "Quiet session expected. Use this time to research new opportunities and update your investment thesis.",
    "Risk appetite is improving. Growth stocks may lead today, so check your tech exposure.",
  ];

  return {
    date: todayStr(),
    market,
    topGainers,
    topLosers,
    portfolioImpact,
    events,
    recommendation: pick(recommendations),
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

export default function DailyBriefing() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PORTFOLIO_KEY);
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* ignore */ }

    try {
      const saved = localStorage.getItem(BRIEFING_KEY);
      if (saved) setBriefing(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const data = generateBriefing(portfolio);
      setBriefing(data);
      localStorage.setItem(BRIEFING_KEY, JSON.stringify(data));
      setLoading(false);
    }, 1200);
  }, [portfolio]);

  const briefingLabel = briefing
    ? isToday(briefing.date)
      ? "Today's Briefing"
      : "Yesterday's Briefing"
    : null;

  const derivedSentiment: "bullish" | "bearish" | "neutral" = briefing
    ? /bull|positive|up|gain|improv/i.test(briefing.recommendation)
      ? "bullish"
      : /bear|negative|down|decline|drawdown/i.test(briefing.recommendation)
      ? "bearish"
      : "neutral"
    : "neutral";

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2">
              <Newspaper size={13} />
              Daily Market Briefing
            </div>
            {briefingLabel && (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 text-xs muted">
                  <Calendar size={12} />
                  {briefingLabel} ({briefing?.date})
                </span>
                <SentimentBadge sentiment={derivedSentiment} />
              </div>
            )}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh daily market briefing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Generating..." : "Refresh Briefing"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center" role="status">
          <Newspaper size={28} className="mx-auto animate-pulse" style={{ color: "var(--accent)" }} />
          <p className="mt-3 text-sm muted">Preparing your market briefing...</p>
        </div>
      )}

      {/* Briefing content */}
      {briefing && !loading && (
        <div className="space-y-4">
          {/* Market Overview */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
              Market Overview
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {briefing.market.map((m) => (
                <div key={m.name} className="rounded-xl control-surface p-3">
                  <div className="text-[11px] muted">{m.name}</div>
                  <div className="text-lg font-bold metric-value mt-0.5">{m.value}</div>
                  <div
                    className="flex items-center gap-1 text-xs font-semibold mt-0.5"
                    style={{ color: m.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}
                  >
                    {m.changePct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {m.changePct > 0 ? "+" : ""}
                    {m.changePct.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Movers */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
                <TrendingUp size={13} style={{ color: "var(--positive)" }} />
                Top Gainers
              </div>
              <div className="space-y-2">
                {briefing.topGainers.map((m) => (
                  <div key={m.symbol} className="rounded-xl control-surface p-3 flex items-center justify-between">
                    <span className="font-semibold text-sm">{m.symbol}</span>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold badge-positive">
                      +{m.changePct.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
                <TrendingDown size={13} style={{ color: "var(--negative)" }} />
                Top Losers
              </div>
              <div className="space-y-2">
                {briefing.topLosers.map((m) => (
                  <div key={m.symbol} className="rounded-xl control-surface p-3 flex items-center justify-between">
                    <span className="font-semibold text-sm">{m.symbol}</span>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold badge-negative">
                      {m.changePct.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Impact */}
          {briefing.portfolioImpact.length > 0 && (
            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
                Your Portfolio Today
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {briefing.portfolioImpact.map((p) => (
                  <div key={p.symbol} className="rounded-xl control-surface p-3 text-center">
                    <div className="font-semibold text-sm">{p.symbol}</div>
                    <div
                      className="text-xs font-semibold mt-1"
                      style={{ color: p.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}
                    >
                      {p.changePct > 0 ? "+" : ""}
                      {p.changePct.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
              {!portfolio.length && (
                <p className="text-xs muted mt-2">
                  Add stocks to your portfolio to see personalized impact data.
                </p>
              )}
            </div>
          )}

          {/* Events */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
              <Calendar size={13} />
              Key Events Today
            </div>
            <div className="space-y-2">
              {briefing.events.map((ev, i) => (
                <div key={i} className="rounded-xl control-surface p-3 flex items-center gap-3">
                  <span
                    className="shrink-0 text-[11px] font-semibold rounded-md px-2 py-1"
                    style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
                  >
                    {ev.time}
                  </span>
                  <span className="text-sm">{ev.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
              <Lightbulb size={13} style={{ color: "var(--accent)" }} />
              AI Recommendation of the Day
            </div>
            <div className="rounded-xl control-surface p-4 text-sm leading-relaxed">
              {briefing.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!briefing && !loading && (
        <EmptyState
          icon={<Newspaper size={48} />}
          title="No briefing available"
          description="Check back during market hours."
          action={
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
            >
              <RefreshCw size={14} />
              Refresh Briefing
            </button>
          }
        />
      )}
    </div>
  );
}
