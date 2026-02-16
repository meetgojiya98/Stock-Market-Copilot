"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OHLCData = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type PatternType =
  | "double-top"
  | "double-bottom"
  | "head-shoulders"
  | "ascending-triangle"
  | "bull-flag";

type DetectedPattern = {
  type: PatternType;
  label: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  recommendation: "Bullish" | "Bearish" | "Neutral";
  description: string;
};

type PatternRecognitionProps = {
  data?: OHLCData[];
  width?: number;
  height?: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PATTERN_META: Record<
  PatternType,
  { label: string; recommendation: "Bullish" | "Bearish" | "Neutral"; description: string }
> = {
  "double-top": {
    label: "Double Top",
    recommendation: "Bearish",
    description:
      "Two consecutive peaks at roughly the same price level, suggesting resistance and potential reversal downward.",
  },
  "double-bottom": {
    label: "Double Bottom",
    recommendation: "Bullish",
    description:
      "Two consecutive troughs at roughly the same price level, suggesting support and potential reversal upward.",
  },
  "head-shoulders": {
    label: "Head & Shoulders",
    recommendation: "Bearish",
    description:
      "Three peaks where the middle peak is the highest, suggesting a trend reversal from bullish to bearish.",
  },
  "ascending-triangle": {
    label: "Ascending Triangle",
    recommendation: "Bullish",
    description:
      "Rising lower trendline converging with flat upper resistance. Typically breaks out upward.",
  },
  "bull-flag": {
    label: "Bull Flag",
    recommendation: "Bullish",
    description:
      "Sharp upward move followed by a slight downward consolidation channel. Continuation pattern.",
  },
};

const LS_KEY = "smc_pattern_recognition_visible";
const LS_EXPANDED_KEY = "smc_pattern_recognition_expanded";

/* ------------------------------------------------------------------ */
/*  Seeded RNG                                                         */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockOHLC(count: number, seed: number = 42): OHLCData[] {
  const rng = seeded(seed);
  const data: OHLCData[] = [];
  let price = 150;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const volatility = 1.5 + rng() * 2;
    const drift = (rng() - 0.48) * volatility;
    const open = price;
    const close = open + drift;
    const highExtra = rng() * volatility * 0.8;
    const lowExtra = rng() * volatility * 0.8;
    const high = Math.max(open, close) + highExtra;
    const low = Math.min(open, close) - lowExtra;

    const d = new Date(now - (count - i) * 86400000);
    data.push({
      date: d.toISOString().slice(0, 10),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });
    price = close;
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Pattern detection heuristics                                       */
/* ------------------------------------------------------------------ */

function findLocalExtrema(
  data: OHLCData[],
  windowSize: number = 3
): { peaks: number[]; troughs: number[] } {
  const peaks: number[] = [];
  const troughs: number[] = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    let isPeak = true;
    let isTrough = true;

    for (let j = 1; j <= windowSize; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isPeak = false;
      }
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isTrough = false;
      }
    }

    if (isPeak) peaks.push(i);
    if (isTrough) troughs.push(i);
  }

  return { peaks, troughs };
}

function detectPatterns(data: OHLCData[]): DetectedPattern[] {
  if (data.length < 15) return [];

  const patterns: DetectedPattern[] = [];
  const { peaks, troughs } = findLocalExtrema(data, 3);

  // Double Top: two peaks within 2% of each other
  for (let i = 0; i < peaks.length - 1; i++) {
    const p1 = peaks[i];
    const p2 = peaks[i + 1];
    const h1 = data[p1].high;
    const h2 = data[p2].high;
    const diff = Math.abs(h1 - h2) / Math.max(h1, h2);

    if (diff < 0.02 && p2 - p1 >= 5 && p2 - p1 <= 25) {
      const confidence = Math.round((1 - diff / 0.02) * 30 + 60);
      patterns.push({
        type: "double-top",
        label: PATTERN_META["double-top"].label,
        confidence: Math.min(confidence, 95),
        startIndex: Math.max(0, p1 - 2),
        endIndex: Math.min(data.length - 1, p2 + 2),
        recommendation: PATTERN_META["double-top"].recommendation,
        description: PATTERN_META["double-top"].description,
      });
      break;
    }
  }

  // Double Bottom: two troughs within 2% of each other
  for (let i = 0; i < troughs.length - 1; i++) {
    const t1 = troughs[i];
    const t2 = troughs[i + 1];
    const l1 = data[t1].low;
    const l2 = data[t2].low;
    const diff = Math.abs(l1 - l2) / Math.max(l1, l2);

    if (diff < 0.02 && t2 - t1 >= 5 && t2 - t1 <= 25) {
      const confidence = Math.round((1 - diff / 0.02) * 30 + 60);
      patterns.push({
        type: "double-bottom",
        label: PATTERN_META["double-bottom"].label,
        confidence: Math.min(confidence, 95),
        startIndex: Math.max(0, t1 - 2),
        endIndex: Math.min(data.length - 1, t2 + 2),
        recommendation: PATTERN_META["double-bottom"].recommendation,
        description: PATTERN_META["double-bottom"].description,
      });
      break;
    }
  }

  // Head & Shoulders: three peaks, middle highest
  for (let i = 0; i < peaks.length - 2; i++) {
    const [p1, p2, p3] = [peaks[i], peaks[i + 1], peaks[i + 2]];
    const [h1, h2, h3] = [data[p1].high, data[p2].high, data[p3].high];

    if (h2 > h1 && h2 > h3 && Math.abs(h1 - h3) / h2 < 0.05) {
      const dominance = (h2 - Math.max(h1, h3)) / h2;
      const symmetry = 1 - Math.abs(h1 - h3) / Math.max(h1, h3);
      const confidence = Math.round(
        Math.min((dominance * 200 + symmetry * 50 + 40), 95)
      );
      if (confidence > 50) {
        patterns.push({
          type: "head-shoulders",
          label: PATTERN_META["head-shoulders"].label,
          confidence,
          startIndex: Math.max(0, p1 - 2),
          endIndex: Math.min(data.length - 1, p3 + 2),
          recommendation: PATTERN_META["head-shoulders"].recommendation,
          description: PATTERN_META["head-shoulders"].description,
        });
        break;
      }
    }
  }

  // Ascending Triangle: rising lows, flat highs
  if (troughs.length >= 3 && peaks.length >= 2) {
    const lastTroughs = troughs.slice(-3);
    const lastPeaks = peaks.slice(-2);

    const lowsRising =
      data[lastTroughs[1]].low > data[lastTroughs[0]].low &&
      data[lastTroughs[2]].low > data[lastTroughs[1]].low;

    const highsFlat =
      Math.abs(data[lastPeaks[0]].high - data[lastPeaks[1]].high) /
        data[lastPeaks[0]].high <
      0.02;

    if (lowsRising && highsFlat) {
      const riseRate =
        (data[lastTroughs[2]].low - data[lastTroughs[0]].low) /
        data[lastTroughs[0]].low;
      const confidence = Math.round(Math.min(riseRate * 500 + 55, 92));
      patterns.push({
        type: "ascending-triangle",
        label: PATTERN_META["ascending-triangle"].label,
        confidence,
        startIndex: Math.max(0, lastTroughs[0] - 2),
        endIndex: Math.min(data.length - 1, lastTroughs[2] + 2),
        recommendation: PATTERN_META["ascending-triangle"].recommendation,
        description: PATTERN_META["ascending-triangle"].description,
      });
    }
  }

  // Bull Flag: sharp rise then consolidation
  if (data.length >= 20) {
    for (let i = 5; i < data.length - 10; i++) {
      const riseStart = i - 5;
      const riseEnd = i;
      const rise =
        (data[riseEnd].close - data[riseStart].close) /
        data[riseStart].close;

      if (rise > 0.06) {
        const consolidation = data.slice(riseEnd, riseEnd + 8);
        if (consolidation.length >= 5) {
          const consRange =
            Math.max(...consolidation.map((d) => d.high)) -
            Math.min(...consolidation.map((d) => d.low));
          const consRatio = consRange / data[riseEnd].close;

          if (consRatio < 0.04) {
            const confidence = Math.round(
              Math.min((rise * 300 + (1 - consRatio / 0.04) * 40 + 30), 93)
            );
            patterns.push({
              type: "bull-flag",
              label: PATTERN_META["bull-flag"].label,
              confidence,
              startIndex: riseStart,
              endIndex: Math.min(data.length - 1, riseEnd + 8),
              recommendation: PATTERN_META["bull-flag"].recommendation,
              description: PATTERN_META["bull-flag"].description,
            });
            break;
          }
        }
      }
    }
  }

  return patterns;
}

/* ------------------------------------------------------------------ */
/*  SVG Candlestick helpers                                            */
/* ------------------------------------------------------------------ */

const CHART_WIDTH = 560;
const CHART_HEIGHT = 280;
const PAD_X = 45;
const PAD_Y = 25;
const INNER_W = CHART_WIDTH - PAD_X * 2;
const INNER_H = CHART_HEIGHT - PAD_Y * 2;

function priceToY(price: number, minP: number, rangeP: number): number {
  return PAD_Y + (1 - (price - minP) / rangeP) * INNER_H;
}

function indexToX(i: number, total: number): number {
  return PAD_X + (i / Math.max(total - 1, 1)) * INNER_W;
}

/* ------------------------------------------------------------------ */
/*  PatternRecognition Component                                       */
/* ------------------------------------------------------------------ */

export default function PatternRecognition({
  data: dataProp,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
}: PatternRecognitionProps) {
  const [showOverlays, setShowOverlays] = useState(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      return v !== null ? v === "true" : true;
    } catch {
      return true;
    }
  });

  const [expandedPattern, setExpandedPattern] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_EXPANDED_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(showOverlays));
    } catch {
      /* noop */
    }
  }, [showOverlays]);

  useEffect(() => {
    try {
      if (expandedPattern) {
        localStorage.setItem(LS_EXPANDED_KEY, expandedPattern);
      } else {
        localStorage.removeItem(LS_EXPANDED_KEY);
      }
    } catch {
      /* noop */
    }
  }, [expandedPattern]);

  const data = useMemo(
    () =>
      dataProp && dataProp.length > 0
        ? dataProp
        : generateMockOHLC(60, 42),
    [dataProp]
  );

  const patterns = useMemo(() => detectPatterns(data), [data]);

  const { minP, maxP, rangeP } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of data) {
      if (d.low < lo) lo = d.low;
      if (d.high > hi) hi = d.high;
    }
    const padding = (hi - lo) * 0.06;
    lo -= padding;
    hi += padding;
    return { minP: lo, maxP: hi, rangeP: hi - lo || 1 };
  }, [data]);

  const candleWidth = useMemo(
    () => Math.max(2, Math.min(8, INNER_W / data.length - 1)),
    [data.length]
  );

  const yLabels = useMemo(() => {
    const count = 6;
    const labels: { y: number; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const val = minP + ratio * rangeP;
      const y = priceToY(val, minP, rangeP);
      labels.push({ y, label: `$${val.toFixed(1)}` });
    }
    return labels;
  }, [minP, rangeP]);

  const toggleExpanded = useCallback(
    (key: string) => {
      setExpandedPattern((prev) => (prev === key ? null : key));
    },
    []
  );

  const recommendationIcon = (rec: string) => {
    if (rec === "Bullish")
      return <TrendingUp size={13} strokeWidth={2.5} style={{ color: "var(--positive)" }} />;
    if (rec === "Bearish")
      return <TrendingDown size={13} strokeWidth={2.5} style={{ color: "var(--negative)" }} />;
    return <AlertTriangle size={13} strokeWidth={2.5} style={{ color: "var(--warning, var(--ink-muted))" }} />;
  };

  const recommendationColor = (rec: string) => {
    if (rec === "Bullish") return "var(--positive)";
    if (rec === "Bearish") return "var(--negative)";
    return "var(--ink-muted)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Pattern Recognition
          {patterns.length > 0 && (
            <span
              style={{
                marginLeft: "0.4rem",
                fontSize: "0.65rem",
                fontWeight: 600,
                color: "var(--accent)",
                background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                padding: "0.1rem 0.35rem",
                borderRadius: "0.25rem",
              }}
            >
              {patterns.length} found
            </span>
          )}
        </span>

        <button
          onClick={() => setShowOverlays((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.2rem 0.5rem",
            borderRadius: "0.3rem",
            fontSize: "0.68rem",
            fontWeight: 600,
            border: "1px solid var(--surface-border)",
            background: showOverlays
              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
              : "transparent",
            color: showOverlays ? "var(--accent)" : "var(--ink-muted)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          title={showOverlays ? "Hide pattern overlays" : "Show pattern overlays"}
        >
          {showOverlays ? <Eye size={13} /> : <EyeOff size={13} />}
          {showOverlays ? "Overlays On" : "Overlays Off"}
        </button>
      </div>

      {/* SVG Chart */}
      <div style={{ position: "relative" }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          style={{
            borderRadius: "0.5rem",
            background: "var(--bg-canvas)",
            border: "1px solid var(--surface-border)",
            display: "block",
            maxWidth: "100%",
          }}
        >
          {/* Y-axis grid + labels */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line
                x1={PAD_X}
                x2={CHART_WIDTH - PAD_X}
                y1={yl.y}
                y2={yl.y}
                stroke="var(--surface-border)"
                strokeWidth={0.5}
              />
              <text
                x={PAD_X - 5}
                y={yl.y + 3}
                textAnchor="end"
                fill="var(--ink-muted)"
                fontSize={8.5}
                fontWeight={500}
                fontFamily="inherit"
              >
                {yl.label}
              </text>
            </g>
          ))}

          {/* Pattern highlight zones */}
          {showOverlays &&
            patterns.map((p, pi) => {
              const x1 = indexToX(p.startIndex, data.length);
              const x2 = indexToX(p.endIndex, data.length);
              const sliceData = data.slice(p.startIndex, p.endIndex + 1);
              const sliceHigh = Math.max(...sliceData.map((d) => d.high));
              const sliceLow = Math.min(...sliceData.map((d) => d.low));
              const y1 = priceToY(sliceHigh, minP, rangeP) - 4;
              const y2 = priceToY(sliceLow, minP, rangeP) + 4;

              return (
                <g key={`pattern-${pi}`}>
                  <rect
                    className="pattern-highlight"
                    x={x1 - 4}
                    y={y1}
                    width={x2 - x1 + 8}
                    height={y2 - y1}
                    rx={3}
                  />
                  <text
                    className="pattern-label"
                    x={(x1 + x2) / 2}
                    y={y1 - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="var(--accent)"
                  >
                    {p.label}
                  </text>
                  <text
                    className="pattern-confidence"
                    x={(x1 + x2) / 2}
                    y={y1 - 6}
                    dx={p.label.length * 3 + 8}
                    textAnchor="start"
                    fontSize={8}
                    fill="var(--accent)"
                    opacity={0.7}
                  >
                    {p.confidence}%
                  </text>
                </g>
              );
            })}

          {/* Candlesticks */}
          {data.map((d, i) => {
            const x = indexToX(i, data.length);
            const yOpen = priceToY(d.open, minP, rangeP);
            const yClose = priceToY(d.close, minP, rangeP);
            const yHigh = priceToY(d.high, minP, rangeP);
            const yLow = priceToY(d.low, minP, rangeP);
            const bullish = d.close >= d.open;
            const color = bullish ? "var(--positive)" : "var(--negative)";
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yOpen - yClose), 0.5);
            const halfW = candleWidth / 2;

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x}
                  x2={x}
                  y1={yHigh}
                  y2={yLow}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* Body */}
                <rect
                  x={x - halfW}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={bullish ? color : color}
                  stroke={color}
                  strokeWidth={0.5}
                  rx={0.5}
                />
              </g>
            );
          })}

          {/* X-axis date labels */}
          {data
            .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
            .map((d, i, arr) => {
              const dataIdx = data.indexOf(d);
              const x = indexToX(dataIdx, data.length);
              return (
                <text
                  key={i}
                  x={x}
                  y={CHART_HEIGHT - 6}
                  textAnchor="middle"
                  fill="var(--ink-muted)"
                  fontSize={8}
                  fontWeight={500}
                  fontFamily="inherit"
                >
                  {d.date.slice(5)}
                </text>
              );
            })}
        </svg>
      </div>

      {/* Pattern summary cards */}
      {patterns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--ink-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Detected Patterns
          </span>

          {patterns.map((p, pi) => {
            const key = `${p.type}-${pi}`;
            const isExpanded = expandedPattern === key;
            return (
              <div
                key={key}
                style={{
                  border: "1px solid var(--surface-border)",
                  borderRadius: "0.45rem",
                  background: "var(--surface-emphasis)",
                  overflow: "hidden",
                  transition: "border-color 0.15s",
                }}
              >
                <button
                  onClick={() => toggleExpanded(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    padding: "0.5rem 0.65rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--ink)",
                    textAlign: "left",
                    fontSize: "0.75rem",
                  }}
                >
                  {recommendationIcon(p.recommendation)}

                  <span style={{ fontWeight: 700, flex: 1 }}>{p.label}</span>

                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: recommendationColor(p.recommendation),
                      background: `color-mix(in srgb, ${recommendationColor(p.recommendation)} 10%, transparent)`,
                      padding: "0.1rem 0.35rem",
                      borderRadius: "0.2rem",
                    }}
                  >
                    {p.recommendation}
                  </span>

                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                      minWidth: "2.5rem",
                      textAlign: "right",
                    }}
                  >
                    {p.confidence}%
                  </span>

                  {isExpanded ? (
                    <ChevronUp size={13} style={{ color: "var(--ink-muted)" }} />
                  ) : (
                    <ChevronDown size={13} style={{ color: "var(--ink-muted)" }} />
                  )}
                </button>

                {isExpanded && (
                  <div
                    style={{
                      padding: "0 0.65rem 0.55rem",
                      fontSize: "0.7rem",
                      color: "var(--ink-muted)",
                      lineHeight: 1.55,
                      borderTop: "1px solid var(--surface-border)",
                      paddingTop: "0.45rem",
                    }}
                  >
                    {p.description}
                    <div
                      style={{
                        marginTop: "0.35rem",
                        fontSize: "0.65rem",
                        color: "var(--ink-muted)",
                        opacity: 0.7,
                      }}
                    >
                      Data points {p.startIndex}&ndash;{p.endIndex} ({data[p.startIndex]?.date} to{" "}
                      {data[p.endIndex]?.date})
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {patterns.length === 0 && (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--ink-muted)",
            fontSize: "0.75rem",
            border: "1px solid var(--surface-border)",
            borderRadius: "0.45rem",
            background: "var(--surface-emphasis)",
          }}
        >
          No chart patterns detected in the current data range.
        </div>
      )}
    </div>
  );
}
