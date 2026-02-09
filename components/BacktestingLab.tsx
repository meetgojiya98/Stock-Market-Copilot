"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Gauge,
  Play,
  ShieldCheck,
  Sigma,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  defaultBacktestConfig,
  type BacktestConfig,
  type BacktestResult,
  type EntryRule,
  type ExitRule,
  type HistoricalBar,
  runBacktest,
} from "../lib/backtesting";

type BacktestingLabProps = {
  watchlistSymbols: string[];
  defaultSymbol?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const LOOKBACK_OPTIONS = [126, 252, 504];

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { month: "short" })} ${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function hashSymbol(symbol: string) {
  return symbol
    .split("")
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 13), 211);
}

function createSeededRng(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function syntheticHistory(symbol: string, bars: number): HistoricalBar[] {
  const seed = hashSymbol(symbol);
  const random = createSeededRng(seed);
  const count = Math.max(80, bars);
  const start = Date.now() - count * 24 * 60 * 60 * 1000;
  const baseline = 50 + (seed % 250);
  let price = baseline;

  const points: HistoricalBar[] = [];
  for (let idx = 0; idx < count; idx += 1) {
    const drift = (random() - 0.48) * 0.012;
    const seasonal = Math.sin(idx / 19) * 0.004;
    price = Math.max(5, price * (1 + drift + seasonal));
    const date = new Date(start + idx * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    points.push({
      date,
      close: Number(price.toFixed(2)),
    });
  }

  return points;
}

function normalizeBars(raw: unknown): HistoricalBar[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      const date = String(candidate.date ?? candidate.time ?? "").slice(0, 10);
      const close = Number(candidate.price ?? candidate.close ?? candidate.y ?? 0);
      return {
        date,
        close,
      };
    })
    .filter((item) => item.date && Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

async function fetchHistory(symbol: string, bars: number): Promise<{
  bars: HistoricalBar[];
  source: "local" | "remote" | "synthetic";
  detail?: string;
}> {
  const normalized = normalizeSymbol(symbol);
  const limit = Math.max(80, bars);

  try {
    const response = await fetch(
      `/api/stocks/chart?symbol=${encodeURIComponent(normalized)}&limit=${limit}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    const parsed = normalizeBars(data?.data ?? data?.history ?? []);
    if (parsed.length >= 80) {
      return {
        bars: parsed.slice(-limit),
        source: "local",
      };
    }
  } catch {
    // Fall through.
  }

  if (API_BASE) {
    const backendRange =
      bars >= 504 ? "5y" : bars >= 252 ? "1y" : bars >= 126 ? "6mo" : "3mo";

    try {
      const response = await fetch(
        `${API_BASE}/chart/${encodeURIComponent(normalized)}?range=${backendRange}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      const parsed = normalizeBars(data?.data ?? data?.history ?? []);
      if (parsed.length >= 80) {
        return {
          bars: parsed.slice(-limit),
          source: "remote",
        };
      }
    } catch {
      // Fall through.
    }
  }

  return {
    bars: syntheticHistory(normalized, limit),
    source: "synthetic",
    detail: "Live history unavailable. Synthetic market path used for sandboxing.",
  };
}

function metricTone(value: number, inverse = false) {
  if (inverse) return value <= 12 ? "text-[var(--positive)]" : "text-[var(--negative)]";
  return value >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";
}

export default function BacktestingLab({ watchlistSymbols, defaultSymbol }: BacktestingLabProps) {
  const [config, setConfig] = useState<BacktestConfig>(
    defaultBacktestConfig(defaultSymbol || watchlistSymbols[0] || "AAPL")
  );
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [historySource, setHistorySource] = useState<"local" | "remote" | "synthetic">("local");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const suggestedSymbols = useMemo(() => {
    const unique = [...new Set(watchlistSymbols.map((item) => normalizeSymbol(item)).filter(Boolean))];
    return unique.slice(0, 12);
  }, [watchlistSymbols]);

  useEffect(() => {
    if (config.symbol) return;
    const seeded = normalizeSymbol(defaultSymbol || suggestedSymbols[0] || "AAPL");
    setConfig((current) => ({
      ...current,
      symbol: seeded,
    }));
  }, [config.symbol, defaultSymbol, suggestedSymbols]);

  const updateConfig = <K extends keyof BacktestConfig>(key: K, value: BacktestConfig[K]) => {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const runLab = async () => {
    setRunning(true);
    setError("");
    setNotice("");

    try {
      const symbol = normalizeSymbol(config.symbol);
      if (!symbol) {
        setError("Provide a symbol to run the backtest.");
        return;
      }

      const history = await fetchHistory(symbol, config.lookbackBars);
      const nextResult = runBacktest(history.bars, {
        ...config,
        symbol,
      });

      setResult(nextResult);
      setHistorySource(history.source);
      if (history.detail) setNotice(history.detail);
      if (!nextResult.metrics.trades) {
        setNotice("Backtest ran successfully, but no trades were triggered for the current rule set.");
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run backtest.");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runLab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card-elevated rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <BarChart3 size={16} />
          Strategy Backtesting Lab
        </h3>
        <button
          onClick={runLab}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-70"
        >
          <Play size={12} />
          {running ? "Running..." : "Run Backtest"}
        </button>
      </div>

      <p className="text-xs muted mt-1">
        Test entry, exit, stop, and position sizing rules on historical data before promoting an idea into paper execution.
      </p>

      {(notice || error) && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="mt-3 grid xl:grid-cols-[1.35fr_1fr] gap-4">
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Symbol</div>
              <input
                value={config.symbol}
                onChange={(event) => updateConfig("symbol", event.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Lookback</div>
              <select
                value={config.lookbackBars}
                onChange={(event) => updateConfig("lookbackBars", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                {LOOKBACK_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} trading days
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Initial Capital</div>
              <input
                type="number"
                min={1000}
                step={500}
                value={config.initialCapital}
                onChange={(event) => updateConfig("initialCapital", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {suggestedSymbols.map((item) => (
              <button
                key={item}
                onClick={() => updateConfig("symbol", item)}
                className={`rounded-full px-2.5 py-1 text-xs border ${
                  normalizeSymbol(config.symbol) === item
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                    : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Entry Rule</div>
              <select
                value={config.entryRule}
                onChange={(event) => updateConfig("entryRule", event.target.value as EntryRule)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                <option value="sma_cross">SMA Cross-Up</option>
                <option value="breakout">Breakout</option>
              </select>
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Exit Rule</div>
              <select
                value={config.exitRule}
                onChange={(event) => updateConfig("exitRule", event.target.value as ExitRule)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                <option value="signal_reversal">Signal Reversal</option>
                <option value="sma_break">Close Below Slow SMA</option>
                <option value="time_stop">Time Stop</option>
              </select>
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Breakout Lookback</div>
              <input
                type="number"
                min={5}
                step={1}
                value={config.breakoutLookback}
                onChange={(event) => updateConfig("breakoutLookback", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Fast SMA</div>
              <input
                type="number"
                min={2}
                step={1}
                value={config.fastPeriod}
                onChange={(event) => updateConfig("fastPeriod", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Slow SMA</div>
              <input
                type="number"
                min={5}
                step={1}
                value={config.slowPeriod}
                onChange={(event) => updateConfig("slowPeriod", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Max Hold (bars)</div>
              <input
                type="number"
                min={2}
                step={1}
                value={config.maxHoldBars}
                onChange={(event) => updateConfig("maxHoldBars", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Stop Loss %</div>
              <input
                type="number"
                min={0.2}
                max={40}
                step={0.1}
                value={config.stopLossPct}
                onChange={(event) => updateConfig("stopLossPct", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Take Profit %</div>
              <input
                type="number"
                min={0.2}
                max={120}
                step={0.1}
                value={config.takeProfitPct}
                onChange={(event) => updateConfig("takeProfitPct", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Risk / Trade %</div>
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={config.riskPerTradePct}
                onChange={(event) => updateConfig("riskPerTradePct", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Max Position %</div>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={config.maxPositionPct}
                onChange={(event) => updateConfig("maxPositionPct", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Slippage (bps)</div>
              <input
                type="number"
                min={0}
                max={200}
                step={1}
                value={config.slippageBps}
                onChange={(event) => updateConfig("slippageBps", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Fees (bps)</div>
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={config.feeBps}
                onChange={(event) => updateConfig("feeBps", Number(event.target.value))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="card-elevated rounded-xl p-3">
            <div className="text-xs muted flex items-center gap-1">
              <CalendarRange size={12} />
              Test Window
            </div>
            <div className="mt-1 text-sm font-semibold">
              {result ? `${formatDate(result.startDate)} -> ${formatDate(result.endDate)}` : "No run yet"}
            </div>
            <div className="text-xs muted mt-1">
              Source: {historySource === "synthetic" ? "Synthetic Path" : historySource === "remote" ? "Remote API" : "Local API"}
            </div>
            <div className="text-xs muted">
              Bars processed: {result?.bars ?? 0}
            </div>
          </div>

          <div className="card-elevated rounded-xl p-3">
            <div className="text-xs muted flex items-center gap-1">
              <ShieldCheck size={12} />
              Risk Model
            </div>
            <ul className="mt-2 text-xs space-y-1">
              <li>Entry at signal close with configurable slippage.</li>
              <li>Stops and take-profit evaluated on daily close.</li>
              <li>Sizing constrained by risk budget and max allocation.</li>
              <li>Sharpe assumes 252 trading days, rf=0.</li>
            </ul>
          </div>
        </aside>
      </div>

      {result && (
        <>
          <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="card-elevated rounded-xl p-3">
              <div className="text-xs muted flex items-center gap-1">
                <TrendingUp size={12} />
                CAGR
              </div>
              <div className={`mt-1 text-lg metric-value ${metricTone(result.metrics.cagrPct)}`}>
                {formatPercent(result.metrics.cagrPct)}
              </div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-xs muted flex items-center gap-1">
                <TrendingDown size={12} />
                Max Drawdown
              </div>
              <div className={`mt-1 text-lg metric-value ${metricTone(result.metrics.maxDrawdownPct, true)}`}>
                -{result.metrics.maxDrawdownPct.toFixed(2)}%
              </div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-xs muted flex items-center gap-1">
                <Sigma size={12} />
                Sharpe
              </div>
              <div className="mt-1 text-lg metric-value">{result.metrics.sharpe.toFixed(2)}</div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-xs muted flex items-center gap-1">
                <Gauge size={12} />
                Win Rate
              </div>
              <div className="mt-1 text-lg metric-value">{result.metrics.winRatePct.toFixed(1)}%</div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-xs muted flex items-center gap-1">
                <Timer size={12} />
                Expectancy
              </div>
              <div className={`mt-1 text-lg metric-value ${metricTone(result.metrics.expectancy)}`}>
                {formatMoney(result.metrics.expectancy)}
              </div>
              <div className="text-[11px] muted">{formatPercent(result.metrics.expectancyPct)} per trade</div>
            </div>
          </div>

          <div className="mt-4 card-elevated rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="muted">
                Equity curve with mark-to-market open position value.
              </span>
              <span className={result.metrics.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                Total return: {formatMoney(result.metrics.totalReturn)} ({formatPercent(result.metrics.totalReturnPct)})
              </span>
            </div>
            <div className="h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.18)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat("en-US", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(value)
                    }
                    width={70}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatMoney(value), "Equity"]}
                    labelFormatter={(value: string) => formatDate(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="var(--accent-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 card-elevated rounded-xl p-3">
            <div className="text-sm font-semibold section-title">Trade Log</div>
            <div className="text-xs muted mt-1">
              {result.metrics.trades} trades • {result.metrics.wins} wins • {result.metrics.losses} losses
            </div>

            <div className="mt-2 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs muted">
                  <tr>
                    <th className="text-left py-2">Entry</th>
                    <th className="text-left py-2">Exit</th>
                    <th className="text-right py-2">Shares</th>
                    <th className="text-right py-2">Entry Px</th>
                    <th className="text-right py-2">Exit Px</th>
                    <th className="text-right py-2">P/L</th>
                    <th className="text-right py-2">Hold</th>
                    <th className="text-right py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-5 text-center text-xs muted">
                        No trades generated by current strategy settings.
                      </td>
                    </tr>
                  )}

                  {result.trades.slice(0, 20).map((trade, index) => (
                    <tr key={`${trade.entryDate}-${trade.exitDate}-${index}`} className="border-t border-[var(--surface-border)]">
                      <td className="py-2 text-xs">{formatDate(trade.entryDate)}</td>
                      <td className="py-2 text-xs">{formatDate(trade.exitDate)}</td>
                      <td className="py-2 text-right metric-value">{trade.shares}</td>
                      <td className="py-2 text-right metric-value">{formatMoney(trade.entryPrice)}</td>
                      <td className="py-2 text-right metric-value">{formatMoney(trade.exitPrice)}</td>
                      <td className={`py-2 text-right metric-value ${trade.pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                        {formatMoney(trade.pnl)}
                      </td>
                      <td className="py-2 text-right text-xs muted">{trade.holdingBars}d</td>
                      <td className="py-2 text-right text-xs muted">{trade.exitReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
