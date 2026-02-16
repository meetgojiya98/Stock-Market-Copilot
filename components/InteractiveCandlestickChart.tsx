"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  TrendingUp,
  Minus,
  GitBranch,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  Crosshair,
  BarChart3,
  Activity,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type DrawingTool = "crosshair" | "trendline" | "hline" | "fib" | "rect";
type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";
type Indicator = "sma20" | "sma50" | "bb";

/* ------------------------------------------------------------------ */
/*  Seeded RNG & data generation                                      */
/* ------------------------------------------------------------------ */

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function timeframeSeed(tf: Timeframe): number {
  const map: Record<Timeframe, number> = {
    "1D": 10001,
    "1W": 20002,
    "1M": 30003,
    "3M": 40004,
    "6M": 50005,
    "1Y": 60006,
  };
  return map[tf];
}

function generateCandles(tf: Timeframe, count: number = 60): Candle[] {
  const rng = seededRng(timeframeSeed(tf));
  const candles: Candle[] = [];
  let price = 150 + rng() * 50;
  const baseDate = new Date(2025, 0, 2);

  const dayStep: Record<Timeframe, number> = {
    "1D": 1,
    "1W": 7,
    "1M": 30,
    "3M": 1,
    "6M": 1,
    "1Y": 5,
  };

  for (let i = 0; i < count; i++) {
    const drift = (rng() - 0.48) * 4;
    const volatility = 1 + rng() * 3;

    const open = price;
    const close = open + drift;
    const high = Math.max(open, close) + rng() * volatility;
    const low = Math.min(open, close) - rng() * volatility;
    const volume = Math.round(500000 + rng() * 3000000);

    const d = new Date(baseDate);
    d.setDate(d.getDate() + i * dayStep[tf]);
    const dateStr = d.toISOString().slice(0, 10);

    candles.push({
      date: dateStr,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return candles;
}

/* ------------------------------------------------------------------ */
/*  Indicator calculations                                            */
/* ------------------------------------------------------------------ */

function calcSMA(data: Candle[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    return +(sum / period).toFixed(2);
  });
}

function calcBollingerBands(
  data: Candle[],
  period: number = 20,
  mult: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calcSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (data[j].close - middle[i]!) ** 2;
    }
    const stdDev = Math.sqrt(variance / period);
    upper.push(+(middle[i]! + mult * stdDev).toFixed(2));
    lower.push(+(middle[i]! - mult * stdDev).toFixed(2));
  }
  return { upper, middle, lower };
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                */
/* ------------------------------------------------------------------ */

function formatPrice(n: number): string {
  return n.toFixed(2);
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function formatDateShort(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CHART_W = 900;
const CHART_H = 420;
const VOLUME_H = 80;
const PADDING = { top: 20, right: 70, bottom: 30, left: 10 };
const CANDLE_COLORS = { up: "#22c55e", down: "#ef4444" };

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];

const DRAWING_TOOLS: { id: DrawingTool; label: string; icon: typeof TrendingUp }[] = [
  { id: "crosshair", label: "Crosshair", icon: Crosshair },
  { id: "trendline", label: "Trendline", icon: TrendingUp },
  { id: "hline", label: "H-Line", icon: Minus },
  { id: "fib", label: "Fibonacci", icon: GitBranch },
  { id: "rect", label: "Rectangle", icon: Square },
];

const INDICATOR_LIST: { id: Indicator; label: string; color: string }[] = [
  { id: "sma20", label: "SMA 20", color: "#3b82f6" },
  { id: "sma50", label: "SMA 50", color: "#f59e0b" },
  { id: "bb", label: "Bollinger", color: "#a855f7" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function InteractiveCandlestickChart() {
  const svgRef = useRef<SVGSVGElement>(null);

  /* State */
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [activeTool, setActiveTool] = useState<DrawingTool>("crosshair");
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set(["sma20"]));
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 60,
  });
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  /* Data */
  const allCandles = useMemo(() => generateCandles(timeframe, 60), [timeframe]);

  /* Reset visible range on timeframe change */
  useEffect(() => {
    setVisibleRange({ start: 0, end: allCandles.length });
  }, [allCandles.length]);

  const visibleCandles = useMemo(
    () => allCandles.slice(visibleRange.start, visibleRange.end),
    [allCandles, visibleRange]
  );

  /* Indicators */
  const sma20 = useMemo(() => calcSMA(allCandles, 20), [allCandles]);
  const sma50 = useMemo(() => calcSMA(allCandles, 50), [allCandles]);
  const bb = useMemo(() => calcBollingerBands(allCandles, 20, 2), [allCandles]);

  /* Price range */
  const { priceMin, priceMax, volumeMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let volMax = 0;
    visibleCandles.forEach((c) => {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if (c.volume > volMax) volMax = c.volume;
    });
    const pad = (hi - lo) * 0.08;
    return { priceMin: lo - pad, priceMax: hi + pad, volumeMax: volMax };
  }, [visibleCandles]);

  /* Scale helpers */
  const plotW = CHART_W - PADDING.left - PADDING.right;
  const plotH = CHART_H - PADDING.top - PADDING.bottom;
  const candleW = visibleCandles.length > 0 ? plotW / visibleCandles.length : 1;

  const scaleX = useCallback(
    (i: number): number => PADDING.left + i * candleW + candleW / 2,
    [candleW]
  );
  const scaleY = useCallback(
    (price: number): number => {
      if (priceMax === priceMin) return PADDING.top + plotH / 2;
      return PADDING.top + (1 - (price - priceMin) / (priceMax - priceMin)) * plotH;
    },
    [priceMin, priceMax, plotH]
  );
  const scaleVolumeY = useCallback(
    (vol: number): number => {
      if (volumeMax === 0) return CHART_H + VOLUME_H;
      return CHART_H + VOLUME_H - (vol / volumeMax) * (VOLUME_H - 10);
    },
    [volumeMax]
  );

  /* Toggle indicator */
  const toggleIndicator = useCallback((id: Indicator) => {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* Mouse tracking */
  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgW = rect.width;
      const svgH = rect.height;
      const totalH = CHART_H + VOLUME_H;
      const x = ((e.clientX - rect.left) / svgW) * CHART_W;
      const y = ((e.clientY - rect.top) / svgH) * totalH;
      setMouse({ x, y });

      const idx = Math.floor((x - PADDING.left) / candleW);
      if (idx >= 0 && idx < visibleCandles.length) {
        setHoveredCandle(idx);
      } else {
        setHoveredCandle(null);
      }
    },
    [candleW, visibleCandles.length]
  );

  const handleMouseLeave = useCallback(() => {
    setMouse(null);
    setHoveredCandle(null);
  }, []);

  /* Wheel zoom */
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      setVisibleRange((prev) => {
        const range = prev.end - prev.start;
        const delta = e.deltaY > 0 ? 2 : -2;
        let newStart = prev.start + delta;
        let newEnd = prev.end - delta;
        if (newEnd - newStart < 10) return prev;
        if (newStart < 0) newStart = 0;
        if (newEnd > allCandles.length) newEnd = allCandles.length;
        if (newEnd <= newStart) return prev;
        return { start: newStart, end: newEnd };
      });
    },
    [allCandles.length]
  );

  /* Reset zoom */
  const resetZoom = useCallback(() => {
    setVisibleRange({ start: 0, end: allCandles.length });
  }, [allCandles.length]);

  /* Build indicator polylines */
  const indicatorPaths = useMemo(() => {
    const paths: { d: string; color: string; id: string; dashed?: boolean }[] = [];
    const buildPath = (values: (number | null)[], offset: number = 0): string => {
      let d = "";
      values.forEach((v, i) => {
        const absIdx = visibleRange.start + i;
        const val = values[i - offset] !== undefined ? values[absIdx] : v;
        if (val === null || absIdx < visibleRange.start || absIdx >= visibleRange.end) return;
        const localIdx = absIdx - visibleRange.start;
        const px = scaleX(localIdx);
        const py = scaleY(val);
        d += d === "" ? `M${px},${py}` : ` L${px},${py}`;
      });
      return d;
    };

    const buildPathDirect = (values: (number | null)[]): string => {
      let d = "";
      for (let i = visibleRange.start; i < visibleRange.end; i++) {
        const val = values[i];
        if (val === null) continue;
        const localIdx = i - visibleRange.start;
        const px = scaleX(localIdx);
        const py = scaleY(val);
        d += d === "" ? `M${px},${py}` : ` L${px},${py}`;
      }
      return d;
    };

    if (indicators.has("sma20")) {
      paths.push({ d: buildPathDirect(sma20), color: "#3b82f6", id: "sma20" });
    }
    if (indicators.has("sma50")) {
      paths.push({ d: buildPathDirect(sma50), color: "#f59e0b", id: "sma50" });
    }
    if (indicators.has("bb")) {
      paths.push({ d: buildPathDirect(bb.upper), color: "#a855f7", id: "bb-upper", dashed: true });
      paths.push({ d: buildPathDirect(bb.middle), color: "#a855f7", id: "bb-mid" });
      paths.push({ d: buildPathDirect(bb.lower), color: "#a855f7", id: "bb-lower", dashed: true });
    }
    return paths;
  }, [indicators, sma20, sma50, bb, visibleRange, scaleX, scaleY]);

  /* Price at mouse Y */
  const priceAtMouse = useMemo(() => {
    if (!mouse) return null;
    const ratio = 1 - (mouse.y - PADDING.top) / plotH;
    return priceMin + ratio * (priceMax - priceMin);
  }, [mouse, plotH, priceMin, priceMax]);

  /* X-axis labels (show every Nth) */
  const xAxisLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(visibleCandles.length / 8));
    return visibleCandles
      .map((c, i) => ({ label: formatDateShort(c.date), x: scaleX(i), idx: i }))
      .filter((_, i) => i % step === 0);
  }, [visibleCandles, scaleX]);

  /* Y-axis labels */
  const yAxisLabels = useMemo(() => {
    const count = 6;
    const step = (priceMax - priceMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const price = priceMin + i * step;
      return { label: formatPrice(price), y: scaleY(price) };
    });
  }, [priceMin, priceMax, scaleY]);

  /* Hovered candle info */
  const hoverInfo = hoveredCandle !== null ? visibleCandles[hoveredCandle] : null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      style={{
        background: "var(--card-bg, #1a1a2e)",
        borderRadius: 12,
        border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
        padding: "16px 20px",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 960,
        width: "100%",
      }}
    >
      {/* ----- Header info ----- */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <BarChart3 size={20} style={{ color: "#818cf8" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Interactive Candlestick Chart</span>
        {hoverInfo && (
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#94a3b8", display: "flex", gap: 14 }}>
            <span>O {formatPrice(hoverInfo.open)}</span>
            <span>H {formatPrice(hoverInfo.high)}</span>
            <span>L {formatPrice(hoverInfo.low)}</span>
            <span style={{ color: hoverInfo.close >= hoverInfo.open ? CANDLE_COLORS.up : CANDLE_COLORS.down }}>
              C {formatPrice(hoverInfo.close)}
            </span>
            <span>Vol {formatVolume(hoverInfo.volume)}</span>
          </span>
        )}
      </div>

      {/* ----- Toolbar ----- */}
      <div
        className="chart-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        {/* Timeframe group */}
        <div
          className="chart-timeframe-group"
          style={{
            display: "flex",
            gap: 2,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            padding: 2,
          }}
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className="chart-timeframe-btn"
              onClick={() => setTimeframe(tf)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                color: tf === timeframe ? "#fff" : "#94a3b8",
                background: tf === timeframe ? "rgba(99,102,241,0.5)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

        {/* Drawing tools */}
        {DRAWING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              className="chart-tool-btn"
              title={tool.label}
              onClick={() => setActiveTool(tool.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: isActive ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.04)",
                color: isActive ? "#c7d2fe" : "#94a3b8",
                transition: "all 0.15s",
              }}
            >
              <Icon size={16} />
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

        {/* Indicators dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowIndicatorMenu((p) => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
            }}
          >
            <Activity size={14} />
            Indicators
            <ChevronDown size={12} />
          </button>
          {showIndicatorMenu && (
            <div
              style={{
                position: "absolute",
                top: 36,
                left: 0,
                zIndex: 20,
                background: "#1e1e38",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 6,
                minWidth: 160,
              }}
            >
              {INDICATOR_LIST.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: 12,
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    background: indicators.has(ind.id) ? "rgba(99,102,241,0.2)" : "transparent",
                    color: "#e2e8f0",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: ind.color,
                      opacity: indicators.has(ind.id) ? 1 : 0.3,
                    }}
                  />
                  {ind.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button
            className="chart-tool-btn"
            title="Zoom in"
            onClick={() =>
              setVisibleRange((prev) => {
                const range = prev.end - prev.start;
                if (range <= 10) return prev;
                return { start: prev.start + 2, end: prev.end - 2 };
              })
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
            }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="chart-tool-btn"
            title="Zoom out"
            onClick={() =>
              setVisibleRange((prev) => {
                let s = prev.start - 2;
                let e = prev.end + 2;
                if (s < 0) s = 0;
                if (e > allCandles.length) e = allCandles.length;
                return { start: s, end: e };
              })
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
            }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="chart-tool-btn"
            title="Reset zoom"
            onClick={resetZoom}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ----- Chart Canvas ----- */}
      <div className="chart-canvas-wrap" style={{ position: "relative", overflow: "hidden", borderRadius: 8 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_W} ${CHART_H + VOLUME_H}`}
          width="100%"
          style={{ display: "block", background: "#12122a", borderRadius: 8, cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        >
          {/* Grid lines */}
          {yAxisLabels.map((ya, i) => (
            <line
              key={`grid-y-${i}`}
              x1={PADDING.left}
              x2={CHART_W - PADDING.right}
              y1={ya.y}
              y2={ya.y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {yAxisLabels.map((ya, i) => (
            <text
              key={`ya-${i}`}
              x={CHART_W - PADDING.right + 8}
              y={ya.y + 4}
              fontSize={10}
              fill="#64748b"
              fontFamily="monospace"
            >
              {ya.label}
            </text>
          ))}

          {/* X-axis labels */}
          {xAxisLabels.map((xa, i) => (
            <text
              key={`xa-${i}`}
              x={xa.x}
              y={CHART_H - 4}
              fontSize={10}
              fill="#64748b"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {xa.label}
            </text>
          ))}

          {/* Volume bars */}
          {visibleCandles.map((c, i) => {
            const barW = Math.max(1, candleW * 0.6);
            const x = scaleX(i) - barW / 2;
            const y = scaleVolumeY(c.volume);
            const h = CHART_H + VOLUME_H - y;
            const isUp = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                fill={isUp ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}
                rx={1}
              />
            );
          })}

          {/* Separator line between price and volume */}
          <line
            x1={PADDING.left}
            x2={CHART_W - PADDING.right}
            y1={CHART_H}
            y2={CHART_H}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />

          {/* Bollinger Band fill */}
          {indicators.has("bb") && (() => {
            let fillD = "";
            const upperPts: string[] = [];
            const lowerPts: string[] = [];
            for (let i = visibleRange.start; i < visibleRange.end; i++) {
              if (bb.upper[i] === null || bb.lower[i] === null) continue;
              const localIdx = i - visibleRange.start;
              const px = scaleX(localIdx);
              upperPts.push(`${px},${scaleY(bb.upper[i]!)}`);
              lowerPts.push(`${px},${scaleY(bb.lower[i]!)}`);
            }
            if (upperPts.length > 1) {
              fillD = `M${upperPts.join(" L")} L${lowerPts.reverse().join(" L")} Z`;
            }
            return fillD ? (
              <path d={fillD} fill="rgba(168,85,247,0.06)" />
            ) : null;
          })()}

          {/* Indicator lines */}
          {indicatorPaths.map((p) =>
            p.d ? (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={1.5}
                strokeDasharray={p.dashed ? "4 3" : undefined}
                opacity={0.8}
              />
            ) : null
          )}

          {/* Candlesticks */}
          {visibleCandles.map((c, i) => {
            const isUp = c.close >= c.open;
            const color = isUp ? CANDLE_COLORS.up : CANDLE_COLORS.down;
            const bodyW = Math.max(1, candleW * 0.55);
            const x = scaleX(i);
            const bodyTop = scaleY(Math.max(c.open, c.close));
            const bodyBot = scaleY(Math.min(c.open, c.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);

            return (
              <g key={`candle-${i}`}>
                {/* Wick */}
                <line
                  x1={x}
                  x2={x}
                  y1={scaleY(c.high)}
                  y2={scaleY(c.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* Body */}
                <rect
                  x={x - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyH}
                  fill={isUp ? color : color}
                  stroke={color}
                  strokeWidth={0.5}
                  rx={1}
                  opacity={isUp ? 0.85 : 0.9}
                />
              </g>
            );
          })}

          {/* Crosshair */}
          {mouse && activeTool === "crosshair" && mouse.y < CHART_H && (
            <g>
              {/* Vertical line */}
              <line
                x1={mouse.x}
                x2={mouse.x}
                y1={PADDING.top}
                y2={CHART_H + VOLUME_H}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="3 3"
                strokeWidth={0.5}
              />
              {/* Horizontal line */}
              <line
                x1={PADDING.left}
                x2={CHART_W - PADDING.right}
                y1={mouse.y}
                y2={mouse.y}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="3 3"
                strokeWidth={0.5}
              />
              {/* Price label on right */}
              {priceAtMouse !== null && (
                <g className="chart-crosshair-label">
                  <rect
                    x={CHART_W - PADDING.right + 2}
                    y={mouse.y - 10}
                    width={60}
                    height={20}
                    fill="rgba(99,102,241,0.7)"
                    rx={4}
                  />
                  <text
                    x={CHART_W - PADDING.right + 32}
                    y={mouse.y + 4}
                    fontSize={10}
                    fill="#fff"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {formatPrice(priceAtMouse)}
                  </text>
                </g>
              )}
              {/* Date label on bottom */}
              {hoveredCandle !== null && (
                <g className="chart-crosshair-label">
                  <rect
                    x={scaleX(hoveredCandle) - 32}
                    y={CHART_H - 2}
                    width={64}
                    height={18}
                    fill="rgba(99,102,241,0.7)"
                    rx={4}
                  />
                  <text
                    x={scaleX(hoveredCandle)}
                    y={CHART_H + 12}
                    fontSize={9}
                    fill="#fff"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {visibleCandles[hoveredCandle].date}
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Active tool indicator label */}
          <text
            x={PADDING.left + 4}
            y={PADDING.top + 12}
            fontSize={10}
            fill="#64748b"
            fontFamily="monospace"
          >
            Tool: {activeTool.toUpperCase()}
          </text>
        </svg>
      </div>

      {/* ----- Active indicators legend ----- */}
      {indicators.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          {INDICATOR_LIST.filter((ind) => indicators.has(ind.id)).map((ind) => (
            <span key={ind.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 2,
                  background: ind.color,
                  borderRadius: 1,
                }}
              />
              {ind.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
