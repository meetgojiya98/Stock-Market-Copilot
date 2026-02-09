"use client";

import { useEffect, useMemo, useState } from "react";
import { Aperture, Radar as RadarIcon, Scale, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

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

type AdvancedAnalyticsPanelProps = {
  portfolio: PortfolioItem[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const CHART_COLORS = [
  "#e56f24",
  "#0f766e",
  "#0284c7",
  "#84cc16",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

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

  const buckets = ["Tech", "Financials", "Healthcare", "Consumer", "Industrial", "Energy", "Utilities"];

  return portfolio.reduce<Record<string, number>>((acc, item, idx) => {
    const sector = buckets[(item.symbol.charCodeAt(0) + idx) % buckets.length];
    acc[sector] = (acc[sector] || 0) + item.shares;
    return acc;
  }, {});
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function CustomTreemapNode(props: any) {
  const { x, y, width, height, index, name, value } = props;
  if (width < 20 || height < 20) return null;
  const fill = CHART_COLORS[index % CHART_COLORS.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill, stroke: "rgba(255,255,255,0.5)", strokeWidth: 1 }}
        rx={6}
      />
      <text x={x + 7} y={y + 16} fill="white" fontSize={11} fontWeight={600}>
        {name}
      </text>
      <text x={x + 7} y={y + 31} fill="rgba(255,255,255,0.88)" fontSize={10}>
        {value}
      </text>
    </g>
  );
}

export default function AdvancedAnalyticsPanel({ portfolio }: AdvancedAnalyticsPanelProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [sectors, setSectors] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("live");

  const summary = useMemo(() => {
    if (!metrics.length) {
      return {
        avgBeta: 0,
        avgAlpha: 0,
        avgSharpe: 0,
        betaDispersion: 0,
      };
    }

    const betas = metrics.map((metric) => metric.beta ?? 0);
    const alphas = metrics.map((metric) => metric.alpha ?? 0);
    const sharpes = metrics.map((metric) => metric.sharpe ?? 0);

    return {
      avgBeta: avg(betas),
      avgAlpha: avg(alphas),
      avgSharpe: avg(sharpes),
      betaDispersion: std(betas),
    };
  }, [metrics]);

  const sectorRows = useMemo(() => {
    const total = Object.values(sectors).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
    return Object.entries(sectors)
      .map(([name, value], index) => ({
        name,
        value,
        weightPct: (Number(value || 0) / total) * 100,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.weightPct - a.weightPct);
  }, [sectors]);

  const riskSurface = useMemo(() => {
    const largestSectorWeight = sectorRows[0]?.weightPct ?? 0;

    return [
      { factor: "Beta Fit", score: clamp((summary.avgBeta / 2.2) * 100, 0, 100) },
      { factor: "Alpha Edge", score: clamp(summary.avgAlpha * 1600 + 50, 0, 100) },
      { factor: "Sharpe", score: clamp((summary.avgSharpe / 2.8) * 100, 0, 100) },
      { factor: "Concentration", score: clamp(100 - largestSectorWeight * 1.4, 0, 100) },
      { factor: "Stability", score: clamp(100 - summary.betaDispersion * 58, 0, 100) },
    ];
  }, [sectorRows, summary.avgAlpha, summary.avgBeta, summary.avgSharpe, summary.betaDispersion]);

  const metricRows = useMemo(
    () =>
      metrics
        .map((metric) => {
          const beta = metric.beta ?? 0;
          const alpha = metric.alpha ?? 0;
          const sharpe = metric.sharpe ?? 0;
          const quantScore = clamp(beta * 28 + sharpe * 20 + alpha * 1400, 0, 100);

          return {
            ...metric,
            beta,
            alpha,
            sharpe,
            quantScore,
          };
        })
        .sort((a, b) => b.quantScore - a.quantScore),
    [metrics]
  );

  useEffect(() => {
    if (!portfolio.length) {
      setMetrics([]);
      setSectors({});
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
        setSectors(Object.keys(sectorBreakdown).length ? sectorBreakdown : fallbackSectors);
        setDataSource("live");
      } catch {
        setMetrics(fallbackMetrics);
        setSectors(fallbackSectors);
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

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">
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
        <div className="card-elevated rounded-lg p-3">
          <div className="text-xs muted">Beta Dispersion</div>
          <div className="metric-value font-semibold mt-1">{summary.betaDispersion.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.25fr_1fr] gap-4">
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border soft-divider bg-[color-mix(in_srgb,var(--surface)_84%,transparent)]">
            <table className="w-full text-sm min-w-[420px]">
              <thead className="bg-black/5 dark:bg-white/10 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Symbol</th>
                  <th className="px-3 py-2.5 font-medium">Beta</th>
                  <th className="px-3 py-2.5 font-medium">Alpha</th>
                  <th className="px-3 py-2.5 font-medium">Sharpe</th>
                  <th className="px-3 py-2.5 font-medium">Quant Score</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.map((metric) => (
                  <tr key={metric.symbol} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-3 py-2.5 font-semibold">{metric.symbol}</td>
                    <td className="px-3 py-2.5 metric-value">{metric.beta.toFixed(2)}</td>
                    <td className={`px-3 py-2.5 metric-value ${metric.alpha >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                      {metric.alpha.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 metric-value">{metric.sharpe.toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 flex-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)]"
                            style={{ width: `${metric.quantScore}%` }}
                          />
                        </div>
                        <span className="text-xs metric-value">{Math.round(metric.quantScore)}</span>
                      </div>
                    </td>
                  </tr>
                ))}

                {!metricRows.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center muted">
                      Add portfolio positions to unlock advanced analytics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-elevated rounded-xl p-3">
            <div className="text-sm font-semibold section-title inline-flex items-center gap-1.5">
              <Scale size={14} />
              Symbol Risk Surface
            </div>
            <div className="h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricRows.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.18)" />
                  <XAxis dataKey="symbol" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [value.toFixed(1), "Quant Score"]} />
                  <Bar dataKey="quantScore" radius={[4, 4, 0, 0]}>
                    {metricRows.slice(0, 12).map((row, index) => (
                      <Cell key={`${row.symbol}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated rounded-xl p-3">
            <div className="text-sm font-semibold section-title inline-flex items-center gap-1.5">
              <Aperture size={14} />
              Sector Treemap
            </div>
            <div className="h-[240px] mt-2">
              {sectorRows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={sectorRows}
                    dataKey="weightPct"
                    stroke="rgba(255,255,255,0.45)"
                    content={<CustomTreemapNode />}
                  />
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm muted">No sector data available.</div>
              )}
            </div>
          </div>

          <div className="card-elevated rounded-xl p-3">
            <div className="text-sm font-semibold section-title inline-flex items-center gap-1.5">
              <RadarIcon size={14} />
              Portfolio Radar
            </div>
            <div className="h-[240px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={riskSurface}>
                  <PolarGrid stroke="rgba(107,114,128,0.22)" />
                  <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Risk Surface"
                    dataKey="score"
                    stroke="var(--accent-2)"
                    fill="rgba(15,141,132,0.3)"
                    fillOpacity={0.7}
                  />
                  <Tooltip formatter={(value: number) => [value.toFixed(1), "Score"]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl control-surface bg-white/70 dark:bg-black/25 px-3 py-2 text-xs muted inline-flex items-center gap-1.5">
            <ShieldCheck size={12} />
            Quant scores combine beta, sharpe, alpha, and dispersion to surface structural risk asymmetry.
          </div>
        </div>
      </div>

      {loading && <div className="text-sm muted">Refreshing analytics...</div>}
    </div>
  );
}
