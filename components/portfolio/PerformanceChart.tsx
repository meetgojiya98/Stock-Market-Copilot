"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Holding = { symbol: string; shares: number; currentPrice?: number; avgCost?: number };

export default function PerformanceChart({ holdings }: { holdings: Holding[] }) {
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (holdings.length === 0) { setLoading(false); return; }

    (async () => {
      const allSeries: Record<string, { date: string; close: number }[]> = {};

      // Fetch chart data for top 5 holdings by value
      const sorted = [...holdings]
        .map((h) => ({ ...h, val: h.shares * (h.currentPrice ?? h.avgCost ?? 0) }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5);

      await Promise.all(
        sorted.map(async (h) => {
          try {
            const res = await fetch(`/api/stocks/chart?symbol=${h.symbol}&limit=30`);
            if (res.ok) {
              const data = await res.json();
              allSeries[h.symbol] = (data.data || []).reverse();
            }
          } catch {}
        })
      );

      // Combine into portfolio value per date
      const dateMap: Record<string, number> = {};
      for (const h of sorted) {
        const series = allSeries[h.symbol] || [];
        for (const point of series) {
          dateMap[point.date] = (dateMap[point.date] || 0) + h.shares * point.close;
        }
      }

      const points = Object.entries(dateMap)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setChartData(points);
      setLoading(false);
    })();
  }, [holdings]);

  const { min, max, change, changePct, positive } = useMemo(() => {
    if (chartData.length < 2) return { min: 0, max: 0, change: 0, changePct: 0, positive: true };
    const values = chartData.map((d) => d.value);
    const first = values[0];
    const last = values[values.length - 1];
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      change: last - first,
      changePct: first > 0 ? ((last - first) / first) * 100 : 0,
      positive: last >= first,
    };
  }, [chartData]);

  if (loading) {
    return (
      <div className="glass-card p-4">
        <h4 className="text-xs font-bold text-[var(--ink)] mb-3">Performance (30D)</h4>
        <div className="h-32 rounded bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] animate-pulse" />
      </div>
    );
  }

  if (chartData.length < 2) return null;

  const range = max - min || 1;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-[var(--ink)]">Performance (30D)</h4>
        <div className="flex items-center gap-1">
          {positive ? <TrendingUp size={11} className="text-[var(--positive)]" /> : <TrendingDown size={11} className="text-[var(--negative)]" />}
          <span className={`text-[11px] font-bold tabular-nums ${positive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {change >= 0 ? "+" : ""}{changePct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* SVG area chart */}
      <div className="relative h-32">
        <svg viewBox={`0 0 ${chartData.length - 1} 100`} className="w-full h-full" preserveAspectRatio="none">
          {/* Area fill */}
          <path
            d={`M0 ${100 - ((chartData[0].value - min) / range) * 100} ${chartData.map((d, i) => `L${i} ${100 - ((d.value - min) / range) * 100}`).join(" ")} L${chartData.length - 1} 100 L0 100 Z`}
            fill={positive ? "var(--positive)" : "var(--negative)"}
            opacity="0.1"
          />
          {/* Line */}
          <polyline
            points={chartData.map((d, i) => `${i},${100 - ((d.value - min) / range) * 100}`).join(" ")}
            fill="none"
            stroke={positive ? "var(--positive)" : "var(--negative)"}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-[var(--ink-muted)]">
        <span>{chartData[0]?.date}</span>
        <span>{chartData[chartData.length - 1]?.date}</span>
      </div>
    </div>
  );
}
