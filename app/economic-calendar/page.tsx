"use client";

import AuthGuard from "@/components/AuthGuard";
import PageShell from "@/components/PageShell";
import { streamAgent } from "@/lib/agents/run-agent";
import { useState, useCallback } from "react";
import {
  Globe,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Filter,
} from "lucide-react";

type ImpactLevel = "high" | "medium" | "low";

type EconomicEvent = {
  id: string;
  name: string;
  date: Date;
  time: string;
  impact: ImpactLevel;
  previous: string;
  forecast: string;
  category: string;
};

function getNextOccurrence(dayOfMonth: number, monthInterval: number): Date {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (candidate <= now) {
    candidate.setMonth(candidate.getMonth() + monthInterval);
  }
  // Skip weekends
  const dow = candidate.getDay();
  if (dow === 0) candidate.setDate(candidate.getDate() + 1);
  if (dow === 6) candidate.setDate(candidate.getDate() + 2);
  return candidate;
}

function getFirstFriday(monthsAhead: number): Date {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  // Find first Friday
  while (target.getDay() !== 5) {
    target.setDate(target.getDate() + 1);
  }
  if (monthsAhead === 0 && target <= now) {
    return getFirstFriday(1);
  }
  return target;
}

function getFirstBusinessDay(monthsAhead: number): Date {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  while (target.getDay() === 0 || target.getDay() === 6) {
    target.setDate(target.getDate() + 1);
  }
  if (monthsAhead === 0 && target <= now) {
    return getFirstBusinessDay(1);
  }
  return target;
}

function getNextFOMC(): Date {
  // FOMC meets roughly every 6 weeks; approximate next dates
  const now = new Date();
  const fomcDates = [
    new Date(now.getFullYear(), 0, 29),
    new Date(now.getFullYear(), 2, 19),
    new Date(now.getFullYear(), 4, 7),
    new Date(now.getFullYear(), 5, 18),
    new Date(now.getFullYear(), 6, 30),
    new Date(now.getFullYear(), 8, 17),
    new Date(now.getFullYear(), 10, 5),
    new Date(now.getFullYear(), 11, 17),
    // Next year
    new Date(now.getFullYear() + 1, 0, 28),
    new Date(now.getFullYear() + 1, 2, 18),
  ];
  return fomcDates.find((d) => d > now) || fomcDates[fomcDates.length - 1];
}

function generateEconomicEvents(): EconomicEvent[] {
  const events: EconomicEvent[] = [
    {
      id: "fomc",
      name: "Federal Reserve FOMC Meeting",
      date: getNextFOMC(),
      time: "2:00 PM ET",
      impact: "high",
      previous: "5.25-5.50%",
      forecast: "5.25-5.50%",
      category: "Monetary Policy",
    },
    {
      id: "cpi",
      name: "CPI Report (Consumer Price Index)",
      date: getNextOccurrence(13, 1),
      time: "8:30 AM ET",
      impact: "high",
      previous: "3.2%",
      forecast: "3.1%",
      category: "Inflation",
    },
    {
      id: "nfp",
      name: "Jobs Report / Non-Farm Payrolls",
      date: getFirstFriday(0),
      time: "8:30 AM ET",
      impact: "high",
      previous: "216K",
      forecast: "185K",
      category: "Employment",
    },
    {
      id: "gdp",
      name: "GDP Report (Quarterly)",
      date: getNextOccurrence(28, 3),
      time: "8:30 AM ET",
      impact: "high",
      previous: "4.9%",
      forecast: "3.2%",
      category: "Growth",
    },
    {
      id: "ppi",
      name: "PPI Report (Producer Price Index)",
      date: getNextOccurrence(15, 1),
      time: "8:30 AM ET",
      impact: "medium",
      previous: "1.0%",
      forecast: "0.9%",
      category: "Inflation",
    },
    {
      id: "retail",
      name: "Retail Sales",
      date: getNextOccurrence(17, 1),
      time: "8:30 AM ET",
      impact: "medium",
      previous: "0.3%",
      forecast: "0.4%",
      category: "Consumer",
    },
    {
      id: "consumer-confidence",
      name: "Consumer Confidence Index",
      date: getNextOccurrence(25, 1),
      time: "10:00 AM ET",
      impact: "medium",
      previous: "102.0",
      forecast: "104.5",
      category: "Sentiment",
    },
    {
      id: "pmi",
      name: "PMI Manufacturing",
      date: getFirstBusinessDay(0),
      time: "10:00 AM ET",
      impact: "low",
      previous: "49.4",
      forecast: "49.8",
      category: "Manufacturing",
    },
  ];

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

const impactColors: Record<ImpactLevel, { bg: string; text: string; label: string }> = {
  high: { bg: "color-mix(in srgb, #ef4444 15%, transparent)", text: "#ef4444", label: "High" },
  medium: { bg: "color-mix(in srgb, #eab308 15%, transparent)", text: "#eab308", label: "Medium" },
  low: { bg: "color-mix(in srgb, #22c55e 15%, transparent)", text: "#22c55e", label: "Low" },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EconomicCalendarPage() {
  const [events] = useState<EconomicEvent[]>(() => generateEconomicEvents());
  const [filter, setFilter] = useState<"all" | ImpactLevel>("all");
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.impact === filter);

  const handleAIAnalysis = useCallback((event: EconomicEvent) => {
    setAiLoading((prev) => ({ ...prev, [event.id]: true }));
    setAiAnalysis((prev) => ({ ...prev, [event.id]: "" }));
    setExpandedEvent(event.id);

    const context = `Analyze how the upcoming ${event.name} (scheduled ${formatDate(event.date)} at ${event.time}) could affect financial markets. Previous: ${event.previous}, Forecast: ${event.forecast}. Discuss potential impact on stocks, bonds, and currency markets.`;

    streamAgent(
      "research-analyst",
      ["SPY"],
      context,
      (text) => {
        setAiAnalysis((prev) => ({ ...prev, [event.id]: text }));
      },
      () => {
        setAiLoading((prev) => ({ ...prev, [event.id]: false }));
      }
    );
  }, []);

  return (
    <AuthGuard>
      <PageShell
        title="Economic Calendar"
        subtitle="Key economic events and data releases that move markets"
        actions={
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{
              background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
              color: "var(--accent-2)",
            }}
          >
            <Globe size={14} />
            Economic Calendar
          </div>
        }
      >
        <div className="space-y-4">
          {/* Impact filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} style={{ color: "var(--ink-muted)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--ink-muted)" }}>
              Impact:
            </span>
            {(["all", "high", "medium", "low"] as const).map((level) => {
              const isActive = filter === level;
              const color =
                level === "all"
                  ? "var(--accent-2)"
                  : impactColors[level].text;

              return (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: isActive
                      ? level === "all"
                        ? "var(--accent-2)"
                        : impactColors[level].bg
                      : "color-mix(in srgb, var(--ink) 5%, transparent)",
                    color: isActive
                      ? level === "all"
                        ? "#fff"
                        : color
                      : "var(--ink-muted)",
                  }}
                >
                  {level === "all" ? "All" : impactColors[level].label}
                </button>
              );
            })}
          </div>

          {/* Events list */}
          {filteredEvents.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Globe size={36} className="mx-auto mb-3 opacity-50" style={{ color: "var(--ink-muted)" }} />
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
                No events match this filter
              </h3>
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                Try selecting a different impact level.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const colors = impactColors[event.impact];
                const isExpanded = expandedEvent === event.id;
                const hasAnalysis = aiAnalysis[event.id] != null;
                const isLoading = aiLoading[event.id];

                return (
                  <div key={event.id} className="glass-card overflow-hidden">
                    <div className="p-3 flex items-start gap-3">
                      {/* Impact indicator */}
                      <div
                        className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
                        style={{ background: colors.bg }}
                      >
                        <AlertTriangle size={14} style={{ color: colors.text }} />
                        <span className="text-[9px] font-bold uppercase mt-0.5" style={{ color: colors.text }}>
                          {colors.label}
                        </span>
                      </div>

                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {event.name}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{
                              background: "color-mix(in srgb, var(--ink) 6%, transparent)",
                              color: "var(--ink-muted)",
                            }}
                          >
                            {event.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                            {formatDate(event.date)}
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                            {event.time}
                          </span>
                        </div>

                        {/* Previous / Forecast */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="stat-card px-2.5 py-1.5 rounded-lg">
                            <span className="text-[9px] uppercase tracking-widest font-semibold block" style={{ color: "var(--ink-muted)" }}>
                              Previous
                            </span>
                            <span className="text-[12px] font-bold" style={{ color: "var(--ink)" }}>
                              {event.previous}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <TrendingUp size={12} style={{ color: "var(--ink-muted)" }} />
                          </div>
                          <div className="stat-card px-2.5 py-1.5 rounded-lg">
                            <span className="text-[9px] uppercase tracking-widest font-semibold block" style={{ color: "var(--ink-muted)" }}>
                              Forecast
                            </span>
                            <span className="text-[12px] font-bold" style={{ color: "var(--accent-2)" }}>
                              {event.forecast}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAIAnalysis(event)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50 transition-opacity"
                          style={{ background: "var(--accent-2)" }}
                        >
                          {isLoading ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Sparkles size={11} />
                          )}
                          AI Impact Analysis
                        </button>
                        {hasAnalysis && (
                          <button
                            onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* AI Analysis content */}
                    {isExpanded && hasAnalysis && (
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
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: "var(--accent-2)" }}
                          >
                            AI Impact Analysis
                          </span>
                        </div>
                        {aiAnalysis[event.id]}
                        {isLoading && (
                          <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm" style={{ background: "var(--accent-2)" }} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  );
}
