"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  Crosshair,
  Gauge,
  Layers,
  PieChart,
  Scale,
  ShieldCheck,
  Sliders,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OptMethod = "equal" | "risk_parity" | "min_variance" | "max_sharpe";

type StockInput = {
  symbol: string;
  price: number;
  annualReturn: number;
  annualVol: number;
};

type OptimizedWeight = {
  symbol: string;
  weight: number;
  color: string;
};

type FrontierPoint = {
  x: number; // volatility
  y: number; // return
  isOptimal: boolean;
  label?: string;
};

type PortfolioMetrics = {
  expectedReturn: number;
  expectedVol: number;
  sharpeRatio: number;
  maxDrawdown: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WEIGHT_COLORS = [
  "#3b82f6", "#60a5fa", "#ec4899", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#2563eb",
];

const METHODS: { key: OptMethod; label: string; icon: typeof Scale }[] = [
  { key: "equal", label: "Equal Weight", icon: PieChart },
  { key: "risk_parity", label: "Risk Parity", icon: Scale },
  { key: "min_variance", label: "Min Variance", icon: ShieldCheck },
  { key: "max_sharpe", label: "Max Sharpe", icon: Target },
];

/* ------------------------------------------------------------------ */
/*  Seeded RNG                                                         */
/* ------------------------------------------------------------------ */

function seededRng(seed: number): () => number {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Default stocks                                                     */
/* ------------------------------------------------------------------ */

function getDefaultStocks(): StockInput[] {
  const rng = seededRng(8811);
  const stocks: { symbol: string; basePrice: number; baseMu: number; baseVol: number }[] = [
    { symbol: "AAPL", basePrice: 178.5, baseMu: 0.18, baseVol: 0.24 },
    { symbol: "MSFT", basePrice: 415.2, baseMu: 0.22, baseVol: 0.22 },
    { symbol: "NVDA", basePrice: 875.3, baseMu: 0.35, baseVol: 0.42 },
    { symbol: "AMZN", basePrice: 185.6, baseMu: 0.15, baseVol: 0.28 },
    { symbol: "GOOG", basePrice: 155.8, baseMu: 0.16, baseVol: 0.25 },
    { symbol: "TSLA", basePrice: 242.1, baseMu: 0.28, baseVol: 0.55 },
    { symbol: "JPM", basePrice: 198.7, baseMu: 0.12, baseVol: 0.18 },
    { symbol: "XOM", basePrice: 112.4, baseMu: 0.10, baseVol: 0.22 },
  ];

  return stocks.map((s) => ({
    symbol: s.symbol,
    price: +(s.basePrice * (0.95 + rng() * 0.1)).toFixed(2),
    annualReturn: +(s.baseMu + (rng() - 0.5) * 0.06).toFixed(4),
    annualVol: +(s.baseVol + (rng() - 0.5) * 0.04).toFixed(4),
  }));
}

/* ------------------------------------------------------------------ */
/*  Optimization logic (mock but deterministic)                        */
/* ------------------------------------------------------------------ */

function optimizeWeights(
  stocks: StockInput[],
  method: OptMethod,
  riskTolerance: number,
): number[] {
  const n = stocks.length;
  const rt = riskTolerance / 10; // 0-1

  switch (method) {
    case "equal":
      return stocks.map(() => 1 / n);

    case "risk_parity": {
      // Inverse volatility weighting
      const invVol = stocks.map((s) => 1 / Math.max(s.annualVol, 0.01));
      const total = invVol.reduce((a, b) => a + b, 0);
      const base = invVol.map((v) => v / total);
      // Adjust toward equal weight based on risk tolerance
      return base.map((w, i) => {
        const eq = 1 / n;
        return w * (1 - rt * 0.3) + eq * (rt * 0.3);
      });
    }

    case "min_variance": {
      // Strong inverse-vol weighting with risk tolerance shift
      const invVol2 = stocks.map((s) => 1 / Math.pow(Math.max(s.annualVol, 0.01), 2));
      const total2 = invVol2.reduce((a, b) => a + b, 0);
      const base = invVol2.map((v) => v / total2);
      return base.map((w, i) => {
        const eq = 1 / n;
        return w * (1 - rt * 0.2) + eq * (rt * 0.2);
      });
    }

    case "max_sharpe": {
      // Return / vol ratio weighting
      const sharpes = stocks.map(
        (s) => s.annualReturn / Math.max(s.annualVol, 0.01),
      );
      const minS = Math.min(...sharpes);
      const shifted = sharpes.map((s) => Math.max(s - minS + 0.01, 0.01));
      const total = shifted.reduce((a, b) => a + b, 0);
      const base = shifted.map((v) => v / total);
      // Risk tolerance tilts toward higher return assets
      return base.map((w, i) => {
        const retTilt = stocks[i].annualReturn / stocks.reduce((a, s) => a + s.annualReturn, 0);
        return w * (1 - rt * 0.25) + retTilt * (rt * 0.25);
      });
    }

    default:
      return stocks.map(() => 1 / n);
  }
}

function computeMetrics(stocks: StockInput[], weights: number[]): PortfolioMetrics {
  const expectedReturn = stocks.reduce((s, st, i) => s + st.annualReturn * weights[i], 0);

  // Simplified: assume low average correlation of 0.3
  const avgCorr = 0.3;
  let variance = 0;
  for (let i = 0; i < stocks.length; i++) {
    for (let j = 0; j < stocks.length; j++) {
      const corr = i === j ? 1 : avgCorr;
      variance += weights[i] * weights[j] * stocks[i].annualVol * stocks[j].annualVol * corr;
    }
  }
  const expectedVol = Math.sqrt(Math.max(0, variance));
  const riskFreeRate = 0.05;
  const sharpeRatio = expectedVol > 0 ? (expectedReturn - riskFreeRate) / expectedVol : 0;

  // Approximate max drawdown from vol
  const maxDrawdown = -(expectedVol * 1.5 + 0.02);

  return {
    expectedReturn: +expectedReturn.toFixed(4),
    expectedVol: +expectedVol.toFixed(4),
    sharpeRatio: +sharpeRatio.toFixed(3),
    maxDrawdown: +maxDrawdown.toFixed(4),
  };
}

function generateFrontier(
  stocks: StockInput[],
  optimalWeights: number[],
): FrontierPoint[] {
  const rng = seededRng(5577);
  const points: FrontierPoint[] = [];

  // Generate random portfolios
  for (let i = 0; i < 18; i++) {
    const rawW = stocks.map(() => rng());
    const total = rawW.reduce((a, b) => a + b, 0);
    const w = rawW.map((v) => v / total);
    const metrics = computeMetrics(stocks, w);
    points.push({
      x: metrics.expectedVol * 100,
      y: metrics.expectedReturn * 100,
      isOptimal: false,
    });
  }

  // Add the efficient frontier curve (approximation)
  const minVolW = optimizeWeights(stocks, "min_variance", 5);
  const maxRetW = optimizeWeights(stocks, "max_sharpe", 10);
  const minMetrics = computeMetrics(stocks, minVolW);
  const maxMetrics = computeMetrics(stocks, maxRetW);

  // Optimal portfolio point
  const optMetrics = computeMetrics(stocks, optimalWeights);
  points.push({
    x: optMetrics.expectedVol * 100,
    y: optMetrics.expectedReturn * 100,
    isOptimal: true,
    label: "Optimal",
  });

  // Min vol point
  points.push({
    x: minMetrics.expectedVol * 100,
    y: minMetrics.expectedReturn * 100,
    isOptimal: false,
    label: "Min Vol",
  });

  return points;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(2)}%`;
}

/* ------------------------------------------------------------------ */
/*  SVG Frontier Chart                                                 */
/* ------------------------------------------------------------------ */

function FrontierChart({ points }: { points: FrontierPoint[] }) {
  const padding = { top: 20, right: 20, bottom: 35, left: 45 };
  const width = 500;
  const height = 300;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.floor(Math.min(...xValues) - 2);
  const xMax = Math.ceil(Math.max(...xValues) + 2);
  const yMin = Math.floor(Math.min(...yValues) - 3);
  const yMax = Math.ceil(Math.max(...yValues) + 3);

  const scaleX = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * chartW;
  const scaleY = (v: number) => padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // Grid lines
  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v += Math.max(1, Math.round((xMax - xMin) / 6))) {
    xTicks.push(v);
  }
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += Math.max(1, Math.round((yMax - yMin) / 5))) {
    yTicks.push(v);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="frontier-chart w-full"
      style={{ maxHeight: 300 }}
    >
      {/* Grid */}
      {xTicks.map((v) => (
        <g key={`x-${v}`}>
          <line
            x1={scaleX(v)}
            y1={padding.top}
            x2={scaleX(v)}
            y2={padding.top + chartH}
            stroke="var(--surface-border)"
            strokeDasharray="3,3"
            strokeWidth={0.5}
          />
          <text x={scaleX(v)} y={height - 8} textAnchor="middle" fontSize={9} fill="var(--muted)">
            {v}%
          </text>
        </g>
      ))}
      {yTicks.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={padding.left}
            y1={scaleY(v)}
            x2={padding.left + chartW}
            y2={scaleY(v)}
            stroke="var(--surface-border)"
            strokeDasharray="3,3"
            strokeWidth={0.5}
          />
          <text x={padding.left - 6} y={scaleY(v) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
            {v}%
          </text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={width / 2} y={height - 0} textAnchor="middle" fontSize={10} fill="var(--muted)">
        Volatility (%)
      </text>
      <text
        x={12}
        y={height / 2}
        textAnchor="middle"
        fontSize={10}
        fill="var(--muted)"
        transform={`rotate(-90, 12, ${height / 2})`}
      >
        Return (%)
      </text>

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={scaleX(p.x)}
            cy={scaleY(p.y)}
            r={p.isOptimal ? 7 : p.label ? 5 : 4}
            fill={p.isOptimal ? "var(--accent)" : p.label ? "#3b82f6" : "var(--surface-border)"}
            opacity={p.isOptimal ? 1 : p.label ? 0.85 : 0.5}
            stroke={p.isOptimal ? "white" : "none"}
            strokeWidth={p.isOptimal ? 2 : 0}
          />
          {p.label && (
            <text
              x={scaleX(p.x) + (p.isOptimal ? 12 : -12)}
              y={scaleY(p.y) - 10}
              textAnchor={p.isOptimal ? "start" : "end"}
              fontSize={9}
              fontWeight={p.isOptimal ? "bold" : "normal"}
              fill={p.isOptimal ? "var(--accent)" : "var(--muted)"}
            >
              {p.label}
            </text>
          )}
          {p.isOptimal && (
            <circle
              cx={scaleX(p.x)}
              cy={scaleY(p.y)}
              r={12}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="3,2"
              opacity={0.6}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RiskParityOptimizer() {
  const [stocks] = useState<StockInput[]>(() => getDefaultStocks());
  const [method, setMethod] = useState<OptMethod>("risk_parity");
  const [riskTolerance, setRiskTolerance] = useState(5);
  const [applied, setApplied] = useState(false);

  /* ---- Optimized weights ---- */
  const rawWeights = useMemo(
    () => optimizeWeights(stocks, method, riskTolerance),
    [stocks, method, riskTolerance],
  );

  // Normalize to sum to 1
  const weights: OptimizedWeight[] = useMemo(() => {
    const total = rawWeights.reduce((a, b) => a + b, 0);
    return stocks.map((s, i) => ({
      symbol: s.symbol,
      weight: total > 0 ? rawWeights[i] / total : 1 / stocks.length,
      color: WEIGHT_COLORS[i % WEIGHT_COLORS.length],
    }));
  }, [rawWeights, stocks]);

  /* ---- Metrics ---- */
  const metrics = useMemo(
    () => computeMetrics(stocks, weights.map((w) => w.weight)),
    [stocks, weights],
  );

  /* ---- Frontier ---- */
  const frontier = useMemo(
    () => generateFrontier(stocks, weights.map((w) => w.weight)),
    [stocks, weights],
  );

  /* ---- Apply ---- */
  const handleApply = useCallback(() => {
    setApplied(true);
    try {
      localStorage.setItem(
        "smc_optimizer_weights_v1",
        JSON.stringify(weights.map((w) => ({ symbol: w.symbol, weight: +(w.weight * 100).toFixed(2) }))),
      );
    } catch { /* empty */ }
    setTimeout(() => setApplied(false), 3000);
  }, [weights]);

  /* ---- Reset applied on param change ---- */
  useEffect(() => {
    setApplied(false);
  }, [method, riskTolerance]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="optimizer-container space-y-4">
      {/* ---- Header + Method Selector ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Sliders size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Portfolio Optimizer
          </span>
        </div>

        {/* Method buttons */}
        <div className="mb-5">
          <div className="text-[10px] muted uppercase tracking-wider mb-2 font-medium">Optimization Method</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`text-xs rounded-lg px-3 py-2.5 border font-semibold transition-colors flex items-center gap-1.5 ${
                    method === m.key
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                      : "border-[var(--surface-border)] hover:border-[var(--accent)]"
                  }`}
                >
                  <Icon size={13} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Risk tolerance slider */}
        <div className="optimizer-slider-row mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="optimizer-slider-label text-[10px] muted uppercase tracking-wider font-medium flex items-center gap-1">
              <Gauge size={11} />
              Risk Tolerance
            </span>
            <span className="text-xs font-bold text-[var(--accent)]">{riskTolerance}/10</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] muted">Conservative</span>
            <input
              type="range"
              min={1}
              max={10}
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(+e.target.value)}
              className="optimizer-slider flex-1 h-2 accent-[var(--accent)]"
            />
            <span className="text-[9px] muted">Aggressive</span>
          </div>
        </div>

        {/* Input stocks */}
        <div className="mb-4">
          <div className="text-[10px] muted uppercase tracking-wider mb-2 font-medium">Input Portfolio</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stocks.map((s) => (
              <div key={s.symbol} className="rounded-lg border border-[var(--surface-border)] p-2.5">
                <div className="text-xs font-bold">{s.symbol}</div>
                <div className="text-[10px] muted">${s.price.toFixed(2)}</div>
                <div className="flex gap-2 mt-1">
                  <span className={`text-[9px] font-semibold ${s.annualReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {formatPct(s.annualReturn)} ret
                  </span>
                  <span className="text-[9px] muted">{(s.annualVol * 100).toFixed(1)}% vol</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Optimized Weights ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Optimized Weights
          </span>
        </div>

        {/* Stacked bar */}
        <div className="optimizer-weight-bar flex h-8 rounded-lg overflow-hidden mb-4">
          {weights.map((w) => (
            <div
              key={w.symbol}
              className="optimizer-weight-segment relative group"
              style={{
                width: `${w.weight * 100}%`,
                background: w.color,
                minWidth: w.weight > 0.02 ? 20 : 0,
              }}
              title={`${w.symbol}: ${(w.weight * 100).toFixed(1)}%`}
            >
              {w.weight > 0.06 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                  {w.symbol}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Weight breakdown */}
        <div className="space-y-2 mb-4">
          {weights
            .slice()
            .sort((a, b) => b.weight - a.weight)
            .map((w) => (
              <div key={w.symbol} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: w.color }}
                />
                <span className="text-xs font-semibold w-12">{w.symbol}</span>
                <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${w.weight * 100}%`, background: w.color }}
                  />
                </div>
                <span className="text-xs font-bold w-14 text-right">
                  {(w.weight * 100).toFixed(1)}%
                </span>
              </div>
            ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[9px] muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingUp size={10} />
              Expected Return
            </div>
            <div className={`text-sm font-bold ${metrics.expectedReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
              {formatPct(metrics.expectedReturn)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[9px] muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity size={10} />
              Expected Vol
            </div>
            <div className="text-sm font-bold">
              {(metrics.expectedVol * 100).toFixed(2)}%
            </div>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[9px] muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap size={10} />
              Sharpe Ratio
            </div>
            <div className={`text-sm font-bold ${metrics.sharpeRatio >= 0.5 ? "text-[var(--positive)]" : metrics.sharpeRatio < 0 ? "text-[var(--negative)]" : ""}`}>
              {metrics.sharpeRatio.toFixed(3)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[9px] muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingDown size={10} />
              Max Drawdown
            </div>
            <div className="text-sm font-bold text-[var(--negative)]">
              {(metrics.maxDrawdown * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={applied}
          className="rounded-lg px-5 py-2 text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60 transition-colors"
        >
          {applied ? (
            <><Check size={12} className="inline mr-1" />Weights Applied!</>
          ) : (
            <><Crosshair size={12} className="inline mr-1" />Apply Weights</>
          )}
        </button>
      </div>

      {/* ---- Efficient Frontier Chart ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Efficient Frontier
          </span>
          <span className="ml-auto text-[10px] muted">
            {frontier.length} portfolios simulated
          </span>
        </div>

        <FrontierChart points={frontier} />

        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
            <span className="font-semibold">Optimal Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            <span className="muted">Key Portfolios</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded-full bg-[var(--surface-border)]" />
            <span className="muted">Random Portfolios</span>
          </div>
        </div>
      </div>
    </div>
  );
}
