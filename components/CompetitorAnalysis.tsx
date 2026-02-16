"use client";

import { useState, useMemo } from "react";
import { Trophy, ChevronDown, TrendingUp, BarChart3 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MetricRow = {
  label: string;
  key: string;
  format: (v: number) => string;
  higherIsBetter: boolean;
};

type CompanyMetrics = {
  ticker: string;
  name: string;
  marketCap: number;
  peRatio: number;
  revenueGrowth: number;
  profitMargin: number;
  eps: number;
  dividendYield: number;
  oneYearReturn: number;
};

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const COMPETITOR_GROUPS: Record<string, string[]> = {
  AAPL: ["MSFT", "GOOGL", "SSNLF"],
  NVDA: ["AMD", "INTC", "QCOM"],
  AMZN: ["WMT", "TGT", "SHOP"],
  TSLA: ["F", "GM", "RIVN"],
};

const ALL_TARGETS = Object.keys(COMPETITOR_GROUPS);

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  SSNLF: "Samsung Electronics",
  NVDA: "NVIDIA Corp.",
  AMD: "Advanced Micro Devices",
  INTC: "Intel Corp.",
  QCOM: "Qualcomm Inc.",
  AMZN: "Amazon.com Inc.",
  WMT: "Walmart Inc.",
  TGT: "Target Corp.",
  SHOP: "Shopify Inc.",
  TSLA: "Tesla Inc.",
  F: "Ford Motor Co.",
  GM: "General Motors",
  RIVN: "Rivian Automotive",
};

function hashTicker(ticker: string): number {
  return ticker.split("").reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 13), 211);
}

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

const REALISTIC_DATA: Record<string, Partial<CompanyMetrics>> = {
  AAPL: { marketCap: 3440, peRatio: 33.2, revenueGrowth: 6.1, profitMargin: 26.3, eps: 6.97, dividendYield: 0.44, oneYearReturn: 28.5 },
  MSFT: { marketCap: 3120, peRatio: 35.8, revenueGrowth: 15.2, profitMargin: 36.4, eps: 12.41, dividendYield: 0.72, oneYearReturn: 19.8 },
  GOOGL: { marketCap: 2150, peRatio: 24.1, revenueGrowth: 13.6, profitMargin: 28.1, eps: 7.54, dividendYield: 0.46, oneYearReturn: 32.1 },
  SSNLF: { marketCap: 385, peRatio: 14.5, revenueGrowth: 9.3, profitMargin: 11.8, eps: 3.21, dividendYield: 2.15, oneYearReturn: 8.4 },
  NVDA: { marketCap: 3350, peRatio: 55.2, revenueGrowth: 122.4, profitMargin: 55.8, eps: 2.53, dividendYield: 0.02, oneYearReturn: 171.2 },
  AMD: { marketCap: 195, peRatio: 42.3, revenueGrowth: 18.3, profitMargin: 7.5, eps: 1.18, dividendYield: 0.0, oneYearReturn: -12.8 },
  INTC: { marketCap: 89, peRatio: -15.2, revenueGrowth: -1.6, profitMargin: -1.2, eps: -0.74, dividendYield: 1.68, oneYearReturn: -52.4 },
  QCOM: { marketCap: 178, peRatio: 17.8, revenueGrowth: 11.2, profitMargin: 25.4, eps: 9.12, dividendYield: 2.05, oneYearReturn: -7.3 },
  AMZN: { marketCap: 2280, peRatio: 42.5, revenueGrowth: 12.5, profitMargin: 8.1, eps: 5.53, dividendYield: 0.0, oneYearReturn: 44.2 },
  WMT: { marketCap: 685, peRatio: 38.2, revenueGrowth: 5.7, profitMargin: 2.5, eps: 2.41, dividendYield: 1.08, oneYearReturn: 72.1 },
  TGT: { marketCap: 56, peRatio: 12.8, revenueGrowth: -1.8, profitMargin: 3.9, eps: 8.76, dividendYield: 3.52, oneYearReturn: -8.9 },
  SHOP: { marketCap: 135, peRatio: 78.5, revenueGrowth: 26.1, profitMargin: 16.8, eps: 1.05, dividendYield: 0.0, oneYearReturn: 52.3 },
  TSLA: { marketCap: 1280, peRatio: 185.3, revenueGrowth: 1.2, profitMargin: 7.6, eps: 2.04, dividendYield: 0.0, oneYearReturn: 95.4 },
  F: { marketCap: 42, peRatio: 11.5, revenueGrowth: 5.3, profitMargin: 3.1, eps: 1.08, dividendYield: 5.82, oneYearReturn: -18.3 },
  GM: { marketCap: 56, peRatio: 5.8, revenueGrowth: 10.4, profitMargin: 6.2, eps: 9.67, dividendYield: 0.92, oneYearReturn: 52.8 },
  RIVN: { marketCap: 14, peRatio: -5.2, revenueGrowth: 35.8, profitMargin: -85.2, eps: -4.75, dividendYield: 0.0, oneYearReturn: -28.6 },
};

function getMetrics(ticker: string): CompanyMetrics {
  const data = REALISTIC_DATA[ticker];
  if (data) {
    return {
      ticker,
      name: COMPANY_NAMES[ticker] || ticker,
      marketCap: data.marketCap ?? 100,
      peRatio: data.peRatio ?? 20,
      revenueGrowth: data.revenueGrowth ?? 5,
      profitMargin: data.profitMargin ?? 10,
      eps: data.eps ?? 2,
      dividendYield: data.dividendYield ?? 0,
      oneYearReturn: data.oneYearReturn ?? 10,
    };
  }
  // Fallback for unknown tickers
  const rng = seededRng(hashTicker(ticker));
  return {
    ticker,
    name: COMPANY_NAMES[ticker] || ticker,
    marketCap: +(50 + rng() * 500).toFixed(0),
    peRatio: +(8 + rng() * 50).toFixed(1),
    revenueGrowth: +((rng() - 0.3) * 30).toFixed(1),
    profitMargin: +((rng() - 0.1) * 40).toFixed(1),
    eps: +((rng() - 0.2) * 15).toFixed(2),
    dividendYield: +(rng() * 4).toFixed(2),
    oneYearReturn: +((rng() - 0.3) * 80).toFixed(1),
  };
}

const METRICS: MetricRow[] = [
  { label: "Market Cap", key: "marketCap", format: (v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "T" : v + "B"}`, higherIsBetter: true },
  { label: "P/E Ratio", key: "peRatio", format: (v) => (v < 0 ? "N/A" : v.toFixed(1) + "x"), higherIsBetter: false },
  { label: "Revenue Growth", key: "revenueGrowth", format: (v) => v.toFixed(1) + "%", higherIsBetter: true },
  { label: "Profit Margin", key: "profitMargin", format: (v) => v.toFixed(1) + "%", higherIsBetter: true },
  { label: "EPS", key: "eps", format: (v) => "$" + v.toFixed(2), higherIsBetter: true },
  { label: "Dividend Yield", key: "dividendYield", format: (v) => v.toFixed(2) + "%", higherIsBetter: true },
  { label: "1Y Return", key: "oneYearReturn", format: (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%", higherIsBetter: true },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CompetitorAnalysis() {
  const [target, setTarget] = useState<string>(ALL_TARGETS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const competitors = COMPETITOR_GROUPS[target] || [];
  const allTickers = [target, ...competitors];

  const allMetrics = useMemo(
    () => allTickers.map((t) => getMetrics(t)),
    [target] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Determine winner for each metric
  const winners = useMemo(() => {
    const map: Record<string, string> = {};
    for (const metric of METRICS) {
      const key = metric.key as keyof CompanyMetrics;
      let bestTicker = "";
      let bestValue = metric.higherIsBetter ? -Infinity : Infinity;

      for (const m of allMetrics) {
        const val = m[key] as number;
        // Skip negative P/E (not profitable)
        if (metric.key === "peRatio" && val < 0) continue;

        const isBetter = metric.higherIsBetter ? val > bestValue : val < bestValue;
        if (isBetter) {
          bestValue = val;
          bestTicker = m.ticker;
        }
      }
      map[metric.key] = bestTicker;
    }
    return map;
  }, [allMetrics]);

  // Compute verdict
  const verdict = useMemo(() => {
    const counts: Record<string, { wins: number; strongIn: string[] }> = {};
    for (const t of allTickers) {
      counts[t] = { wins: 0, strongIn: [] };
    }
    for (const metric of METRICS) {
      const w = winners[metric.key];
      if (w && counts[w]) {
        counts[w].wins++;
        counts[w].strongIn.push(metric.label);
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1].wins - a[1].wins);
    const [leader, data] = sorted[0];
    const total = METRICS.length;
    const topStrengths = data.strongIn.slice(0, 2).join(" and ");
    return `${leader} leads in ${data.wins}/${total} metrics${topStrengths ? `, strongest in ${topStrengths}` : ""}.`;
  }, [winners, allTickers]);

  // Compute max value for bar visualization per metric
  const maxPerMetric = useMemo(() => {
    const map: Record<string, number> = {};
    for (const metric of METRICS) {
      const key = metric.key as keyof CompanyMetrics;
      const values = allMetrics.map((m) => Math.abs(m[key] as number));
      map[metric.key] = Math.max(...values, 1);
    }
    return map;
  }, [allMetrics]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="surface-glass dynamic-surface rounded-2xl p-4 relative overflow-hidden">
        <div className="relative z-[1]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                Competitor Analysis
              </h2>
            </div>

            {/* Target Selection */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                }}
              >
                <span>
                  {target} vs {competitors.join(", ")}
                </span>
                <ChevronDown size={13} />
              </button>
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[200px]"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  {ALL_TARGETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTarget(t);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs px-3 py-1.5 hover:opacity-80"
                      style={{
                        color: t === target ? "var(--accent)" : "var(--ink)",
                        fontWeight: t === target ? 600 : 400,
                      }}
                    >
                      {t} vs {COMPETITOR_GROUPS[t].join(", ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="competitor-table">
              <thead>
                <tr>
                  <th className="text-left">Metric</th>
                  {allMetrics.map((m) => (
                    <th key={m.ticker} className="text-right">
                      <div>{m.ticker}</div>
                      <div
                        className="text-[0.6rem] font-normal normal-case"
                        style={{ color: "var(--ink-muted)", letterSpacing: "normal" }}
                      >
                        {m.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const key = metric.key as keyof CompanyMetrics;
                  const winnerTicker = winners[metric.key];

                  return (
                    <tr key={metric.key}>
                      <td
                        className="text-left font-medium"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {metric.label}
                      </td>
                      {allMetrics.map((m) => {
                        const val = m[key] as number;
                        const isWinner = m.ticker === winnerTicker;
                        const barWidth = Math.max(
                          5,
                          (Math.abs(val) / maxPerMetric[metric.key]) * 100
                        );

                        return (
                          <td
                            key={m.ticker}
                            className={`text-right ${isWinner ? "competitor-winner" : ""}`}
                          >
                            <div
                              className="font-medium"
                              style={{
                                color: isWinner ? "var(--positive)" : "var(--ink)",
                              }}
                            >
                              {metric.format(val)}
                              {isWinner && (
                                <Trophy
                                  size={10}
                                  className="inline ml-1"
                                  style={{ color: "var(--positive)" }}
                                />
                              )}
                            </div>
                            <div className="competitor-bar mt-1">
                              <div
                                className="competitor-bar-fill"
                                style={{
                                  width: `${barWidth}%`,
                                  background: isWinner ? "var(--positive)" : undefined,
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Verdict */}
          <div
            className="mt-4 flex items-start gap-2 text-xs p-3 rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--positive) 8%, transparent)",
              color: "var(--ink)",
            }}
          >
            <TrendingUp size={14} className="shrink-0 mt-0.5" style={{ color: "var(--positive)" }} />
            <span>
              <strong>Verdict:</strong> {verdict}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
