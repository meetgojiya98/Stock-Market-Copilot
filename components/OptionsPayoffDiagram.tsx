"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Target, DollarSign, TrendingUp, TrendingDown, Info } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StrategyId =
  | "long_call"
  | "long_put"
  | "bull_call_spread"
  | "bear_put_spread"
  | "iron_condor"
  | "straddle"
  | "strangle";

type StrategyDef = {
  id: StrategyId;
  label: string;
  description: string;
  fields: StrategyField[];
};

type StrategyField = {
  key: string;
  label: string;
  defaultValue: number;
  step: number;
  min: number;
  max: number;
};

type PayoffPoint = {
  stockPrice: number;
  pnl: number;
};

type BreakevenInfo = {
  prices: number[];
  maxProfit: number | "Unlimited";
  maxLoss: number;
};

/* ------------------------------------------------------------------ */
/*  Strategy definitions                                              */
/* ------------------------------------------------------------------ */

const STRATEGIES: StrategyDef[] = [
  {
    id: "long_call",
    label: "Long Call",
    description: "Buy a call option. Profit when stock rises above strike + premium.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "strike", label: "Strike", defaultValue: 190, step: 1, min: 50, max: 500 },
      { key: "premium", label: "Premium", defaultValue: 5.5, step: 0.5, min: 0.5, max: 50 },
    ],
  },
  {
    id: "long_put",
    label: "Long Put",
    description: "Buy a put option. Profit when stock falls below strike - premium.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "strike", label: "Strike", defaultValue: 180, step: 1, min: 50, max: 500 },
      { key: "premium", label: "Premium", defaultValue: 4.5, step: 0.5, min: 0.5, max: 50 },
    ],
  },
  {
    id: "bull_call_spread",
    label: "Bull Call Spread",
    description: "Buy lower strike call, sell higher strike call. Limited profit & loss.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "strikeLow", label: "Lower Strike", defaultValue: 180, step: 1, min: 50, max: 500 },
      { key: "strikeHigh", label: "Upper Strike", defaultValue: 195, step: 1, min: 50, max: 500 },
      { key: "premiumBuy", label: "Premium Paid", defaultValue: 8, step: 0.5, min: 0.5, max: 50 },
      { key: "premiumSell", label: "Premium Recv", defaultValue: 3, step: 0.5, min: 0.5, max: 50 },
    ],
  },
  {
    id: "bear_put_spread",
    label: "Bear Put Spread",
    description: "Buy higher strike put, sell lower strike put. Bearish limited risk.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "strikeHigh", label: "Upper Strike", defaultValue: 190, step: 1, min: 50, max: 500 },
      { key: "strikeLow", label: "Lower Strike", defaultValue: 175, step: 1, min: 50, max: 500 },
      { key: "premiumBuy", label: "Premium Paid", defaultValue: 7, step: 0.5, min: 0.5, max: 50 },
      { key: "premiumSell", label: "Premium Recv", defaultValue: 2.5, step: 0.5, min: 0.5, max: 50 },
    ],
  },
  {
    id: "iron_condor",
    label: "Iron Condor",
    description: "Sell OTM put spread + sell OTM call spread. Profit in a range.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "putBuy", label: "Put Buy Strike", defaultValue: 165, step: 1, min: 50, max: 500 },
      { key: "putSell", label: "Put Sell Strike", defaultValue: 175, step: 1, min: 50, max: 500 },
      { key: "callSell", label: "Call Sell Strike", defaultValue: 195, step: 1, min: 50, max: 500 },
      { key: "callBuy", label: "Call Buy Strike", defaultValue: 205, step: 1, min: 50, max: 500 },
      { key: "netCredit", label: "Net Credit", defaultValue: 3.5, step: 0.5, min: 0.5, max: 20 },
    ],
  },
  {
    id: "straddle",
    label: "Straddle",
    description: "Buy call + put at same strike. Profit from large move either way.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "strike", label: "Strike", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "callPremium", label: "Call Premium", defaultValue: 6, step: 0.5, min: 0.5, max: 50 },
      { key: "putPremium", label: "Put Premium", defaultValue: 5.5, step: 0.5, min: 0.5, max: 50 },
    ],
  },
  {
    id: "strangle",
    label: "Strangle",
    description: "Buy OTM call + OTM put. Cheaper straddle, needs bigger move.",
    fields: [
      { key: "underlying", label: "Underlying", defaultValue: 185, step: 1, min: 50, max: 500 },
      { key: "callStrike", label: "Call Strike", defaultValue: 195, step: 1, min: 50, max: 500 },
      { key: "putStrike", label: "Put Strike", defaultValue: 175, step: 1, min: 50, max: 500 },
      { key: "callPremium", label: "Call Premium", defaultValue: 3, step: 0.5, min: 0.5, max: 50 },
      { key: "putPremium", label: "Put Premium", defaultValue: 3, step: 0.5, min: 0.5, max: 50 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Payoff calculation                                                */
/* ------------------------------------------------------------------ */

function calcPayoff(
  stratId: StrategyId,
  params: Record<string, number>,
  priceRange: [number, number],
  steps: number = 200
): { points: PayoffPoint[]; breakevens: number[]; maxProfit: number | "Unlimited"; maxLoss: number } {
  const points: PayoffPoint[] = [];
  const [lo, hi] = priceRange;
  const step = (hi - lo) / steps;

  const calcPnl = (S: number): number => {
    switch (stratId) {
      case "long_call":
        return Math.max(S - params.strike, 0) - params.premium;
      case "long_put":
        return Math.max(params.strike - S, 0) - params.premium;
      case "bull_call_spread": {
        const longCall = Math.max(S - params.strikeLow, 0);
        const shortCall = Math.max(S - params.strikeHigh, 0);
        return longCall - shortCall - (params.premiumBuy - params.premiumSell);
      }
      case "bear_put_spread": {
        const longPut = Math.max(params.strikeHigh - S, 0);
        const shortPut = Math.max(params.strikeLow - S, 0);
        return longPut - shortPut - (params.premiumBuy - params.premiumSell);
      }
      case "iron_condor": {
        const shortPut = -Math.max(params.putSell - S, 0);
        const longPut = Math.max(params.putBuy - S, 0);
        const shortCall = -Math.max(S - params.callSell, 0);
        const longCall = Math.max(S - params.callBuy, 0);
        return shortPut + longPut + shortCall + longCall + params.netCredit;
      }
      case "straddle": {
        const call = Math.max(S - params.strike, 0);
        const put = Math.max(params.strike - S, 0);
        return call + put - params.callPremium - params.putPremium;
      }
      case "strangle": {
        const call = Math.max(S - params.callStrike, 0);
        const put = Math.max(params.putStrike - S, 0);
        return call + put - params.callPremium - params.putPremium;
      }
      default:
        return 0;
    }
  };

  for (let i = 0; i <= steps; i++) {
    const S = lo + i * step;
    points.push({ stockPrice: +S.toFixed(2), pnl: +calcPnl(S).toFixed(2) });
  }

  // Find breakevens (where PnL crosses 0)
  const breakevens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (
      (points[i - 1].pnl <= 0 && points[i].pnl >= 0) ||
      (points[i - 1].pnl >= 0 && points[i].pnl <= 0)
    ) {
      // Linear interpolation
      const ratio =
        Math.abs(points[i - 1].pnl) /
        (Math.abs(points[i - 1].pnl) + Math.abs(points[i].pnl));
      const be = points[i - 1].stockPrice + ratio * step;
      breakevens.push(+be.toFixed(2));
    }
  }

  const pnlValues = points.map((p) => p.pnl);
  const rawMax = Math.max(...pnlValues);
  const rawMin = Math.min(...pnlValues);

  // Determine if unlimited profit
  const isUnlimited =
    stratId === "long_call" ||
    stratId === "long_put" ||
    stratId === "straddle" ||
    stratId === "strangle";

  return {
    points,
    breakevens,
    maxProfit: isUnlimited ? "Unlimited" : +rawMax.toFixed(2),
    maxLoss: +Math.abs(rawMin).toFixed(2),
  };
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                        */
/* ------------------------------------------------------------------ */

function formatDollar(n: number): string {
  return "$" + n.toFixed(2);
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CHART_W = 860;
const CHART_H = 340;
const PAD = { top: 20, right: 60, bottom: 35, left: 60 };

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function OptionsPayoffDiagram() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>("long_call");
  const [params, setParams] = useState<Record<string, number>>({});

  /* Initialize params from strategy defaults */
  const stratDef = useMemo(
    () => STRATEGIES.find((s) => s.id === selectedStrategy)!,
    [selectedStrategy]
  );

  useEffect(() => {
    const defaults: Record<string, number> = {};
    stratDef.fields.forEach((f) => {
      defaults[f.key] = f.defaultValue;
    });
    setParams(defaults);
  }, [stratDef]);

  /* Compute price range based on underlying */
  const priceRange = useMemo<[number, number]>(() => {
    const underlying = params.underlying ?? 185;
    return [underlying * 0.7, underlying * 1.3];
  }, [params.underlying]);

  /* Compute payoff */
  const payoff = useMemo(() => {
    if (Object.keys(params).length === 0) return null;
    return calcPayoff(selectedStrategy, params, priceRange, 200);
  }, [selectedStrategy, params, priceRange]);

  /* Update a single param */
  const updateParam = useCallback((key: string, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  }, []);

  /* SVG scales */
  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;

  const { scaleX, scaleY, pnlMin, pnlMax } = useMemo(() => {
    if (!payoff || payoff.points.length === 0) {
      return {
        scaleX: (_: number) => PAD.left,
        scaleY: (_: number) => PAD.top,
        pnlMin: -10,
        pnlMax: 10,
      };
    }
    const pnls = payoff.points.map((p) => p.pnl);
    let lo = Math.min(...pnls);
    let hi = Math.max(...pnls);
    const pad = Math.max(2, (hi - lo) * 0.1);
    lo -= pad;
    hi += pad;

    return {
      scaleX: (price: number) =>
        PAD.left + ((price - priceRange[0]) / (priceRange[1] - priceRange[0])) * plotW,
      scaleY: (pnl: number) => PAD.top + (1 - (pnl - lo) / (hi - lo)) * plotH,
      pnlMin: lo,
      pnlMax: hi,
    };
  }, [payoff, priceRange, plotW, plotH]);

  /* Build SVG paths */
  const { profitPath, lossPath, linePath, zeroY } = useMemo(() => {
    if (!payoff || payoff.points.length === 0) {
      return { profitPath: "", lossPath: "", linePath: "", zeroY: 0 };
    }

    const zy = scaleY(0);
    let line = "";
    let profit = "";
    let loss = "";

    payoff.points.forEach((pt, i) => {
      const x = scaleX(pt.stockPrice);
      const y = scaleY(pt.pnl);
      line += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });

    // Build profit fill (above zero)
    let pSegments: string[] = [];
    let lSegments: string[] = [];
    let currentProfit = "";
    let currentLoss = "";

    payoff.points.forEach((pt, i) => {
      const x = scaleX(pt.stockPrice);
      const y = scaleY(pt.pnl);

      if (pt.pnl >= 0) {
        if (!currentProfit) {
          currentProfit = `M${x},${zy} L${x},${y}`;
        } else {
          currentProfit += ` L${x},${y}`;
        }
        if (currentLoss) {
          currentLoss += ` L${x},${zy} Z`;
          lSegments.push(currentLoss);
          currentLoss = "";
        }
      } else {
        if (!currentLoss) {
          currentLoss = `M${x},${zy} L${x},${y}`;
        } else {
          currentLoss += ` L${x},${y}`;
        }
        if (currentProfit) {
          currentProfit += ` L${x},${zy} Z`;
          pSegments.push(currentProfit);
          currentProfit = "";
        }
      }
    });

    if (currentProfit) {
      const lastPt = payoff.points[payoff.points.length - 1];
      currentProfit += ` L${scaleX(lastPt.stockPrice)},${zy} Z`;
      pSegments.push(currentProfit);
    }
    if (currentLoss) {
      const lastPt = payoff.points[payoff.points.length - 1];
      currentLoss += ` L${scaleX(lastPt.stockPrice)},${zy} Z`;
      lSegments.push(currentLoss);
    }

    return {
      profitPath: pSegments.join(" "),
      lossPath: lSegments.join(" "),
      linePath: line,
      zeroY: zy,
    };
  }, [payoff, scaleX, scaleY]);

  /* Y-axis labels */
  const yLabels = useMemo(() => {
    const count = 6;
    const step = (pnlMax - pnlMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const val = pnlMin + i * step;
      return { label: formatDollar(val), y: scaleY(val), val };
    });
  }, [pnlMin, pnlMax, scaleY]);

  /* X-axis labels */
  const xLabels = useMemo(() => {
    const count = 8;
    const step = (priceRange[1] - priceRange[0]) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const val = priceRange[0] + i * step;
      return { label: formatDollar(val), x: scaleX(val) };
    });
  }, [priceRange, scaleX]);

  if (!payoff) return null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className="payoff-container"
      style={{
        background: "var(--card-bg, #1a1a2e)",
        borderRadius: 12,
        border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
        padding: "16px 20px",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 920,
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Target size={20} style={{ color: "#818cf8" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Options Payoff Diagram</span>
      </div>

      {/* Strategy chips */}
      <div
        className="payoff-strategy-chips"
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            className="payoff-chip"
            onClick={() => setSelectedStrategy(s.id)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              background:
                s.id === selectedStrategy
                  ? "rgba(99,102,241,0.5)"
                  : "rgba(255,255,255,0.04)",
              color: s.id === selectedStrategy ? "#e0e7ff" : "#94a3b8",
              transition: "all 0.15s",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "8px 12px",
          background: "rgba(99,102,241,0.06)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "#94a3b8",
        }}
      >
        <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
        {stratDef.description}
      </div>

      {/* Input fields */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
          gap: 8,
          marginBottom: 14,
        }}
      >
        {stratDef.fields.map((f) => (
          <div key={f.key}>
            <label
              style={{
                display: "block",
                fontSize: 10,
                color: "#64748b",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              {f.label}
            </label>
            <input
              type="number"
              value={params[f.key] ?? f.defaultValue}
              step={f.step}
              min={f.min}
              max={f.max}
              onChange={(e) => updateParam(f.key, parseFloat(e.target.value) || f.defaultValue)}
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: 13,
                fontFamily: "monospace",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#e2e8f0",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>

      {/* Payoff chart */}
      <div className="payoff-chart" style={{ borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          style={{ display: "block", background: "#12122a", borderRadius: 8 }}
        >
          {/* Grid */}
          {yLabels.map((yl, i) => (
            <g key={`yg-${i}`}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={yl.y}
                y2={yl.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
              <text
                x={PAD.left - 8}
                y={yl.y + 4}
                fontSize={9}
                fill="#4a5568"
                textAnchor="end"
                fontFamily="monospace"
              >
                {yl.label}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xLabels.map((xl, i) => (
            <text
              key={`xl-${i}`}
              x={xl.x}
              y={CHART_H - 8}
              fontSize={9}
              fill="#4a5568"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {xl.label}
            </text>
          ))}

          {/* Zero line */}
          <line
            x1={PAD.left}
            x2={CHART_W - PAD.right}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
          <text
            x={CHART_W - PAD.right + 4}
            y={zeroY + 4}
            fontSize={9}
            fill="#94a3b8"
            fontFamily="monospace"
          >
            $0
          </text>

          {/* Profit fill */}
          {profitPath && <path d={profitPath} fill="rgba(34,197,94,0.15)" />}

          {/* Loss fill */}
          {lossPath && <path d={lossPath} fill="rgba(239,68,68,0.15)" />}

          {/* P/L line */}
          <path d={linePath} fill="none" stroke="#818cf8" strokeWidth={2} />

          {/* Underlying price vertical line */}
          {params.underlying && (
            <g>
              <line
                x1={scaleX(params.underlying)}
                x2={scaleX(params.underlying)}
                y1={PAD.top}
                y2={CHART_H - PAD.bottom}
                stroke="rgba(245,158,11,0.4)"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <text
                x={scaleX(params.underlying)}
                y={PAD.top - 4}
                fontSize={9}
                fill="#f59e0b"
                textAnchor="middle"
                fontFamily="monospace"
              >
                Spot
              </text>
            </g>
          )}

          {/* Breakeven markers */}
          {payoff.breakevens.map((be, i) => (
            <g key={`be-${i}`}>
              <line
                x1={scaleX(be)}
                x2={scaleX(be)}
                y1={PAD.top}
                y2={CHART_H - PAD.bottom}
                stroke="rgba(168,85,247,0.5)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <circle
                cx={scaleX(be)}
                cy={zeroY}
                r={4}
                fill="#a855f7"
                stroke="#12122a"
                strokeWidth={1.5}
              />
              <text
                x={scaleX(be)}
                y={zeroY - 10}
                fontSize={9}
                fill="#a855f7"
                textAnchor="middle"
                fontWeight={600}
                fontFamily="monospace"
              >
                BE: {formatDollar(be)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Stats row */}
      <div
        className="payoff-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        <div
          className="payoff-stat"
          style={{
            padding: "10px 14px",
            background: "rgba(34,197,94,0.06)",
            borderRadius: 8,
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <div
            className="payoff-stat-label"
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <TrendingUp size={12} style={{ color: "#22c55e" }} />
            Max Profit
          </div>
          <div
            className="payoff-stat-value"
            style={{ fontSize: 16, fontWeight: 700, color: "#22c55e", fontFamily: "monospace" }}
          >
            {payoff.maxProfit === "Unlimited"
              ? "Unlimited"
              : formatDollar(payoff.maxProfit as number)}
          </div>
        </div>

        <div
          className="payoff-stat"
          style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.06)",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <div
            className="payoff-stat-label"
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <TrendingDown size={12} style={{ color: "#ef4444" }} />
            Max Loss
          </div>
          <div
            className="payoff-stat-value"
            style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}
          >
            -{formatDollar(payoff.maxLoss)}
          </div>
        </div>

        {payoff.breakevens.map((be, i) => (
          <div
            key={`be-stat-${i}`}
            className="payoff-stat"
            style={{
              padding: "10px 14px",
              background: "rgba(168,85,247,0.06)",
              borderRadius: 8,
              border: "1px solid rgba(168,85,247,0.15)",
            }}
          >
            <div
              className="payoff-stat-label"
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <DollarSign size={12} style={{ color: "#a855f7" }} />
              Breakeven {payoff.breakevens.length > 1 ? i + 1 : ""}
            </div>
            <div
              className="payoff-stat-value"
              style={{ fontSize: 16, fontWeight: 700, color: "#a855f7", fontFamily: "monospace" }}
            >
              {formatDollar(be)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
