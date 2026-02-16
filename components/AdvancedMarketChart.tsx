"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveChartColors } from "../lib/chart-theme";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketSeriesPoint } from "../lib/market-series";

type AdvancedMarketChartProps = {
  title?: string;
  subtitle?: string;
  data: MarketSeriesPoint[];
  benchmark?: MarketSeriesPoint[];
  support?: number;
  resistance?: number;
  compact?: boolean;
  className?: string;
};

type ChartRow = {
  date: string;
  close: number;
  ema9: number;
  ema21: number;
  ema55: number;
  bbUpper: number;
  bbLower: number;
  rsi14: number;
  volumeProxy: number;
  relativeStrength: number;
};

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

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { month: "short" })} ${String(
    date.getDate()
  ).padStart(2, "0")}`;
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

function ema(values: number[], period: number) {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  values.forEach((value, index) => {
    if (index === 0) {
      out.push(value);
      prev = value;
      return;
    }
    const next = value * alpha + prev * (1 - alpha);
    out.push(next);
    prev = next;
  });
  return out;
}

function rsi(values: number[], period: number) {
  if (values.length < period + 1) return values.map(() => 50);

  const output = new Array(values.length).fill(50);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  output[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    output[index] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return output;
}

function enrichSeries(
  data: MarketSeriesPoint[],
  benchmark: MarketSeriesPoint[] | undefined
): ChartRow[] {
  const normalized = [...data]
    .filter((row) => row.date && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-260);
  if (normalized.length < 2) return [];

  const closes = normalized.map((row) => row.close);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema55 = ema(closes, 55);
  const rsi14 = rsi(closes, 14);

  const benchmarkMap = new Map<string, number>();
  (benchmark ?? []).forEach((row) => {
    if (row.date && Number.isFinite(row.close) && row.close > 0) {
      benchmarkMap.set(row.date, row.close);
    }
  });
  const benchmarkStart = benchmarkMap.size
    ? [...benchmarkMap.values()][0]
    : closes[0];
  const start = closes[0];

  return normalized.map((row, index) => {
    const lookback = closes.slice(Math.max(0, index - 19), index + 1);
    const deviation = std(lookback);
    const basis = avg(lookback);
    const bbUpper = basis + deviation * 2;
    const bbLower = Math.max(0.01, basis - deviation * 2);

    const prev = closes[Math.max(0, index - 1)];
    const dayRet = prev > 0 ? (row.close - prev) / prev : 0;
    const volProxy = Math.abs(dayRet) * 1000 + 12 + (index % 7) * 1.5;

    const bench = benchmarkMap.get(row.date) ?? benchmarkStart;
    const basePerf = start > 0 ? (row.close / start - 1) * 100 : 0;
    const benchPerf = benchmarkStart > 0 ? (bench / benchmarkStart - 1) * 100 : 0;

    return {
      date: row.date,
      close: row.close,
      ema9: ema9[index],
      ema21: ema21[index],
      ema55: ema55[index],
      bbUpper,
      bbLower,
      rsi14: rsi14[index],
      volumeProxy: Number(volProxy.toFixed(2)),
      relativeStrength: Number((basePerf - benchPerf).toFixed(2)),
    };
  });
}

export default function AdvancedMarketChart({
  title = "Advanced Market Structure",
  subtitle,
  data,
  benchmark,
  support,
  resistance,
  compact = false,
  className = "",
}: AdvancedMarketChartProps) {
  const [showBands, setShowBands] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showRelative, setShowRelative] = useState(true);
  const [colors, setColors] = useState(resolveChartColors());

  useEffect(() => {
    setColors(resolveChartColors());
  }, []);

  const chartData = useMemo(() => enrichSeries(data, benchmark), [data, benchmark]);

  const stats = useMemo(() => {
    if (!chartData.length) {
      return {
        momentum20Pct: 0,
        volatilityPct: 0,
        trend: "Neutral",
      };
    }

    const closes = chartData.map((row) => row.close);
    const latest = closes[closes.length - 1];
    const lookback = closes[Math.max(0, closes.length - 21)] || latest;
    const momentum20Pct = lookback > 0 ? ((latest - lookback) / lookback) * 100 : 0;
    const returns = closes.slice(1).map((value, index) => {
      const prev = closes[index];
      return prev > 0 ? ((value - prev) / prev) * 100 : 0;
    });
    const volatilityPct = std(returns);
    const latestRow = chartData[chartData.length - 1];
    const trend =
      latestRow.close > latestRow.ema21 && latestRow.ema21 > latestRow.ema55
        ? "Bullish"
        : latestRow.close < latestRow.ema21 && latestRow.ema21 < latestRow.ema55
        ? "Bearish"
        : "Neutral";

    return {
      momentum20Pct,
      volatilityPct,
      trend,
    };
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className={`card-elevated rounded-xl p-3 ${className}`}>
        <div className="text-sm font-semibold section-title">{title}</div>
        <div className="text-xs muted mt-2">Insufficient series data.</div>
      </div>
    );
  }

  const latest = chartData[chartData.length - 1];

  return (
    <div className={`card-elevated rounded-xl p-3 space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold section-title">{title}</div>
          {subtitle && <div className="text-xs muted mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          <span className="rounded-full px-2 py-0.5 badge-neutral">
            Price {formatMoney(latest.close)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              stats.momentum20Pct >= 0 ? "badge-positive" : "badge-negative"
            }`}
          >
            M20 {formatPercent(stats.momentum20Pct)}
          </span>
          <span className="rounded-full px-2 py-0.5 badge-neutral">
            Vol {stats.volatilityPct.toFixed(2)}%
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              stats.trend === "Bullish"
                ? "badge-positive"
                : stats.trend === "Bearish"
                ? "badge-negative"
                : "badge-neutral"
            }`}
          >
            {stats.trend}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          <button
            onClick={() => setShowEma((current) => !current)}
            className={`rounded-full px-2 py-1 border ${
              showEma
                ? "border-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_18%,transparent)]"
                : "border-[var(--surface-border)] bg-white/75 dark:bg-black/20"
            }`}
          >
            EMA
          </button>
          <button
            onClick={() => setShowBands((current) => !current)}
            className={`rounded-full px-2 py-1 border ${
              showBands
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/75 dark:bg-black/20"
            }`}
          >
            Bollinger
          </button>
          <button
            onClick={() => setShowRelative((current) => !current)}
            className={`rounded-full px-2 py-1 border ${
              showRelative
                ? "border-[var(--accent-3)] bg-[color-mix(in_srgb,var(--accent-3)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/75 dark:bg-black/20"
            }`}
          >
            Relative
          </button>
        </div>
      )}

      <div className={compact ? "h-[220px]" : "h-[300px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="amc-close-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.positive} stopOpacity={0.45} />
                <stop offset="70%" stopColor={colors.positive} stopOpacity={0.12} />
                <stop offset="100%" stopColor={colors.positive} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: colors.text }}
              minTickGap={30}
            />
            <YAxis
              yAxisId="price"
              tick={{ fontSize: 11, fill: colors.text }}
              width={66}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value)
              }
            />
            <YAxis yAxisId="volume" orientation="right" hide domain={[0, "dataMax"]} />
            <Tooltip
              formatter={(value: number, key: string) => {
                if (key === "volumeProxy") return [value.toFixed(1), "Volume Impulse"];
                if (key === "rsi14") return [value.toFixed(1), "RSI-14"];
                if (key === "relativeStrength") return [`${value.toFixed(2)}%`, "Relative Strength"];
                return [formatMoney(value), key.toUpperCase()];
              }}
              labelFormatter={(value: string) => new Date(value).toLocaleDateString("en-US")}
            />

            <Bar
              yAxisId="volume"
              dataKey="volumeProxy"
              fill={colors.primaryFill}
              barSize={2}
            />

            {showBands && (
              <>
                <Line
                  yAxisId="price"
                  dataKey="bbUpper"
                  stroke={colors.warning}
                  strokeWidth={1.2}
                  strokeOpacity={0.45}
                  dot={false}
                />
                <Line
                  yAxisId="price"
                  dataKey="bbLower"
                  stroke={colors.warning}
                  strokeWidth={1.2}
                  strokeOpacity={0.45}
                  dot={false}
                />
              </>
            )}

            <Area
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="var(--accent-2)"
              strokeWidth={2.1}
              fill="url(#amc-close-fill)"
              dot={false}
            />

            {showEma && (
              <>
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ema9"
                  stroke={colors.warning}
                  strokeWidth={1.6}
                  strokeOpacity={0.95}
                  dot={false}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ema21"
                  stroke={colors.primary}
                  strokeWidth={1.4}
                  strokeOpacity={0.95}
                  dot={false}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ema55"
                  stroke={colors.primary}
                  strokeWidth={1.2}
                  strokeOpacity={0.7}
                  dot={false}
                />
              </>
            )}

            {typeof support === "number" && Number.isFinite(support) && support > 0 && (
              <ReferenceLine
                yAxisId="price"
                y={support}
                stroke={colors.positive}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "Support", fill: colors.positive, fontSize: 11 }}
              />
            )}
            {typeof resistance === "number" && Number.isFinite(resistance) && resistance > 0 && (
              <ReferenceLine
                yAxisId="price"
                y={resistance}
                stroke={colors.negative}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "Resistance", fill: colors.negative, fontSize: 11 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showRelative && !compact && (
        <div className="h-[96px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 10, fill: colors.text }}
                minTickGap={36}
              />
              <YAxis
                tick={{ fontSize: 10, fill: colors.text }}
                width={54}
                tickFormatter={(value: number) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value: number, key: string) => {
                  if (key === "rsi14") return [value.toFixed(1), "RSI-14"];
                  return [`${value.toFixed(2)}%`, "Relative Strength"];
                }}
                labelFormatter={(value: string) => new Date(value).toLocaleDateString("en-US")}
              />
              <ReferenceLine y={0} stroke={colors.text} strokeDasharray="3 3" strokeOpacity={0.45} />
              <ReferenceLine y={70} stroke={colors.warning} strokeDasharray="4 4" strokeOpacity={0.4} />
              <ReferenceLine y={30} stroke={colors.positive} strokeDasharray="4 4" strokeOpacity={0.4} />
              <Line
                type="monotone"
                dataKey="relativeStrength"
                stroke={colors.primary}
                strokeWidth={1.8}
                strokeOpacity={0.95}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="rsi14"
                stroke={colors.warning}
                strokeWidth={1.3}
                strokeOpacity={0.9}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
