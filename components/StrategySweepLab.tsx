"use client";

import { useMemo, useState } from "react";
import { Aperture, FlaskConical, Play, Sparkles } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { defaultBacktestConfig, runBacktest, type BacktestResult } from "../lib/backtesting";
import { fetchMarketSeries } from "../lib/market-series";

type StrategySweepLabProps = {
  defaultSymbol?: string;
  watchlistSymbols: string[];
};

type SweepRow = {
  rank: number;
  fast: number;
  slow: number;
  stopLossPct: number;
  takeProfitPct: number;
  score: number;
  cagrPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  winRatePct: number;
  trades: number;
  expectancy: number;
};

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function scoreResult(result: BacktestResult) {
  return (
    result.metrics.sharpe * 36 +
    result.metrics.cagrPct * 0.72 -
    result.metrics.maxDrawdownPct * 0.92 +
    result.metrics.winRatePct * 0.18 +
    result.metrics.expectancyPct * 0.35
  );
}

function quantiles(values: number[]) {
  if (!values.length) return { p10: 0, p50: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const read = (ratio: number) => {
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)));
    return sorted[index];
  };
  return { p10: read(0.1), p50: read(0.5), p90: read(0.9) };
}

function runMonteCarlo(tradeReturnsPct: number[], iterations = 400) {
  if (!tradeReturnsPct.length) {
    return { p10: 0, p50: 0, p90: 0, worst: 0, best: 0 };
  }

  const outcomes: number[] = [];
  for (let idx = 0; idx < iterations; idx += 1) {
    let equity = 1;
    for (let step = 0; step < tradeReturnsPct.length; step += 1) {
      const pick = tradeReturnsPct[Math.floor(Math.random() * tradeReturnsPct.length)];
      equity *= 1 + pick / 100;
    }
    outcomes.push((equity - 1) * 100);
  }

  const q = quantiles(outcomes);
  return {
    ...q,
    worst: Math.min(...outcomes),
    best: Math.max(...outcomes),
  };
}

export default function StrategySweepLab({ defaultSymbol, watchlistSymbols }: StrategySweepLabProps) {
  const [symbol, setSymbol] = useState(
    normalizeSymbol(defaultSymbol || watchlistSymbols[0] || "AAPL")
  );
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<SweepRow[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"local" | "remote" | "synthetic">("local");
  const [monteCarlo, setMonteCarlo] = useState<{
    p10: number;
    p50: number;
    p90: number;
    worst: number;
    best: number;
  } | null>(null);
  const [bestExpectancy, setBestExpectancy] = useState(0);

  const symbolSuggestions = useMemo(
    () => [...new Set(watchlistSymbols.map((item) => normalizeSymbol(item)).filter(Boolean))].slice(0, 12),
    [watchlistSymbols]
  );

  const runSweep = async () => {
    setRunning(true);
    setError("");
    setNotice("");

    try {
      const normalized = normalizeSymbol(symbol);
      if (!normalized) {
        setError("Enter a valid symbol before running optimizer.");
        return;
      }

      const history = await fetchMarketSeries(normalized, 520, process.env.NEXT_PUBLIC_API_BASE);
      setSource(history.source);
      if (history.detail) {
        setNotice(history.detail);
      }

      const fastPeriods = [8, 12, 16, 20];
      const slowPeriods = [34, 50, 80, 120];
      const stops = [1.6, 2.2, 3.0, 4.5];
      const targets = [3.2, 4.8, 6.8, 9.4];

      const leaderboard: SweepRow[] = [];
      let bestResult: BacktestResult | null = null;

      for (const fast of fastPeriods) {
        for (const slow of slowPeriods) {
          if (fast >= slow) continue;
          for (const stopLossPct of stops) {
            for (const takeProfitPct of targets) {
              const base = defaultBacktestConfig(normalized);
              const result = runBacktest(
                history.series.map((item) => ({ date: item.date, close: item.close })),
                {
                  ...base,
                  symbol: normalized,
                  lookbackBars: Math.min(history.series.length, 504),
                  fastPeriod: fast,
                  slowPeriod: slow,
                  stopLossPct,
                  takeProfitPct,
                  riskPerTradePct: 1.2,
                  maxPositionPct: 18,
                  entryRule: "sma_cross",
                  exitRule: "signal_reversal",
                  breakoutLookback: 20,
                }
              );

              if (result.metrics.trades < 6) continue;
              const score = scoreResult(result);
              const row: SweepRow = {
                rank: 0,
                fast,
                slow,
                stopLossPct,
                takeProfitPct,
                score,
                cagrPct: result.metrics.cagrPct,
                sharpe: result.metrics.sharpe,
                maxDrawdownPct: result.metrics.maxDrawdownPct,
                winRatePct: result.metrics.winRatePct,
                trades: result.metrics.trades,
                expectancy: result.metrics.expectancy,
              };
              leaderboard.push(row);

              if (!bestResult || score > scoreResult(bestResult)) {
                bestResult = result;
              }
            }
          }
        }
      }

      const top = leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 16)
        .map((row, index) => ({ ...row, rank: index + 1 }));
      setRows(top);

      if (!top.length || !bestResult) {
        setError("No stable strategy variants found. Expand lookback or symbol universe.");
        setMonteCarlo(null);
        return;
      }

      setBestExpectancy(bestResult.metrics.expectancy);
      setMonteCarlo(runMonteCarlo(bestResult.trades.map((trade) => trade.pnlPct)));
      setNotice(
        `Sweep complete: evaluated ${leaderboard.length} variants. Best Sharpe ${top[0].sharpe.toFixed(
          2
        )}, CAGR ${formatPercent(top[0].cagrPct)}.`
      );
    } catch (sweepError) {
      setError(sweepError instanceof Error ? sweepError.message : "Unable to run strategy sweep.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <FlaskConical size={16} />
          Strategy Sweep + Monte Carlo Lab
        </h3>
        <span className="text-xs rounded-full px-2 py-0.5 badge-neutral">
          Data {source.toUpperCase()}
        </span>
      </div>

      <p className="text-xs muted">
        Grid-search strategy parameters, rank by risk-adjusted score, and run Monte Carlo robustness simulation on top variants.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid sm:grid-cols-[0.8fr_auto] gap-2 items-end">
        <label className="text-xs space-y-1">
          <div className="muted">Sweep Symbol</div>
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            placeholder="AAPL"
          />
        </label>

        <button
          onClick={runSweep}
          disabled={running}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] text-white px-4 py-2 text-sm font-semibold disabled:opacity-70"
        >
          <Play size={12} />
          {running ? "Running Sweep..." : "Run Sweep"}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {symbolSuggestions.map((item) => (
          <button
            key={item}
            onClick={() => setSymbol(item)}
            className={`rounded-full px-2.5 py-1 text-xs border ${
              normalizeSymbol(symbol) === item
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-3">
        <div className="overflow-auto rounded-xl border border-[var(--surface-border)]">
          <table className="w-full text-sm">
            <thead className="text-xs muted bg-black/5 dark:bg-white/10">
              <tr>
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Fast/Slow</th>
                <th className="text-right py-2 px-2">Stop/TP</th>
                <th className="text-right py-2 px-2">Score</th>
                <th className="text-right py-2 px-2">CAGR</th>
                <th className="text-right py-2 px-2">Sharpe</th>
                <th className="text-right py-2 px-2">DD</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs muted">
                    Run optimizer to populate leaderboard.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={`${row.fast}-${row.slow}-${row.stopLossPct}-${row.takeProfitPct}`} className="border-t border-[var(--surface-border)]">
                  <td className="py-2 px-2">{row.rank}</td>
                  <td className="py-2 px-2 metric-value">
                    {row.fast}/{row.slow}
                  </td>
                  <td className="py-2 px-2 text-right metric-value">
                    {row.stopLossPct.toFixed(1)} / {row.takeProfitPct.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right metric-value">{row.score.toFixed(1)}</td>
                  <td className={`py-2 px-2 text-right metric-value ${row.cagrPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {formatPercent(row.cagrPct)}
                  </td>
                  <td className="py-2 px-2 text-right metric-value">{row.sharpe.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right metric-value text-[var(--negative)]">
                    -{row.maxDrawdownPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <div className="card-elevated rounded-xl p-3">
            <div className="text-sm font-semibold section-title inline-flex items-center gap-1.5">
              <Aperture size={14} />
              Risk/Return Scatter
            </div>
            <div className="h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,122,140,0.18)" />
                  <XAxis
                    type="number"
                    dataKey="maxDrawdownPct"
                    name="Max Drawdown"
                    tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="cagrPct"
                    name="CAGR"
                    tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number, key: string) =>
                      key === "cagrPct" || key === "maxDrawdownPct"
                        ? [`${value.toFixed(2)}%`, key === "cagrPct" ? "CAGR" : "Max DD"]
                        : [value.toFixed(2), key]
                    }
                  />
                  <Scatter data={rows}>
                    {rows.map((row, index) => (
                      <Cell
                        key={`${row.rank}-${index}`}
                        fill={index === 0 ? "var(--accent)" : "var(--accent-2)"}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-elevated rounded-xl p-3 text-xs">
            <div className="text-sm font-semibold section-title inline-flex items-center gap-1.5">
              <Sparkles size={14} />
              Monte Carlo Robustness
            </div>
            {monteCarlo ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="muted">P10 Outcome</span>
                  <span className={monteCarlo.p10 >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                    {formatPercent(monteCarlo.p10)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="muted">Median Outcome</span>
                  <span className={monteCarlo.p50 >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                    {formatPercent(monteCarlo.p50)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="muted">P90 Outcome</span>
                  <span className={monteCarlo.p90 >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                    {formatPercent(monteCarlo.p90)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="muted">Worst / Best</span>
                  <span>
                    {formatPercent(monteCarlo.worst)} / {formatPercent(monteCarlo.best)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] muted">
                  Baseline expectancy per trade: {formatMoney(bestExpectancy)}
                </div>
              </div>
            ) : (
              <div className="mt-2 muted">Monte Carlo stats appear after a successful sweep.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
