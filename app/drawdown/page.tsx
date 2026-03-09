"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import PageShell from "../../components/PageShell";
import { AlertTriangle, TrendingDown, Clock, Activity } from "lucide-react";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface DrawdownPeriod {
  startIdx: number;
  endIdx: number;
  recoveryIdx: number | null;
  depth: number;
  startDate: Date;
  endDate: Date;
  recoveryDate: Date | null;
  durationDays: number;
  recoveryDays: number | null;
}

function generatePortfolioData(days: number) {
  const rng = seededRandom(42);
  const data: { date: Date; value: number }[] = [];
  const now = new Date();
  let val = 10000;

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dailyReturn = (rng() - 0.48) * 0.03;
    val *= 1 + dailyReturn;
    data.push({ date: d, value: val });
  }
  return data;
}

function computeDrawdowns(data: { date: Date; value: number }[]) {
  let peak = data[0].value;
  const ddSeries: { date: Date; drawdown: number }[] = [];
  const periods: DrawdownPeriod[] = [];
  let inDrawdown = false;
  let currentStart = 0;
  let currentTrough = 0;
  let currentTroughVal = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i].value > peak) peak = data[i].value;
    const dd = ((data[i].value - peak) / peak) * 100;
    ddSeries.push({ date: data[i].date, drawdown: dd });

    if (dd < -1 && !inDrawdown) {
      inDrawdown = true;
      currentStart = i;
      currentTrough = i;
      currentTroughVal = dd;
    } else if (inDrawdown) {
      if (dd < currentTroughVal) {
        currentTrough = i;
        currentTroughVal = dd;
      }
      if (dd >= -0.5 || i === data.length - 1) {
        inDrawdown = false;
        const startDate = data[currentStart].date;
        const endDate = data[currentTrough].date;
        const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
        const recoveryIdx = dd >= -0.5 ? i : null;
        const recoveryDate = recoveryIdx !== null ? data[recoveryIdx].date : null;
        const recoveryDays = recoveryDate ? Math.round((recoveryDate.getTime() - endDate.getTime()) / 86400000) : null;

        periods.push({
          startIdx: currentStart,
          endIdx: currentTrough,
          recoveryIdx,
          depth: currentTroughVal,
          startDate,
          endDate,
          recoveryDate,
          durationDays: Math.max(durationDays, 1),
          recoveryDays,
        });
      }
    }
  }

  return { ddSeries, periods };
}

export default function DrawdownPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; dd: string } | null>(null);

  const portfolioData = useMemo(() => generatePortfolioData(365), []);
  const { ddSeries, periods } = useMemo(() => computeDrawdowns(portfolioData), [portfolioData]);

  const top5 = useMemo(
    () =>
      [...periods]
        .sort((a, b) => a.depth - b.depth)
        .slice(0, 5),
    [periods]
  );

  const maxDD = useMemo(() => Math.min(...ddSeries.map((d) => d.drawdown)), [ddSeries]);
  const avgDD = useMemo(() => {
    const dds = ddSeries.filter((d) => d.drawdown < -0.5).map((d) => d.drawdown);
    return dds.length > 0 ? dds.reduce((a, b) => a + b, 0) / dds.length : 0;
  }, [ddSeries]);
  const longestPeriod = useMemo(
    () => periods.reduce((max, p) => (p.durationDays > max ? p.durationDays : max), 0),
    [periods]
  );
  const avgRecovery = useMemo(() => {
    const recs = periods.filter((p) => p.recoveryDays !== null).map((p) => p.recoveryDays!);
    return recs.length > 0 ? Math.round(recs.reduce((a, b) => a + b, 0) / recs.length) : 0;
  }, [periods]);

  const chartWidth = 800;
  const chartHeight = 280;
  const padX = 55;
  const padY = 20;
  const padBottom = 30;
  const innerW = chartWidth - padX * 2;
  const innerH = chartHeight - padY - padBottom;

  const minDD = Math.min(maxDD * 1.1, -2);

  const toX = useCallback((i: number) => padX + (i / (ddSeries.length - 1)) * innerW, [ddSeries.length, innerW, padX]);
  const toY = useCallback((dd: number) => padY + (dd / minDD) * innerH, [minDD, innerH, padY]);

  const areaPath = useMemo(() => {
    const pts = ddSeries.map((d, i) => `${toX(i)},${toY(d.drawdown)}`);
    return `M${toX(0)},${toY(0)} L${pts.join(" L")} L${toX(ddSeries.length - 1)},${toY(0)} Z`;
  }, [ddSeries, toX, toY]);

  const linePath = useMemo(() => {
    return ddSeries.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.drawdown)}`).join(" ");
  }, [ddSeries, toX, toY]);

  const yLabels = useMemo(() => {
    const labels: { y: number; label: string }[] = [];
    const step = Math.ceil(Math.abs(minDD) / 5);
    for (let v = 0; v >= minDD; v -= step) {
      labels.push({ y: toY(v), label: `${v.toFixed(0)}%` });
    }
    return labels;
  }, [minDD, toY]);

  const xLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const idx = Math.round((i / steps) * (ddSeries.length - 1));
      labels.push({
        x: toX(idx),
        label: ddSeries[idx].date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return labels;
  }, [ddSeries, toX]);

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
      const idx = Math.round((relX / innerW) * (ddSeries.length - 1));
      const clamped = Math.max(0, Math.min(idx, ddSeries.length - 1));
      const dp = ddSeries[clamped];
      setTooltip({
        x: toX(clamped),
        y: toY(dp.drawdown),
        date: dp.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        dd: `${dp.drawdown.toFixed(2)}%`,
      });
    },
    [ddSeries, innerW, padX, toX, toY]
  );

  const riskLevel =
    Math.abs(maxDD) > 20
      ? { text: "High Risk", desc: "Your portfolio has experienced significant drawdowns exceeding 20%. Consider reducing position sizes or improving diversification to limit downside risk.", color: "var(--negative)" }
      : Math.abs(maxDD) > 10
      ? { text: "Moderate Risk", desc: "Your portfolio drawdowns are within a moderate range. While not extreme, consider implementing stop-losses or hedging strategies to protect against deeper corrections.", color: "var(--warning)" }
      : { text: "Low Risk", desc: "Your portfolio has shown resilience with relatively shallow drawdowns. Maintain current risk management practices and ensure adequate diversification.", color: "var(--positive)" };

  const statCards = [
    { label: "Max Drawdown", value: `${maxDD.toFixed(2)}%`, icon: TrendingDown, color: "var(--negative)" },
    { label: "Avg Drawdown", value: `${avgDD.toFixed(2)}%`, icon: Activity, color: "var(--warning)" },
    { label: "Longest Drawdown", value: `${longestPeriod}d`, icon: Clock, color: "var(--ink-muted)" },
    { label: "Avg Recovery", value: `${avgRecovery}d`, icon: TrendingDown, color: "var(--accent-2)" },
  ];

  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });

  return (
    <PageShell
      title="Drawdown Analyzer"
      subtitle="Analyze historical drawdowns to understand portfolio risk and recovery patterns."
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

      <div className="glass-card" style={{ padding: 20, marginBottom: 16, overflow: "hidden" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 12px" }}>
          Drawdown Depth Over Time
        </h3>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: "100%", height: "auto" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line x1={padX} y1={yl.y} x2={chartWidth - padX} y2={yl.y} stroke="var(--surface-border)" strokeWidth={0.5} />
              <text x={padX - 8} y={yl.y + 4} textAnchor="end" fontSize={10} fill="var(--ink-muted)">
                {yl.label}
              </text>
            </g>
          ))}
          {xLabels.map((xl, i) => (
            <text key={i} x={xl.x} y={chartHeight - 4} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">
              {xl.label}
            </text>
          ))}

          {/* Zero line */}
          <line x1={padX} y1={toY(0)} x2={chartWidth - padX} y2={toY(0)} stroke="var(--ink-muted)" strokeWidth={1} strokeOpacity={0.5} />

          {/* Drawdown area */}
          <path d={areaPath} fill="var(--negative)" fillOpacity={0.2} />
          <path d={linePath} fill="none" stroke="var(--negative)" strokeWidth={1.5} />

          {/* Tooltip */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={toY(0)} x2={tooltip.x} y2={tooltip.y} stroke="var(--negative)" strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.6} />
              <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="var(--negative)" stroke="var(--surface)" strokeWidth={2} />
              <rect
                x={Math.min(tooltip.x + 10, chartWidth - padX - 140)}
                y={Math.max(tooltip.y - 35, padY)}
                width={130}
                height={40}
                rx={6}
                fill="var(--surface-2)"
                stroke="var(--surface-border)"
                strokeWidth={1}
              />
              <text
                x={Math.min(tooltip.x + 18, chartWidth - padX - 132)}
                y={Math.max(tooltip.y - 18, padY + 17)}
                fontSize={11}
                fill="var(--ink-muted)"
              >
                {tooltip.date}
              </text>
              <text
                x={Math.min(tooltip.x + 18, chartWidth - padX - 132)}
                y={Math.max(tooltip.y - 2, padY + 33)}
                fontSize={13}
                fontWeight={700}
                fill="var(--negative)"
              >
                {tooltip.dd}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Top 5 drawdown periods table */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16, overflowX: "auto" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 14px" }}>
          Top 5 Drawdown Periods
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["#", "Start", "Trough", "Depth", "Duration", "Recovery"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "var(--ink-muted)",
                    fontWeight: 600,
                    fontSize: 12,
                    borderBottom: "1px solid var(--surface-border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top5.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--surface-border)" }}>
                <td style={{ padding: "10px 12px", color: "var(--ink-muted)", fontWeight: 600 }}>{i + 1}</td>
                <td style={{ padding: "10px 12px", color: "var(--ink)" }}>{fmtDate(p.startDate)}</td>
                <td style={{ padding: "10px 12px", color: "var(--ink)" }}>{fmtDate(p.endDate)}</td>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--negative)" }}>
                  {p.depth.toFixed(2)}%
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ink)" }}>{p.durationDays} days</td>
                <td style={{ padding: "10px 12px", color: p.recoveryDays !== null ? "var(--positive)" : "var(--warning)" }}>
                  {p.recoveryDays !== null ? `${p.recoveryDays} days` : "Ongoing"}
                </td>
              </tr>
            ))}
            {top5.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "20px 12px", textAlign: "center", color: "var(--ink-muted)" }}>
                  No significant drawdown periods detected.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Risk assessment */}
      <div className="glass-card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <AlertTriangle size={18} style={{ color: riskLevel.color, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: riskLevel.color, marginBottom: 4 }}>
            {riskLevel.text}
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, margin: 0 }}>
            {riskLevel.desc}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
