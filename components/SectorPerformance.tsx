"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Flame,
  Snowflake,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type SectorData = {
  name: string;
  today: number;
  week: number;
  month: number;
  ytd: number;
};

type SortPeriod = "today" | "week" | "month" | "ytd";

function seededRandom(seed: number) {
  let value = (seed * 9301 + 49297) % 233280;
  return (value / 233280 - 0.5) * 2;
}

function generateSectorData(): SectorData[] {
  const sectors = [
    "Technology",
    "Healthcare",
    "Financials",
    "Consumer Discretionary",
    "Industrials",
    "Energy",
    "Materials",
    "Utilities",
    "Real Estate",
    "Communication",
    "Consumer Staples",
  ];

  return sectors.map((name, index) => {
    const seed = name.length * 31 + index * 17;
    return {
      name,
      today: Number((seededRandom(seed) * 2.5).toFixed(2)),
      week: Number((seededRandom(seed + 1) * 5).toFixed(2)),
      month: Number((seededRandom(seed + 2) * 10).toFixed(2)),
      ytd: Number((seededRandom(seed + 3) * 20).toFixed(2)),
    };
  });
}

const PERIODS: { label: string; value: SortPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "YTD", value: "ytd" },
];

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function SectorPerformance() {
  const [sortPeriod, setSortPeriod] = useState<SortPeriod>("today");
  const sectors = useMemo(() => generateSectorData(), []);

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => b[sortPeriod] - a[sortPeriod]);
  }, [sectors, sortPeriod]);

  const maxAbs = useMemo(() => {
    return Math.max(1, ...sorted.map((s) => Math.abs(s[sortPeriod])));
  }, [sorted, sortPeriod]);

  const hotSectors = sorted.filter((s) => s[sortPeriod] > 0).slice(0, 3);
  const coldSectors = [...sorted].filter((s) => s[sortPeriod] < 0).sort((a, b) => a[sortPeriod] - b[sortPeriod]).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Hot & Cold summary */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Flame size={13} /> Hot sectors
          </div>
          <div className="mt-2 space-y-1.5">
            {hotSectors.length === 0 && <span className="text-xs muted">No positive sectors right now</span>}
            {hotSectors.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-[var(--positive)] font-semibold metric-value text-xs">
                  {formatPercent(s[sortPeriod])}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Snowflake size={13} /> Cold sectors
          </div>
          <div className="mt-2 space-y-1.5">
            {coldSectors.length === 0 && <span className="text-xs muted">No negative sectors right now</span>}
            {coldSectors.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-[var(--negative)] font-semibold metric-value text-xs">
                  {formatPercent(s[sortPeriod])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <ArrowDownUp size={14} className="muted" />
        <span className="text-xs muted font-semibold">Sort by:</span>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setSortPeriod(p.value)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
              sortPeriod === p.value
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up space-y-3">
        <div className="text-sm font-semibold section-title">
          Performance by {PERIODS.find((p) => p.value === sortPeriod)?.label}
        </div>
        <div className="space-y-2">
          {sorted.map((sector) => {
            const value = sector[sortPeriod];
            const barWidth = Math.max(2, (Math.abs(value) / maxAbs) * 100);
            const isPositive = value >= 0;

            return (
              <div key={sector.name} className="group">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 text-sm min-w-[120px] sm:min-w-[160px]">
                    {isPositive ? (
                      <TrendingUp size={13} style={{ color: "var(--positive)" }} />
                    ) : (
                      <TrendingDown size={13} style={{ color: "var(--negative)" }} />
                    )}
                    <span className="font-medium">{sector.name}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold metric-value ${
                      isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"
                    }`}
                  >
                    {formatPercent(value)}
                  </span>
                </div>
                <div className="w-full h-4 rounded-lg bg-[var(--surface-emphasis)] overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: isPositive ? "var(--positive)" : "var(--negative)",
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="text-sm font-semibold section-title mb-3">All periods</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                <th className="text-left py-2">Sector</th>
                <th className="text-right py-2">Today</th>
                <th className="text-right py-2">Week</th>
                <th className="text-right py-2">Month</th>
                <th className="text-right py-2">YTD</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sector) => (
                <tr key={sector.name} className="border-t border-[var(--surface-border)]">
                  <td className="py-2 font-medium">{sector.name}</td>
                  {(["today", "week", "month", "ytd"] as SortPeriod[]).map((p) => (
                    <td
                      key={p}
                      className={`py-2 text-right metric-value text-xs font-semibold ${
                        sector[p] >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                      }`}
                    >
                      {formatPercent(sector[p])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
