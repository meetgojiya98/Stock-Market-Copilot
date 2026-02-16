"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Filter,
  Sunrise,
  Sunset,
  BriefcaseBusiness,
  Eye,
} from "lucide-react";

type EarningsEntry = {
  symbol: string;
  date: string;
  time: "Before Market" | "After Market";
  estimatedEPS: number;
  source: "portfolio" | "watchlist";
};

type FilterMode = "all" | "portfolio" | "watchlist";

function hashSymbol(symbol: string) {
  return symbol
    .split("")
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 7), 97);
}

function generateMockEarnings(symbols: { symbol: string; source: "portfolio" | "watchlist" }[]): EarningsEntry[] {
  const now = new Date();
  const entries: EarningsEntry[] = [];

  for (const { symbol, source } of symbols) {
    const seed = hashSymbol(symbol);
    const dayOffset = seed % 30;
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    // Skip weekends
    const day = date.getDay();
    if (day === 0) date.setDate(date.getDate() + 1);
    if (day === 6) date.setDate(date.getDate() + 2);

    const time = seed % 2 === 0 ? "Before Market" : "After Market";
    const epsBase = ((seed % 400) + 20) / 100;
    const estimatedEPS = Number(epsBase.toFixed(2));

    entries.push({
      symbol,
      date: date.toISOString().slice(0, 10),
      time: time as "Before Market" | "After Market",
      estimatedEPS,
      source,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Past";
  if (diff < 7 - today.getDay()) return "This week";
  if (diff < 14 - today.getDay()) return "Next week";
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  return `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff < 7 - today.getDay();
}

export default function EarningsCalendar() {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    const portfolioRaw = localStorage.getItem("smc_local_portfolio_v2");
    const watchlistRaw = localStorage.getItem("smc_local_watchlist_v2");

    let portfolioSymbols: { symbol: string }[] = [];
    let watchlistSymbols: { symbol: string }[] = [];

    try {
      portfolioSymbols = portfolioRaw ? JSON.parse(portfolioRaw) : [];
    } catch { /* empty */ }
    try {
      watchlistSymbols = watchlistRaw ? JSON.parse(watchlistRaw) : [];
    } catch { /* empty */ }

    const allSymbols: { symbol: string; source: "portfolio" | "watchlist" }[] = [];
    const seen = new Set<string>();

    for (const p of portfolioSymbols) {
      if (p.symbol && !seen.has(p.symbol)) {
        seen.add(p.symbol);
        allSymbols.push({ symbol: p.symbol, source: "portfolio" });
      }
    }
    for (const w of watchlistSymbols) {
      if (w.symbol && !seen.has(w.symbol)) {
        seen.add(w.symbol);
        allSymbols.push({ symbol: w.symbol, source: "watchlist" });
      }
    }

    if (allSymbols.length === 0) {
      // Provide demo data if user has no stocks
      const demos = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM"];
      for (const sym of demos) {
        allSymbols.push({ symbol: sym, source: "portfolio" });
      }
    }

    setEarnings(generateMockEarnings(allSymbols));
  }, []);

  const filtered = useMemo(() => {
    if (filterMode === "all") return earnings;
    return earnings.filter((e) => e.source === filterMode);
  }, [earnings, filterMode]);

  const grouped = useMemo(() => {
    const groups: Record<string, EarningsEntry[]> = {};
    for (const entry of filtered) {
      const week = getWeekLabel(entry.date);
      if (!groups[week]) groups[week] = [];
      groups[week].push(entry);
    }
    return groups;
  }, [filtered]);

  const filters: { label: string; value: FilterMode; icon: React.ReactNode }[] = [
    { label: "All", value: "all", icon: <Filter size={13} /> },
    { label: "Portfolio", value: "portfolio", icon: <BriefcaseBusiness size={13} /> },
    { label: "Watchlist", value: "watchlist", icon: <Eye size={13} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterMode(f.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
              filterMode === f.value
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs muted">{filtered.length} earnings dates</span>
      </div>

      {/* Grouped by week */}
      {Object.keys(grouped).length === 0 && (
        <div className="rounded-xl control-surface p-4 text-sm muted">
          No upcoming earnings found. Add stocks to your portfolio or watchlist first.
        </div>
      )}

      {Object.entries(grouped).map(([week, entries]) => (
        <div key={week} className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="muted" />
            <h3
              className={`text-sm font-semibold ${
                week === "This week" ? "text-[var(--accent)]" : "section-title"
              }`}
            >
              {week}
            </h3>
            {week === "This week" && (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold">
                Current
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {entries.map((entry) => {
              const today = isToday(entry.date);
              const thisWeek = isThisWeek(entry.date);
              return (
                <div
                  key={`${entry.symbol}-${entry.date}`}
                  className={`rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up ${
                    today
                      ? "border border-[var(--accent)]"
                      : thisWeek
                      ? "border border-[color-mix(in_srgb,var(--accent)_40%,var(--surface-border))]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{entry.symbol}</span>
                      {today && (
                        <span className="rounded-full bg-[var(--accent)] text-white px-2 py-0.5 text-[10px] font-semibold">
                          Today
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        entry.source === "portfolio"
                          ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                          : "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]"
                      }`}
                    >
                      {entry.source === "portfolio" ? <BriefcaseBusiness size={11} /> : <Eye size={11} />}
                      {entry.source}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs muted">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      {entry.time === "Before Market" ? <Sunrise size={12} /> : <Sunset size={12} />}
                      {entry.time}
                    </span>
                  </div>

                  <div className="mt-2 rounded-xl control-surface p-3">
                    <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Est. EPS</div>
                    <div className="mt-0.5 text-lg metric-value font-semibold">${entry.estimatedEPS.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
