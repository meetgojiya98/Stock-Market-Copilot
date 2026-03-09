"use client";

import AuthGuard from "@/components/AuthGuard";
import PageShell from "@/components/PageShell";
import { streamAgent } from "@/lib/agents/run-agent";
import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Clock, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

type EarningsEntry = {
  symbol: string;
  companyName: string;
  date: Date;
  timing: "Before Market" | "After Market";
  aiPreview: string | null;
  aiLoading: boolean;
};

function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generateMockEarningsDate(symbol: string): { date: Date; timing: "Before Market" | "After Market" } {
  const h = hashSymbol(symbol);
  const now = new Date();
  const dayOffset = (h % 21) + 1; // 1-21 days from now
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  // Skip weekends
  const dow = date.getDay();
  if (dow === 0) date.setDate(date.getDate() + 1);
  if (dow === 6) date.setDate(date.getDate() + 2);

  const timing = h % 2 === 0 ? "Before Market" : "After Market";
  return { date, timing };
}

function getWeekGroup(date: Date): string {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 7);

  const endOfNextWeek = new Date(endOfThisWeek);
  endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);

  if (date < endOfThisWeek) return "This Week";
  if (date < endOfNextWeek) return "Next Week";
  return "Coming Soon";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EarningsPage() {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const watchlistRaw = localStorage.getItem("zentrade_watchlist_v1");
      const portfolioRaw = localStorage.getItem("zentrade_portfolio_v1");

      let symbols: string[] = [];
      try {
        if (watchlistRaw) {
          const wl = JSON.parse(watchlistRaw);
          if (Array.isArray(wl)) symbols.push(...wl);
        }
      } catch {}
      try {
        if (portfolioRaw) {
          const pf = JSON.parse(portfolioRaw);
          if (Array.isArray(pf)) {
            pf.forEach((item: string | { symbol?: string }) => {
              if (typeof item === "string") symbols.push(item);
              else if (item?.symbol) symbols.push(item.symbol);
            });
          }
        }
      } catch {}

      // Deduplicate
      symbols = [...new Set(symbols.map((s) => s.toUpperCase()))];

      if (symbols.length === 0) {
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM"];
      }

      const earningsEntries: EarningsEntry[] = [];

      for (const symbol of symbols) {
        const { date, timing } = generateMockEarningsDate(symbol);
        let companyName = symbol;

        try {
          const res = await fetch(`/api/stocks/quote?symbol=${symbol}`);
          if (res.ok) {
            const data = await res.json();
            if (data.name) companyName = data.name;
            else if (data.companyName) companyName = data.companyName;
          }
        } catch {}

        earningsEntries.push({
          symbol,
          companyName,
          date,
          timing,
          aiPreview: null,
          aiLoading: false,
        });
      }

      earningsEntries.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEntries(earningsEntries);
      setLoading(false);
    }

    loadData();
  }, []);

  const handleAIPreview = useCallback((symbol: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.symbol === symbol ? { ...e, aiLoading: true, aiPreview: null } : e))
    );
    setExpandedSymbol(symbol);

    streamAgent(
      "research-analyst",
      [symbol],
      "Provide earnings preview and expectations",
      (text) => {
        setEntries((prev) =>
          prev.map((e) => (e.symbol === symbol ? { ...e, aiPreview: text } : e))
        );
      },
      () => {
        setEntries((prev) =>
          prev.map((e) => (e.symbol === symbol ? { ...e, aiLoading: false } : e))
        );
      }
    );
  }, []);

  const grouped: Record<string, EarningsEntry[]> = {};
  for (const entry of entries) {
    const group = getWeekGroup(entry.date);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(entry);
  }

  const groupOrder = ["This Week", "Next Week", "Coming Soon"];

  return (
    <AuthGuard>
      <PageShell
        title="Earnings Calendar"
        subtitle="Upcoming earnings reports for your portfolio and watchlist stocks"
        actions={
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{
              background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
              color: "var(--accent-2)",
            }}
          >
            <CalendarDays size={14} />
            Earnings Calendar
          </div>
        }
      >
        {loading ? (
          <div className="glass-card p-10 text-center">
            <Loader2 size={28} className="mx-auto mb-3 animate-spin" style={{ color: "var(--ink-muted)" }} />
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading earnings data...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <CalendarDays size={36} className="mx-auto mb-3 opacity-50" style={{ color: "var(--ink-muted)" }} />
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>No stocks tracked</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--ink-muted)" }}>
              Add stocks to your watchlist or portfolio to see upcoming earnings.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupOrder.map((groupName) => {
              const items = grouped[groupName];
              if (!items || items.length === 0) return null;

              return (
                <div key={groupName}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                      {groupName}
                    </h2>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
                        color: "var(--accent-2)",
                      }}
                    >
                      {items.length} report{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((entry) => {
                      const isExpanded = expandedSymbol === entry.symbol;

                      return (
                        <div key={entry.symbol} className="glass-card overflow-hidden">
                          <div className="p-3 flex items-center gap-3">
                            {/* Date block */}
                            <div
                              className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center"
                              style={{
                                background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                              }}
                            >
                              <span className="text-[10px] font-bold uppercase" style={{ color: "var(--accent-2)" }}>
                                {entry.date.toLocaleDateString("en-US", { month: "short" })}
                              </span>
                              <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                                {entry.date.getDate()}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                                  {entry.symbol}
                                </span>
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                  style={{
                                    background:
                                      entry.timing === "Before Market"
                                        ? "color-mix(in srgb, #f59e0b 12%, transparent)"
                                        : "color-mix(in srgb, #8b5cf6 12%, transparent)",
                                    color: entry.timing === "Before Market" ? "#f59e0b" : "#8b5cf6",
                                  }}
                                >
                                  {entry.timing}
                                </span>
                              </div>
                              <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--ink-muted)" }}>
                                {entry.companyName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={10} style={{ color: "var(--ink-muted)" }} />
                                <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                                  {formatDate(entry.date)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAIPreview(entry.symbol)}
                                disabled={entry.aiLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50 transition-opacity"
                                style={{ background: "var(--accent-2)" }}
                              >
                                {entry.aiLoading ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Sparkles size={11} />
                                )}
                                Get AI Preview
                              </button>
                              {entry.aiPreview !== null && (
                                <button
                                  onClick={() => setExpandedSymbol(isExpanded ? null : entry.symbol)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ color: "var(--ink-muted)" }}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* AI Preview content */}
                          {isExpanded && entry.aiPreview !== null && (
                            <div
                              className="px-4 pb-4 pt-1 text-[12px] leading-relaxed whitespace-pre-wrap border-t"
                              style={{
                                color: "var(--ink)",
                                borderColor: "var(--border, rgba(128,128,128,0.15))",
                                background: "color-mix(in srgb, var(--accent-2) 3%, transparent)",
                              }}
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={10} style={{ color: "var(--accent-2)" }} />
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>
                                  AI Earnings Preview
                                </span>
                              </div>
                              {entry.aiPreview}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
