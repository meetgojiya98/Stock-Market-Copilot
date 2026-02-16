"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calendar, Clock, Filter } from "lucide-react";

type ImpactLevel = "high" | "medium" | "low";
type FilterLevel = "all" | "high" | "medium" | "low";

type MacroEvent = {
  id: string;
  time: string;
  name: string;
  country: string;
  impact: ImpactLevel;
  actual: string | null;
  forecast: string;
  previous: string;
  dayIndex: number; // 0=Mon, 1=Tue, ... 4=Fri
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMacroEvents(): MacroEvent[] {
  const rand = seededRandom(20260216);

  const eventTemplates: {
    name: string;
    impact: ImpactLevel;
    forecastBase: number;
    unit: string;
    decimals: number;
  }[] = [
    { name: "Fed Interest Rate Decision", impact: "high", forecastBase: 4.5, unit: "%", decimals: 2 },
    { name: "CPI (MoM)", impact: "high", forecastBase: 0.3, unit: "%", decimals: 1 },
    { name: "CPI (YoY)", impact: "high", forecastBase: 3.1, unit: "%", decimals: 1 },
    { name: "Non-Farm Payrolls", impact: "high", forecastBase: 185, unit: "K", decimals: 0 },
    { name: "GDP Growth Rate (QoQ)", impact: "high", forecastBase: 2.8, unit: "%", decimals: 1 },
    { name: "Unemployment Rate", impact: "high", forecastBase: 3.9, unit: "%", decimals: 1 },
    { name: "Core PCE Price Index (MoM)", impact: "high", forecastBase: 0.2, unit: "%", decimals: 1 },
    { name: "Initial Jobless Claims", impact: "medium", forecastBase: 215, unit: "K", decimals: 0 },
    { name: "ISM Manufacturing PMI", impact: "medium", forecastBase: 49.8, unit: "", decimals: 1 },
    { name: "ISM Services PMI", impact: "medium", forecastBase: 52.4, unit: "", decimals: 1 },
    { name: "Retail Sales (MoM)", impact: "medium", forecastBase: 0.4, unit: "%", decimals: 1 },
    { name: "Consumer Confidence Index", impact: "medium", forecastBase: 104.5, unit: "", decimals: 1 },
    { name: "PPI (MoM)", impact: "medium", forecastBase: 0.2, unit: "%", decimals: 1 },
    { name: "Durable Goods Orders (MoM)", impact: "medium", forecastBase: 1.2, unit: "%", decimals: 1 },
    { name: "Building Permits", impact: "low", forecastBase: 1.48, unit: "M", decimals: 2 },
    { name: "Existing Home Sales", impact: "low", forecastBase: 4.15, unit: "M", decimals: 2 },
    { name: "Michigan Consumer Sentiment", impact: "low", forecastBase: 78.2, unit: "", decimals: 1 },
    { name: "Industrial Production (MoM)", impact: "low", forecastBase: 0.1, unit: "%", decimals: 1 },
    { name: "Crude Oil Inventories", impact: "low", forecastBase: -1.5, unit: "M", decimals: 1 },
    { name: "10-Year Treasury Auction", impact: "low", forecastBase: 4.35, unit: "%", decimals: 2 },
  ];

  const times = [
    "08:30", "08:30", "08:30", "10:00", "10:00",
    "08:30", "10:00", "14:00", "08:30", "10:00",
    "13:00", "08:30", "10:30", "15:00", "08:30",
    "10:00", "08:30", "09:15", "10:30", "13:00",
  ];

  const events: MacroEvent[] = [];

  for (let i = 0; i < eventTemplates.length; i++) {
    const t = eventTemplates[i];
    const dayIndex = Math.floor(i / 4); // spread across Mon-Fri
    const variation = (rand() - 0.5) * t.forecastBase * 0.15;
    const prevVariation = (rand() - 0.5) * t.forecastBase * 0.1;
    const forecast = t.forecastBase;
    const previous = Number((t.forecastBase + prevVariation).toFixed(t.decimals));

    // Past days (Mon-Wed) get actual values, future (Thu-Fri) don't
    const isPast = dayIndex <= 2;
    const actual = isPast
      ? Number((t.forecastBase + variation).toFixed(t.decimals))
      : null;

    events.push({
      id: `macro-${i}`,
      time: times[i],
      name: t.name,
      country: "US",
      impact: t.impact,
      actual: actual !== null ? `${actual}${t.unit}` : null,
      forecast: `${forecast}${t.unit}`,
      previous: `${previous}${t.unit}`,
      dayIndex,
    });
  }

  return events;
}

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function MacroCalendar() {
  const [filter, setFilter] = useState<FilterLevel>("all");
  const events = useMemo(() => generateMacroEvents(), []);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.impact === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const groups: Record<number, MacroEvent[]> = {};
    for (const event of filtered) {
      if (!groups[event.dayIndex]) groups[event.dayIndex] = [];
      groups[event.dayIndex].push(event);
    }
    return groups;
  }, [filtered]);

  const highImpactCount = events.filter((e) => e.impact === "high").length;

  const filters: { label: string; value: FilterLevel }[] = [
    { label: "All", value: "all" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ];

  return (
    <div className="space-y-4 fade-up">
      {/* Market Impact summary */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--negative)_14%,transparent)]">
            <AlertTriangle size={18} style={{ color: "var(--negative)" }} />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Market Impact This Week
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-bold metric-value">{highImpactCount}</span>
              <span className="text-sm muted">high-impact events</span>
              <span className="text-xs muted">|</span>
              <span className="text-sm muted">{events.length} total events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="muted" />
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
              filter === f.value
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
            }`}
          >
            {f.value !== "all" && (
              <span
                className={`macro-impact-dot ${f.value}`}
              />
            )}
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs muted">{filtered.length} events</span>
      </div>

      {/* Events grouped by day */}
      {Object.keys(grouped).length === 0 && (
        <div className="rounded-xl control-surface p-4 text-sm muted">
          No events match the selected filter.
        </div>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([dayIdx, dayEvents]) => (
          <div key={dayIdx} className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="muted" />
              <h3 className="text-sm font-semibold section-title">
                {DAY_LABELS[Number(dayIdx)]}
              </h3>
              <span className="text-xs muted">
                {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="rounded-2xl surface-glass dynamic-surface overflow-hidden">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[70px_1fr_80px_90px_90px_90px] gap-2 px-4 py-2 text-[11px] tracking-[0.08em] uppercase muted font-semibold border-b border-[var(--surface-border)]">
                <span>Time</span>
                <span>Event</span>
                <span>Impact</span>
                <span className="text-right">Actual</span>
                <span className="text-right">Forecast</span>
                <span className="text-right">Previous</span>
              </div>

              {dayEvents
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((event) => (
                  <div
                    key={event.id}
                    className="macro-event grid sm:grid-cols-[70px_1fr_80px_90px_90px_90px] gap-2 px-4 py-3 items-center border-b border-[var(--surface-border)] last:border-b-0"
                  >
                    {/* Time */}
                    <div className="macro-event-time flex items-center gap-1.5">
                      <Clock size={12} className="muted sm:hidden" />
                      <span className="text-xs font-mono muted">{event.time}</span>
                    </div>

                    {/* Event name */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{event.name}</span>
                      <span className="text-[10px] muted hidden sm:inline">
                        {event.country}
                      </span>
                    </div>

                    {/* Impact */}
                    <div className="macro-impact flex items-center gap-1.5">
                      <span className={`macro-impact-dot ${event.impact}`} />
                      <span className="text-xs capitalize muted">{event.impact}</span>
                    </div>

                    {/* Actual */}
                    <div className="macro-actual text-right">
                      {event.actual !== null ? (
                        <span className="text-sm font-semibold metric-value">
                          {event.actual}
                        </span>
                      ) : (
                        <span className="text-xs muted">--</span>
                      )}
                    </div>

                    {/* Forecast */}
                    <div className="macro-forecast text-right">
                      <span className="text-xs muted">{event.forecast}</span>
                    </div>

                    {/* Previous */}
                    <div className="text-right">
                      <span className="text-xs muted">{event.previous}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
