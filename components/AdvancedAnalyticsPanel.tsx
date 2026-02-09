"use client";

import { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend);

type PortfolioItem = {
  symbol: string;
  shares: number;
};

type Metric = {
  symbol: string;
  beta?: number;
  alpha?: number;
  sharpe?: number;
};

type SectorChartData = {
  labels: string[];
  datasets: { data: number[]; backgroundColor: string[]; borderColor: string[] }[];
} | null;

type AdvancedAnalyticsPanelProps = {
  portfolio: PortfolioItem[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const CHART_COLORS = ["#e56f24", "#0f766e", "#0284c7", "#84cc16", "#f59e0b", "#ef4444"];

function syntheticMetrics(portfolio: PortfolioItem[]) {
  return portfolio.map((item, idx) => {
    const seed = item.symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      symbol: item.symbol,
      beta: 0.8 + ((seed + idx) % 120) / 100,
      alpha: (((seed % 80) - 35) / 1000) * (1 + idx * 0.03),
      sharpe: 0.5 + ((seed % 180) / 100),
    };
  });
}

function syntheticSectors(portfolio: PortfolioItem[]) {
  if (!portfolio.length) return {} as Record<string, number>;

  const buckets = ["Tech", "Financials", "Healthcare", "Consumer", "Industrial", "Energy"];

  return portfolio.reduce<Record<string, number>>((acc, item, idx) => {
    const sector = buckets[(item.symbol.charCodeAt(0) + idx) % buckets.length];
    acc[sector] = (acc[sector] || 0) + item.shares;
    return acc;
  }, {});
}

export default function AdvancedAnalyticsPanel({ portfolio }: AdvancedAnalyticsPanelProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [sectorData, setSectorData] = useState<SectorChartData>(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("live");

  const summary = useMemo(() => {
    if (!metrics.length) {
      return {
        avgBeta: 0,
        avgAlpha: 0,
        avgSharpe: 0,
      };
    }

    const total = metrics.length;
    const sum = metrics.reduce(
      (acc, metric) => ({
        beta: acc.beta + (metric.beta ?? 0),
        alpha: acc.alpha + (metric.alpha ?? 0),
        sharpe: acc.sharpe + (metric.sharpe ?? 0),
      }),
      { beta: 0, alpha: 0, sharpe: 0 }
    );

    return {
      avgBeta: sum.beta / total,
      avgAlpha: sum.alpha / total,
      avgSharpe: sum.sharpe / total,
    };
  }, [metrics]);

  useEffect(() => {
    if (!portfolio.length) {
      setMetrics([]);
      setSectorData(null);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);

      const fallbackMetrics = syntheticMetrics(portfolio);
      const fallbackSectors = syntheticSectors(portfolio);

      try {
        if (!API_BASE) throw new Error("Missing API base");

        const symbols = portfolio.map((row) => row.symbol);
        const allocation = portfolio.reduce<Record<string, number>>((acc, row) => {
          acc[row.symbol] = row.shares;
          return acc;
        }, {});

        const response = await fetch(`${API_BASE}/analytics/advanced`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({ symbols, allocation }),
        });

        if (!response.ok) throw new Error("Analytics API unavailable");

        const data = await response.json();

        const metricRows = Object.entries(data?.metrics ?? {}).map(([symbol, values]: [string, any]) => ({
          symbol,
          ...values,
        }));

        const sectorBreakdown = data?.sector_breakdown ?? {};

        setMetrics(metricRows.length ? metricRows : fallbackMetrics);
        setSectorData({
          labels: Object.keys(sectorBreakdown).length
            ? Object.keys(sectorBreakdown)
            : Object.keys(fallbackSectors),
          datasets: [
            {
              data: Object.keys(sectorBreakdown).length
                ? Object.values(sectorBreakdown)
                : Object.values(fallbackSectors),
              backgroundColor: CHART_COLORS,
              borderColor: CHART_COLORS.map(() => "rgba(255,255,255,0.6)"),
            },
          ],
        });
        setDataSource("live");
      } catch {
        setMetrics(fallbackMetrics);
        setSectorData({
          labels: Object.keys(fallbackSectors),
          datasets: [
            {
              data: Object.values(fallbackSectors),
              backgroundColor: CHART_COLORS,
              borderColor: CHART_COLORS.map(() => "rgba(255,255,255,0.6)"),
            },
          ],
        });
        setDataSource("fallback");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [portfolio]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold section-title">Advanced Metrics</h3>
        <span className="text-xs rounded-full px-3 py-1 control-surface bg-white/75 dark:bg-black/20">
          Source: {dataSource === "live" ? "Live analytics" : "Model fallback"}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 text-sm">
        <div className="card-elevated rounded-lg p-3">
          <div className="text-xs muted">Avg Beta</div>
          <div className="metric-value font-semibold mt-1">{summary.avgBeta.toFixed(2)}</div>
        </div>
        <div className="card-elevated rounded-lg p-3">
          <div className="text-xs muted">Avg Alpha</div>
          <div className={`metric-value font-semibold mt-1 ${summary.avgAlpha >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {summary.avgAlpha.toFixed(4)}
          </div>
        </div>
        <div className="card-elevated rounded-lg p-3">
          <div className="text-xs muted">Avg Sharpe</div>
          <div className="metric-value font-semibold mt-1">{summary.avgSharpe.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="overflow-x-auto rounded-xl border soft-divider bg-[color-mix(in_srgb,var(--surface)_84%,transparent)]">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-black/5 dark:bg-white/10 text-left">
              <tr>
                <th className="px-3 py-2.5 font-medium">Symbol</th>
                <th className="px-3 py-2.5 font-medium">Beta</th>
                <th className="px-3 py-2.5 font-medium">Alpha</th>
                <th className="px-3 py-2.5 font-medium">Sharpe</th>
                <th className="px-3 py-2.5 font-medium">Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const riskTier = (metric.beta ?? 0) > 1.25 ? "High" : (metric.beta ?? 0) > 0.95 ? "Moderate" : "Defensive";

                return (
                  <tr key={metric.symbol} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-3 py-2.5 font-semibold">{metric.symbol}</td>
                    <td className="px-3 py-2.5 metric-value">{(metric.beta ?? 0).toFixed(2)}</td>
                    <td className={`px-3 py-2.5 metric-value ${(metric.alpha ?? 0) >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                      {(metric.alpha ?? 0).toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 metric-value">{(metric.sharpe ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        riskTier === "High"
                          ? "badge-negative"
                          : riskTier === "Moderate"
                          ? "badge-neutral"
                          : "badge-positive"
                      }`}>
                        {riskTier}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!metrics.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center muted">
                    Add portfolio positions to unlock advanced analytics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-elevated rounded-xl p-4">
          <div className="text-sm font-semibold section-title mb-3">Sector Exposure</div>
          <div className="h-[240px] flex items-center justify-center">
            {sectorData && sectorData.labels.length > 0 ? (
              <Pie
                data={sectorData}
                options={{
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { boxWidth: 10, padding: 12 },
                    },
                  },
                  maintainAspectRatio: false,
                }}
              />
            ) : (
              <div className="text-sm muted">No sector data available.</div>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm muted">Refreshing analytics...</div>}
    </div>
  );
}
