"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import PageShell from "../../components/PageShell";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

const TIME_RANGES = ["1W", "1M", "3M", "6M", "1Y"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const RANGE_DAYS: Record<TimeRange, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateData(days: number) {
  const rng = seededRandom(42);
  const rngSpy = seededRandom(137);
  const portfolio: { date: Date; value: number }[] = [];
  const benchmark: { date: Date; value: number }[] = [];
  const now = new Date();
  let pVal = 10000;
  let bVal = 10000;

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const pReturn = (rng() - 0.48) * 0.03;
    const bReturn = (rngSpy() - 0.49) * 0.02;
    pVal *= 1 + pReturn;
    bVal *= 1 + bReturn;
    portfolio.push({ date: d, value: pVal });
    benchmark.push({ date: d, value: bVal });
  }
  return { portfolio, benchmark };
}

function calcStats(data: { value: number }[]) {
  if (data.length < 2) return { totalReturn: 0, cagr: 0, maxDrawdown: 0, sharpe: 0 };
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const totalReturn = ((last - first) / first) * 100;
  const years = data.length / 365;
  const cagr = years > 0 ? (Math.pow(last / first, 1 / Math.max(years, 0.01)) - 1) * 100 : 0;
  let peak = data[0].value;
  let maxDd = 0;
  const dailyReturns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].value > peak) peak = data[i].value;
    const dd = ((peak - data[i].value) / peak) * 100;
    if (dd > maxDd) maxDd = dd;
    dailyReturns.push((data[i].value - data[i - 1].value) / data[i - 1].value);
  }
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyReturns.length;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
  return { totalReturn, cagr, maxDrawdown: maxDd, sharpe };
}

export default function PerformancePage() {
  const [range, setRange] = useState<TimeRange>("3M");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: string; benchValue: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fullData = useMemo(() => generateData(365), []);

  const sliced = useMemo(() => {
    const days = RANGE_DAYS[range];
    const pSlice = fullData.portfolio.slice(-days - 1);
    const bSlice = fullData.benchmark.slice(-days - 1);
    return { portfolio: pSlice, benchmark: bSlice };
  }, [range, fullData]);

  const stats = useMemo(() => calcStats(sliced.portfolio), [sliced]);

  const chartWidth = 800;
  const chartHeight = 320;
  const padX = 50;
  const padY = 30;
  const innerW = chartWidth - padX * 2;
  const innerH = chartHeight - padY * 2;

  const { pPoints, bPoints, yLabels, xLabels, allValues } = useMemo(() => {
    const pVals = sliced.portfolio.map((d) => d.value);
    const bVals = sliced.benchmark.map((d) => d.value);
    const all = [...pVals, ...bVals];
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const rangeV = maxV - minV || 1;

    const toX = (i: number) => padX + (i / (pVals.length - 1)) * innerW;
    const toY = (v: number) => padY + innerH - ((v - minV) / rangeV) * innerH;

    const pPts = pVals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const bPts = bVals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

    const yLbls: { y: number; label: string }[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const v = minV + (rangeV * i) / steps;
      yLbls.push({ y: toY(v), label: `$${v.toFixed(0)}` });
    }

    const xLbls: { x: number; label: string }[] = [];
    const xSteps = Math.min(6, pVals.length - 1);
    for (let i = 0; i <= xSteps; i++) {
      const idx = Math.round((i / xSteps) * (pVals.length - 1));
      const d = sliced.portfolio[idx].date;
      xLbls.push({
        x: toX(idx),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }

    return { pPoints: pPts, bPoints: bPts, yLabels: yLbls, xLabels: xLbls, allValues: { minV, maxV, rangeV } };
  }, [sliced, innerW, innerH, padX, padY]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = chartWidth / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const relX = mx - padX;
      if (relX < 0 || relX > innerW) {
        setTooltip(null);
        return;
      }
      const idx = Math.round((relX / innerW) * (sliced.portfolio.length - 1));
      const clamped = Math.max(0, Math.min(idx, sliced.portfolio.length - 1));
      const dp = sliced.portfolio[clamped];
      const db = sliced.benchmark[clamped];
      const toY = (v: number) => padY + innerH - ((v - allValues.minV) / allValues.rangeV) * innerH;
      setTooltip({
        x: padX + (clamped / (sliced.portfolio.length - 1)) * innerW,
        y: toY(dp.value),
        date: dp.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        value: `$${dp.value.toFixed(2)}`,
        benchValue: `$${db.value.toFixed(2)}`,
      });
    },
    [sliced, innerW, innerH, padX, padY, allValues]
  );

  const statCards = [
    { label: "Total Return", value: `${stats.totalReturn >= 0 ? "+" : ""}${stats.totalReturn.toFixed(2)}%`, icon: TrendingUp, color: stats.totalReturn >= 0 ? "var(--positive)" : "var(--negative)" },
    { label: "CAGR", value: `${stats.cagr >= 0 ? "+" : ""}${stats.cagr.toFixed(2)}%`, icon: BarChart3, color: stats.cagr >= 0 ? "var(--positive)" : "var(--negative)" },
    { label: "Max Drawdown", value: `-${stats.maxDrawdown.toFixed(2)}%`, icon: TrendingDown, color: "var(--negative)" },
    { label: "Sharpe Ratio", value: stats.sharpe.toFixed(2), icon: Activity, color: stats.sharpe >= 1 ? "var(--positive)" : stats.sharpe >= 0.5 ? "var(--warning)" : "var(--negative)" },
  ];

  return (
    <PageShell
      title="Portfolio Performance"
      subtitle="Track your portfolio value over time against the S&P 500 benchmark."
      actions={
        <div style={{ display: "flex", gap: 6 }}>
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--surface-border)",
                background: range === r ? "var(--accent-2)" : "var(--surface-2)",
                color: range === r ? "#fff" : "var(--ink-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <s.icon size={20} style={{ color: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 20, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12, fontSize: 13 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: "var(--accent-2)", display: "inline-block" }} />
            <span style={{ color: "var(--ink-muted)" }}>Portfolio</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: "var(--ink-muted)", opacity: 0.5, display: "inline-block" }} />
            <span style={{ color: "var(--ink-muted)" }}>SPY Benchmark</span>
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: "100%", height: "auto" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line x1={padX} y1={yl.y} x2={chartWidth - padX} y2={yl.y} stroke="var(--surface-border)" strokeWidth={0.5} />
              <text x={padX - 8} y={yl.y + 4} textAnchor="end" fontSize={10} fill="var(--ink-muted)">
                {yl.label}
              </text>
            </g>
          ))}
          {xLabels.map((xl, i) => (
            <text key={i} x={xl.x} y={chartHeight - 6} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">
              {xl.label}
            </text>
          ))}
          <polyline points={bPoints} fill="none" stroke="var(--ink-muted)" strokeOpacity={0.5} strokeWidth={2} />
          <polyline points={pPoints} fill="none" stroke="var(--accent-2)" strokeWidth={2.5} />
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={padY} x2={tooltip.x} y2={padY + innerH} stroke="var(--ink-muted)" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 2" />
              <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="var(--accent-2)" stroke="var(--surface)" strokeWidth={2} />
              <rect
                x={tooltip.x + 10}
                y={tooltip.y - 45}
                width={160}
                height={56}
                rx={8}
                fill="var(--surface-2)"
                stroke="var(--surface-border)"
                strokeWidth={1}
              />
              <text x={tooltip.x + 20} y={tooltip.y - 28} fontSize={11} fill="var(--ink-muted)">
                {tooltip.date}
              </text>
              <text x={tooltip.x + 20} y={tooltip.y - 12} fontSize={12} fontWeight={600} fill="var(--accent-2)">
                Portfolio: {tooltip.value}
              </text>
              <text x={tooltip.x + 20} y={tooltip.y + 4} fontSize={11} fill="var(--ink-muted)">
                SPY: {tooltip.benchValue}
              </text>
            </>
          )}
        </svg>
      </div>
    </PageShell>
  );
}
