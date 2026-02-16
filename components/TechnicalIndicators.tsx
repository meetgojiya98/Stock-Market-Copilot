"use client";

import { useMemo, useState } from "react";
import { BarChart3, Minus, MousePointer2, PenTool, Type } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IndicatorKey = "sma20" | "sma50" | "ema12" | "ema26" | "rsi" | "macd" | "bollinger" | "vwap";

type IndicatorMeta = {
  key: IndicatorKey;
  label: string;
  color: string;
};

type DrawingTool = "trendline" | "fibonacci" | "horizontal" | "text";

type TechnicalIndicatorsProps = {
  symbol?: string;
};

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const INDICATORS: IndicatorMeta[] = [
  { key: "sma20", label: "SMA 20", color: "#3b82f6" },
  { key: "sma50", label: "SMA 50", color: "#f59e0b" },
  { key: "ema12", label: "EMA 12", color: "#10b981" },
  { key: "ema26", label: "EMA 26", color: "#ef4444" },
  { key: "rsi", label: "RSI", color: "#3b82f6" },
  { key: "macd", label: "MACD", color: "#ec4899" },
  { key: "bollinger", label: "Bollinger", color: "#06b6d4" },
  { key: "vwap", label: "VWAP", color: "#f97316" },
];

const DRAWING_TOOLS: { key: DrawingTool; label: string; icon: typeof PenTool }[] = [
  { key: "trendline", label: "Trendline", icon: PenTool },
  { key: "fibonacci", label: "Fibonacci", icon: BarChart3 },
  { key: "horizontal", label: "Horizontal Line", icon: Minus },
  { key: "text", label: "Text Note", icon: Type },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str: string) {
  return str.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 137);
}

const BASE_PRICES: Record<string, number> = {
  AAPL: 189.84,
  MSFT: 420.55,
  GOOGL: 174.13,
  AMZN: 185.07,
  TSLA: 248.42,
  NVDA: 875.28,
  META: 502.30,
};

function computeIndicatorValue(
  indicator: IndicatorKey,
  symbol: string
): { value: string; signal: "bullish" | "bearish" | "neutral"; detail: string } {
  const base = BASE_PRICES[symbol.toUpperCase()] ?? 150 + (hashStr(symbol) % 300);
  const rng = seeded(hashStr(symbol) + hashStr(indicator));

  switch (indicator) {
    case "sma20": {
      const v = base * (0.97 + rng() * 0.06);
      const signal = v < base ? "bullish" : "bearish";
      return { value: `$${v.toFixed(2)}`, signal, detail: `Price is ${signal === "bullish" ? "above" : "below"} SMA 20 (${v.toFixed(2)}). ${signal === "bullish" ? "Uptrend support intact." : "Possible downtrend forming."}` };
    }
    case "sma50": {
      const v = base * (0.94 + rng() * 0.08);
      const signal = v < base ? "bullish" : "bearish";
      return { value: `$${v.toFixed(2)}`, signal, detail: `SMA 50 at ${v.toFixed(2)}. ${signal === "bullish" ? "Medium-term trend bullish." : "Approaching resistance from below."}` };
    }
    case "ema12": {
      const v = base * (0.985 + rng() * 0.03);
      const signal = v < base ? "bullish" : "bearish";
      return { value: `$${v.toFixed(2)}`, signal, detail: `EMA 12 tracking at ${v.toFixed(2)}. ${signal === "bullish" ? "Short-term momentum positive." : "Short-term pullback underway."}` };
    }
    case "ema26": {
      const v = base * (0.96 + rng() * 0.06);
      const signal = v < base ? "bullish" : "bearish";
      return { value: `$${v.toFixed(2)}`, signal, detail: `EMA 26 at ${v.toFixed(2)}. ${signal === "bullish" ? "Trend structure remains intact." : "Weakening intermediate momentum."}` };
    }
    case "rsi": {
      const v = +(25 + rng() * 55).toFixed(1);
      const signal = v > 70 ? "bearish" : v < 30 ? "bullish" : "neutral";
      return { value: `${v}`, signal, detail: `RSI at ${v}. ${v > 70 ? "Overbought territory -- caution." : v < 30 ? "Oversold -- potential bounce." : "Neutral zone, no extreme readings."}` };
    }
    case "macd": {
      const macdLine = +((rng() - 0.45) * 5).toFixed(3);
      const signalLine = +((rng() - 0.48) * 4).toFixed(3);
      const histogram = +(macdLine - signalLine).toFixed(3);
      const signal = histogram > 0 ? "bullish" : "bearish";
      return { value: `${macdLine} / ${signalLine}`, signal, detail: `MACD Line: ${macdLine}, Signal: ${signalLine}, Histogram: ${histogram}. ${signal === "bullish" ? "Bullish crossover active." : "Bearish crossover in effect."}` };
    }
    case "bollinger": {
      const mid = base;
      const std = base * (0.015 + rng() * 0.02);
      const upper = +(mid + 2 * std).toFixed(2);
      const lower = +(mid - 2 * std).toFixed(2);
      const pctB = +((base - lower) / (upper - lower) * 100).toFixed(1);
      const signal = pctB > 80 ? "bearish" : pctB < 20 ? "bullish" : "neutral";
      return { value: `${lower} - ${upper}`, signal, detail: `Bands: $${lower} to $${upper}. %B = ${pctB}%. ${signal === "bearish" ? "Near upper band -- extended." : signal === "bullish" ? "Near lower band -- potential reversal." : "Midrange -- no extreme."}` };
    }
    case "vwap": {
      const v = base * (0.995 + rng() * 0.01);
      const signal = base > v ? "bullish" : "bearish";
      return { value: `$${v.toFixed(2)}`, signal, detail: `VWAP at $${v.toFixed(2)}. ${signal === "bullish" ? "Trading above VWAP -- institutional demand." : "Below VWAP -- selling pressure."}` };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TechnicalIndicators({ symbol = "AAPL" }: TechnicalIndicatorsProps) {
  const [active, setActive] = useState<Set<IndicatorKey>>(new Set());
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<DrawingTool | null>(null);

  const toggle = (key: IndicatorKey) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const computedValues = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeIndicatorValue>> = {};
    for (const key of active) {
      map[key] = computeIndicatorValue(key, symbol);
    }
    return map;
  }, [active, symbol]);

  return (
    <div className="indicator-panel rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-4 fade-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 size={15} className="text-[var(--accent)]" />
        <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Technical Indicators</span>
        <span className="ml-auto text-xs font-semibold font-mono">{symbol}</span>
      </div>

      {/* Indicator chips */}
      <div className="flex flex-wrap gap-2">
        {INDICATORS.map((ind) => {
          const isActive = active.has(ind.key);
          return (
            <button
              key={ind.key}
              onClick={() => toggle(ind.key)}
              className={`indicator-chip rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                isActive
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] shadow-sm"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: ind.color, opacity: isActive ? 1 : 0.4 }}
              />
              {ind.label}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {active.size > 0 && (
        <div className="indicator-legend flex flex-wrap gap-3">
          {INDICATORS.filter((ind) => active.has(ind.key)).map((ind) => (
            <div key={ind.key} className="indicator-legend-item flex items-center gap-1.5 text-xs">
              <span
                className="indicator-legend-swatch inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: ind.color }}
              />
              <span className="font-medium">{ind.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active indicator detail cards */}
      {active.size > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INDICATORS.filter((ind) => active.has(ind.key)).map((ind) => {
            const data = computedValues[ind.key];
            if (!data) return null;
            return (
              <div key={ind.key} className="rounded-xl control-surface p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{ind.label}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      data.signal === "bullish"
                        ? "bg-[color-mix(in_srgb,var(--positive)_18%,transparent)] text-[var(--positive)]"
                        : data.signal === "bearish"
                        ? "bg-[color-mix(in_srgb,var(--negative)_18%,transparent)] text-[var(--negative)]"
                        : "bg-[color-mix(in_srgb,var(--ink-muted)_18%,transparent)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {data.signal}
                  </span>
                </div>
                <div className="metric-value text-lg font-semibold font-mono" style={{ color: ind.color }}>
                  {data.value}
                </div>
                <p className="text-[11px] muted leading-relaxed">{data.detail}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawing toolbar */}
      <div className="drawing-toolbar flex items-center gap-2 pt-2 border-t border-[var(--surface-border)]">
        <MousePointer2 size={13} className="muted" />
        <span className="text-[10px] tracking-[0.12em] uppercase muted font-semibold mr-1">Drawing Tools</span>
        {DRAWING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedDrawingTool === tool.key;
          return (
            <button
              key={tool.key}
              onClick={() => setSelectedDrawingTool(isSelected ? null : tool.key)}
              className={`drawing-tool-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border transition-all ${
                isSelected
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-semibold"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              <Icon size={12} />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Drawing tool instruction */}
      {selectedDrawingTool && (
        <div className="rounded-xl control-surface p-3 text-xs muted text-center">
          <span className="font-semibold capitalize">{selectedDrawingTool}</span> tool selected. Click and drag on the chart to draw.
        </div>
      )}
    </div>
  );
}
