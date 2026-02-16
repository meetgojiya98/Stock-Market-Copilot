"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { PieChart, RotateCcw, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StockNode = {
  name: string;
  symbol: string;
  value: number;
};

type IndustryNode = {
  name: string;
  stocks: StockNode[];
};

type SectorNode = {
  name: string;
  color: string;
  industries: IndustryNode[];
};

type FlatSegment = {
  ring: 0 | 1 | 2;
  sectorIdx: number;
  industryIdx: number | null;
  stockIdx: number | null;
  name: string;
  value: number;
  startAngle: number;
  endAngle: number;
  color: string;
};

type TooltipInfo = {
  x: number;
  y: number;
  name: string;
  value: number;
  pct: string;
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

const PORTFOLIO: SectorNode[] = [
  {
    name: "Technology",
    color: "#3b82f6",
    industries: [
      {
        name: "Software",
        stocks: [
          { name: "Apple Inc", symbol: "AAPL", value: 45000 },
          { name: "Microsoft", symbol: "MSFT", value: 38000 },
          { name: "Salesforce", symbol: "CRM", value: 12000 },
        ],
      },
      {
        name: "Semiconductors",
        stocks: [
          { name: "NVIDIA", symbol: "NVDA", value: 32000 },
          { name: "AMD", symbol: "AMD", value: 15000 },
        ],
      },
      {
        name: "Cloud Infra",
        stocks: [
          { name: "Amazon AWS", symbol: "AMZN", value: 28000 },
          { name: "Google Cloud", symbol: "GOOG", value: 20000 },
        ],
      },
    ],
  },
  {
    name: "Healthcare",
    color: "#22c55e",
    industries: [
      {
        name: "Pharma",
        stocks: [
          { name: "Johnson & Johnson", symbol: "JNJ", value: 22000 },
          { name: "Pfizer", symbol: "PFE", value: 14000 },
        ],
      },
      {
        name: "Biotech",
        stocks: [
          { name: "Amgen", symbol: "AMGN", value: 18000 },
          { name: "Gilead", symbol: "GILD", value: 11000 },
          { name: "Moderna", symbol: "MRNA", value: 9000 },
        ],
      },
    ],
  },
  {
    name: "Finance",
    color: "#f59e0b",
    industries: [
      {
        name: "Banks",
        stocks: [
          { name: "JPMorgan Chase", symbol: "JPM", value: 30000 },
          { name: "Bank of America", symbol: "BAC", value: 18000 },
        ],
      },
      {
        name: "Insurance",
        stocks: [
          { name: "Berkshire Hath.", symbol: "BRK.B", value: 25000 },
          { name: "Progressive", symbol: "PGR", value: 10000 },
        ],
      },
      {
        name: "Fintech",
        stocks: [
          { name: "Visa", symbol: "V", value: 21000 },
          { name: "PayPal", symbol: "PYPL", value: 8000 },
        ],
      },
    ],
  },
  {
    name: "Energy",
    color: "#ef4444",
    industries: [
      {
        name: "Oil & Gas",
        stocks: [
          { name: "Exxon Mobil", symbol: "XOM", value: 20000 },
          { name: "Chevron", symbol: "CVX", value: 16000 },
        ],
      },
      {
        name: "Renewables",
        stocks: [
          { name: "NextEra Energy", symbol: "NEE", value: 13000 },
          { name: "Enphase", symbol: "ENPH", value: 7000 },
          { name: "First Solar", symbol: "FSLR", value: 6000 },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function totalValue(data: SectorNode[]): number {
  return data.reduce(
    (sum, s) =>
      sum + s.industries.reduce((si, ind) => si + ind.stocks.reduce((ss, st) => ss + st.value, 0), 0),
    0
  );
}

function sectorValue(s: SectorNode): number {
  return s.industries.reduce((si, ind) => si + ind.stocks.reduce((ss, st) => ss + st.value, 0), 0);
}

function industryValue(ind: IndustryNode): number {
  return ind.stocks.reduce((ss, st) => ss + st.value, 0);
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${nr},${ng},${nb})`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));
  return `rgb(${nr},${ng},${nb})`;
}

function arcPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
): string {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const s1 = toRad(startAngle);
  const e1 = toRad(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const outerStart = { x: cx + rOuter * Math.cos(s1), y: cy + rOuter * Math.sin(s1) };
  const outerEnd = { x: cx + rOuter * Math.cos(e1), y: cy + rOuter * Math.sin(e1) };
  const innerStart = { x: cx + rInner * Math.cos(e1), y: cy + rInner * Math.sin(e1) };
  const innerEnd = { x: cx + rInner * Math.cos(s1), y: cy + rInner * Math.sin(s1) };

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    `Z`,
  ].join(" ");
}

function formatMoney(v: number): string {
  if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
  return "$" + v.toFixed(0);
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SIZE = 440;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_INNER_0 = 60;
const R_OUTER_0 = 110;
const R_INNER_1 = 115;
const R_OUTER_1 = 160;
const R_INNER_2 = 165;
const R_OUTER_2 = 210;
const GAP_DEG = 1.2;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SunburstAllocation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drillSector, setDrillSector] = useState<number | null>(null);
  const [drillIndustry, setDrillIndustry] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [centerLabel, setCenterLabel] = useState<{ name: string; value: string }>({
    name: "Portfolio",
    value: formatMoney(totalValue(PORTFOLIO)),
  });

  /* Build flat segments */
  const segments = useMemo<FlatSegment[]>(() => {
    const segs: FlatSegment[] = [];
    const total = totalValue(PORTFOLIO);
    let angle = 0;

    PORTFOLIO.forEach((sector, si) => {
      const sVal = sectorValue(sector);
      const sDeg = (sVal / total) * 360 - GAP_DEG;

      // Ring 0 - sector
      segs.push({
        ring: 0,
        sectorIdx: si,
        industryIdx: null,
        stockIdx: null,
        name: sector.name,
        value: sVal,
        startAngle: angle,
        endAngle: angle + sDeg,
        color: sector.color,
      });

      let indAngle = angle;
      sector.industries.forEach((ind, ii) => {
        const iVal = industryValue(ind);
        const iDeg = (iVal / total) * 360 - GAP_DEG;

        // Ring 1 - industry
        segs.push({
          ring: 1,
          sectorIdx: si,
          industryIdx: ii,
          stockIdx: null,
          name: ind.name,
          value: iVal,
          startAngle: indAngle,
          endAngle: indAngle + iDeg,
          color: lighten(sector.color, 0.2),
        });

        let stAngle = indAngle;
        ind.stocks.forEach((st, sti) => {
          const stDeg = (st.value / total) * 360 - GAP_DEG;
          // Ring 2 - stock
          segs.push({
            ring: 2,
            sectorIdx: si,
            industryIdx: ii,
            stockIdx: sti,
            name: `${st.symbol} - ${st.name}`,
            value: st.value,
            startAngle: stAngle,
            endAngle: stAngle + stDeg,
            color: lighten(sector.color, 0.4),
          });
          stAngle += stDeg + GAP_DEG;
        });

        indAngle += iDeg + GAP_DEG;
      });

      angle += sDeg + GAP_DEG;
    });

    return segs;
  }, []);

  /* Filtered segments based on drill state */
  const visibleSegments = useMemo(() => {
    if (drillSector === null) return segments;
    if (drillIndustry === null) {
      return segments.filter((s) => s.sectorIdx === drillSector);
    }
    return segments.filter(
      (s) => s.sectorIdx === drillSector && (s.ring === 0 || s.industryIdx === drillIndustry)
    );
  }, [segments, drillSector, drillIndustry]);

  /* Recompute angles for drilled segments */
  const drillSegments = useMemo<FlatSegment[]>(() => {
    if (drillSector === null) return segments;

    const sector = PORTFOLIO[drillSector];
    const total =
      drillIndustry !== null
        ? industryValue(sector.industries[drillIndustry])
        : sectorValue(sector);

    const result: FlatSegment[] = [];
    let angle = 0;

    if (drillIndustry !== null) {
      // Show stocks of one industry
      const ind = sector.industries[drillIndustry];
      ind.stocks.forEach((st, sti) => {
        const deg = (st.value / total) * 360 - GAP_DEG;
        result.push({
          ring: 2,
          sectorIdx: drillSector,
          industryIdx: drillIndustry,
          stockIdx: sti,
          name: `${st.symbol} - ${st.name}`,
          value: st.value,
          startAngle: angle,
          endAngle: angle + deg,
          color: lighten(sector.color, 0.15 + sti * 0.12),
        });
        angle += deg + GAP_DEG;
      });
    } else {
      // Show industries of one sector
      sector.industries.forEach((ind, ii) => {
        const iVal = industryValue(ind);
        const iDeg = (iVal / total) * 360 - GAP_DEG;

        result.push({
          ring: 1,
          sectorIdx: drillSector,
          industryIdx: ii,
          stockIdx: null,
          name: ind.name,
          value: iVal,
          startAngle: angle,
          endAngle: angle + iDeg,
          color: lighten(sector.color, 0.15),
        });

        let stAngle = angle;
        ind.stocks.forEach((st, sti) => {
          const stDeg = (st.value / total) * 360 - GAP_DEG;
          result.push({
            ring: 2,
            sectorIdx: drillSector,
            industryIdx: ii,
            stockIdx: sti,
            name: `${st.symbol} - ${st.name}`,
            value: st.value,
            startAngle: stAngle,
            endAngle: stAngle + stDeg,
            color: lighten(sector.color, 0.3 + sti * 0.08),
          });
          stAngle += stDeg + GAP_DEG;
        });

        angle += iDeg + GAP_DEG;
      });

      // Add the sector as center ring
      result.unshift({
        ring: 0,
        sectorIdx: drillSector,
        industryIdx: null,
        stockIdx: null,
        name: sector.name,
        value: total,
        startAngle: 0,
        endAngle: 359.9,
        color: sector.color,
      });
    }

    return result;
  }, [segments, drillSector, drillIndustry]);

  /* Click handler */
  const handleSegmentClick = useCallback(
    (seg: FlatSegment) => {
      if (seg.ring === 0 && drillSector === null) {
        setDrillSector(seg.sectorIdx);
        const s = PORTFOLIO[seg.sectorIdx];
        setCenterLabel({ name: s.name, value: formatMoney(sectorValue(s)) });
      } else if (seg.ring === 1 && drillIndustry === null) {
        setDrillIndustry(seg.industryIdx!);
        const ind = PORTFOLIO[seg.sectorIdx].industries[seg.industryIdx!];
        setCenterLabel({ name: ind.name, value: formatMoney(industryValue(ind)) });
      }
    },
    [drillSector, drillIndustry]
  );

  /* Reset / go back */
  const goBack = useCallback(() => {
    if (drillIndustry !== null) {
      setDrillIndustry(null);
      const s = PORTFOLIO[drillSector!];
      setCenterLabel({ name: s.name, value: formatMoney(sectorValue(s)) });
    } else if (drillSector !== null) {
      setDrillSector(null);
      setDrillIndustry(null);
      setCenterLabel({ name: "Portfolio", value: formatMoney(totalValue(PORTFOLIO)) });
    }
    setTooltip(null);
  }, [drillSector, drillIndustry]);

  /* Mouse hover */
  const handleHover = useCallback(
    (e: ReactMouseEvent, seg: FlatSegment) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const total = drillSector !== null
        ? (drillIndustry !== null
            ? industryValue(PORTFOLIO[drillSector].industries[drillIndustry])
            : sectorValue(PORTFOLIO[drillSector]))
        : totalValue(PORTFOLIO);
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 40,
        name: seg.name,
        value: seg.value,
        pct: ((seg.value / total) * 100).toFixed(1) + "%",
      });
    },
    [drillSector, drillIndustry]
  );

  /* Determine ring radii for drill state */
  const ringRadii = useMemo(() => {
    if (drillSector !== null && drillIndustry !== null) {
      return {
        r0: { inner: 0, outer: 0 },
        r1: { inner: 0, outer: 0 },
        r2: { inner: 70, outer: 200 },
      };
    }
    if (drillSector !== null) {
      return {
        r0: { inner: R_INNER_0, outer: R_OUTER_0 },
        r1: { inner: R_INNER_1, outer: R_OUTER_1 },
        r2: { inner: R_INNER_2, outer: R_OUTER_2 },
      };
    }
    return {
      r0: { inner: R_INNER_0, outer: R_OUTER_0 },
      r1: { inner: R_INNER_1, outer: R_OUTER_1 },
      r2: { inner: R_INNER_2, outer: R_OUTER_2 },
    };
  }, [drillSector, drillIndustry]);

  const total = totalValue(PORTFOLIO);

  /* Breadcrumbs */
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: "Portfolio", action: () => { setDrillSector(null); setDrillIndustry(null); setCenterLabel({ name: "Portfolio", value: formatMoney(total) }); } }];
    if (drillSector !== null) {
      const s = PORTFOLIO[drillSector];
      crumbs.push({ label: s.name, action: () => { setDrillIndustry(null); setCenterLabel({ name: s.name, value: formatMoney(sectorValue(s)) }); } });
    }
    if (drillIndustry !== null && drillSector !== null) {
      const ind = PORTFOLIO[drillSector].industries[drillIndustry];
      crumbs.push({ label: ind.name, action: () => {} });
    }
    return crumbs;
  }, [drillSector, drillIndustry, total]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className="surface-glass"
      style={{
        borderRadius: "var(--radius-card)",
        padding: "16px 20px",
        color: "var(--ink)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <PieChart size={20} style={{ color: "var(--accent)" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Portfolio Allocation</span>
        {(drillSector !== null) && (
          <button
            onClick={goBack}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              fontSize: 11,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "var(--surface-emphasis)",
              color: "var(--ink-muted)",
            }}
          >
            <RotateCcw size={12} />
            Back
          </button>
        )}
      </div>

      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-muted)", marginBottom: 10 }}>
        {breadcrumbs.map((bc, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <ChevronRight size={10} />}
            <span
              onClick={bc.action}
              style={{
                cursor: i < breadcrumbs.length - 1 ? "pointer" : "default",
                color: i < breadcrumbs.length - 1 ? "var(--accent)" : "var(--ink-muted)",
              }}
            >
              {bc.label}
            </span>
          </span>
        ))}
      </div>

      {/* SVG */}
      <div className="sunburst-canvas" style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          style={{ display: "block" }}
        >
          {drillSegments.map((seg, i) => {
            if (seg.endAngle - seg.startAngle < 0.5) return null;
            const radii = seg.ring === 0 ? ringRadii.r0 : seg.ring === 1 ? ringRadii.r1 : ringRadii.r2;
            if (radii.inner === 0 && radii.outer === 0) return null;

            const d = arcPath(CX, CY, radii.inner, radii.outer, seg.startAngle, seg.endAngle);

            return (
              <path
                key={`seg-${i}`}
                d={d}
                fill={seg.color}
                stroke="var(--bg-canvas)"
                strokeWidth={1.5}
                style={{
                  cursor: seg.ring < 2 ? "pointer" : "default",
                  transition: "opacity 0.2s",
                }}
                opacity={0.85}
                onMouseEnter={(e) => handleHover(e, seg)}
                onMouseMove={(e) => handleHover(e, seg)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => handleSegmentClick(seg)}
              />
            );
          })}

          {/* Center label */}
          <g className="sunburst-center-label">
            <text
              className="sunburst-center-name"
              x={CX}
              y={CY - 6}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="var(--ink)"
            >
              {centerLabel.name}
            </text>
            <text
              className="sunburst-center-value"
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              fontSize={12}
              fill="var(--ink-muted)"
            >
              {centerLabel.value}
            </text>
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translateX(-50%)",
              background: "var(--surface-card)",
              border: "1px solid var(--surface-border)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "var(--ink)",
              boxShadow: "var(--shadow-sm)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 30,
            }}
          >
            <div style={{ fontWeight: 600 }}>{tooltip.name}</div>
            <div style={{ color: "var(--ink-muted)", marginTop: 2 }}>
              {formatMoney(tooltip.value)} ({tooltip.pct})
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        className="sunburst-legend"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "6px 16px",
          marginTop: 12,
          fontSize: 12,
        }}
      >
        {PORTFOLIO.map((s, i) => {
          const val = sectorValue(s);
          const pct = ((val / total) * 100).toFixed(1);
          return (
            <div
              key={s.name}
              className="sunburst-legend-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                borderRadius: 6,
                background:
                  drillSector === i ? "var(--surface-emphasis)" : "transparent",
                cursor: "pointer",
              }}
              onClick={() => {
                setDrillSector(i);
                setDrillIndustry(null);
                setCenterLabel({ name: s.name, value: formatMoney(val) });
              }}
            >
              <span
                className="sunburst-legend-dot"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--ink)", flex: 1 }}>{s.name}</span>
              <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
