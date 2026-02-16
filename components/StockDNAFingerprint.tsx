"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Dna, Search, Plus, X, BarChart3 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Factor = {
  name: string;
  score: number;
  color: string;
};

type SymbolProfile = {
  symbol: string;
  factors: Factor[];
};

/* ------------------------------------------------------------------ */
/*  Factor definitions                                                */
/* ------------------------------------------------------------------ */

const FACTOR_NAMES = [
  "Growth",
  "Value",
  "Momentum",
  "Quality",
  "Volatility",
  "Size",
  "Dividend",
  "Profitability",
  "Leverage",
  "Liquidity",
  "Sentiment",
  "ESG",
];

const FACTOR_COLORS = [
  "#3b82f6", // Growth - indigo
  "#22c55e", // Value - green
  "#f59e0b", // Momentum - amber
  "#3b82f6", // Quality - blue
  "#ef4444", // Volatility - red
  "#a855f7", // Size - purple
  "#14b8a6", // Dividend - teal
  "#f97316", // Profitability - orange
  "#ec4899", // Leverage - pink
  "#06b6d4", // Liquidity - cyan
  "#84cc16", // Sentiment - lime
  "#10b981", // ESG - emerald
];

/* ------------------------------------------------------------------ */
/*  Hashing & score generation                                        */
/* ------------------------------------------------------------------ */

function hashSymbol(symbol: string): number {
  let hash = 0;
  const upper = symbol.toUpperCase().trim();
  for (let i = 0; i < upper.length; i++) {
    hash = ((hash << 5) - hash + upper.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function generateFactors(symbol: string): Factor[] {
  const hash = hashSymbol(symbol);
  const rng = seededRng(hash);
  return FACTOR_NAMES.map((name, i) => ({
    name,
    score: Math.round(15 + rng() * 80),
    color: FACTOR_COLORS[i],
  }));
}

function generateProfile(symbol: string): SymbolProfile {
  return {
    symbol: symbol.toUpperCase().trim(),
    factors: generateFactors(symbol),
  };
}

/* ------------------------------------------------------------------ */
/*  Radar chart helpers                                               */
/* ------------------------------------------------------------------ */

const RADAR_SIZE = 360;
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_R = 140;
const RADAR_RINGS = 5;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildRadarPolygon(factors: Factor[], radius: number): string {
  const count = factors.length;
  const step = 360 / count;
  return factors
    .map((f, i) => {
      const r = (f.score / 100) * radius;
      const { x, y } = polarToCartesian(RADAR_CX, RADAR_CY, r, i * step);
      return `${x},${y}`;
    })
    .join(" ");
}

function buildGridRing(ringIdx: number, factorCount: number): string {
  const r = (RADAR_R / RADAR_RINGS) * (ringIdx + 1);
  const step = 360 / factorCount;
  const points = Array.from({ length: factorCount }, (_, i) => {
    const { x, y } = polarToCartesian(RADAR_CX, RADAR_CY, r, i * step);
    return `${x},${y}`;
  });
  return points.join(" ");
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_SYMBOL = "AAPL";
const STORAGE_KEY = "dna-fingerprint-symbols";

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function StockDNAFingerprint() {
  const [primarySymbol, setPrimarySymbol] = useState(DEFAULT_SYMBOL);
  const [compareSymbol, setCompareSymbol] = useState("");
  const [inputVal, setInputVal] = useState(DEFAULT_SYMBOL);
  const [compareInputVal, setCompareInputVal] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  /* Load from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.primary) {
          setPrimarySymbol(parsed.primary);
          setInputVal(parsed.primary);
        }
        if (parsed.compare) {
          setCompareSymbol(parsed.compare);
          setCompareInputVal(parsed.compare);
          setShowCompare(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  /* Save to localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          primary: primarySymbol,
          compare: compareSymbol || undefined,
        })
      );
    } catch {
      // ignore
    }
  }, [primarySymbol, compareSymbol]);

  /* Profiles */
  const primaryProfile = useMemo(() => generateProfile(primarySymbol), [primarySymbol]);
  const compareProfile = useMemo(
    () => (compareSymbol ? generateProfile(compareSymbol) : null),
    [compareSymbol]
  );

  /* Handle submit */
  const handlePrimarySubmit = useCallback(() => {
    const val = inputVal.trim().toUpperCase();
    if (val.length > 0 && val.length <= 6) {
      setPrimarySymbol(val);
    }
  }, [inputVal]);

  const handleCompareSubmit = useCallback(() => {
    const val = compareInputVal.trim().toUpperCase();
    if (val.length > 0 && val.length <= 6) {
      setCompareSymbol(val);
    }
  }, [compareInputVal]);

  const removeCompare = useCallback(() => {
    setShowCompare(false);
    setCompareSymbol("");
    setCompareInputVal("");
  }, []);

  /* Radar polygons */
  const primaryPolygon = useMemo(
    () => buildRadarPolygon(primaryProfile.factors, RADAR_R),
    [primaryProfile]
  );
  const comparePolygon = useMemo(
    () => (compareProfile ? buildRadarPolygon(compareProfile.factors, RADAR_R) : ""),
    [compareProfile]
  );

  /* Grid rings */
  const gridRings = useMemo(
    () =>
      Array.from({ length: RADAR_RINGS }, (_, i) =>
        buildGridRing(i, FACTOR_NAMES.length)
      ),
    []
  );

  /* Axes */
  const axes = useMemo(() => {
    const count = FACTOR_NAMES.length;
    const step = 360 / count;
    return FACTOR_NAMES.map((name, i) => {
      const angle = i * step;
      const outer = polarToCartesian(RADAR_CX, RADAR_CY, RADAR_R + 18, angle);
      const end = polarToCartesian(RADAR_CX, RADAR_CY, RADAR_R, angle);
      return { name, angle, outer, end };
    });
  }, []);

  /* Average score */
  const primaryAvg = useMemo(
    () => Math.round(primaryProfile.factors.reduce((s, f) => s + f.score, 0) / 12),
    [primaryProfile]
  );
  const compareAvg = useMemo(
    () =>
      compareProfile
        ? Math.round(compareProfile.factors.reduce((s, f) => s + f.score, 0) / 12)
        : 0,
    [compareProfile]
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className="dna-container"
      style={{
        background: "var(--card-bg, #1a1a2e)",
        borderRadius: 12,
        border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
        padding: "16px 20px",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 560,
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Dna size={20} style={{ color: "#60a5fa" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Stock DNA Fingerprint</span>
      </div>

      {/* Symbol inputs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {/* Primary */}
        <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 160 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
            />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handlePrimarySubmit()}
              placeholder="Symbol"
              maxLength={6}
              style={{
                width: "100%",
                padding: "7px 10px 7px 28px",
                fontSize: 13,
                fontFamily: "monospace",
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#e2e8f0",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={handlePrimarySubmit}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(99,102,241,0.4)",
              color: "#e0e7ff",
            }}
          >
            Go
          </button>
        </div>

        {/* Compare toggle / input */}
        {!showCompare ? (
          <button
            onClick={() => setShowCompare(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "1px dashed rgba(255,255,255,0.15)",
              cursor: "pointer",
              background: "transparent",
              color: "#94a3b8",
            }}
          >
            <Plus size={14} />
            Compare
          </button>
        ) : (
          <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 160 }}>
            <input
              type="text"
              value={compareInputVal}
              onChange={(e) => setCompareInputVal(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCompareSubmit()}
              placeholder="Compare..."
              maxLength={6}
              style={{
                flex: 1,
                padding: "7px 10px",
                fontSize: 13,
                fontFamily: "monospace",
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.06)",
                color: "#fbbf24",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleCompareSubmit}
              style={{
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: "rgba(245,158,11,0.3)",
                color: "#fbbf24",
              }}
            >
              Go
            </button>
            <button
              onClick={removeCompare}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: "rgba(239,68,68,0.15)",
                color: "#f87171",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Symbol badges */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 13 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#3b82f6",
            }}
          />
          <span style={{ fontWeight: 700 }}>{primaryProfile.symbol}</span>
          <span style={{ color: "#64748b", fontSize: 11 }}>Avg: {primaryAvg}</span>
        </span>
        {compareProfile && (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            />
            <span style={{ fontWeight: 700, color: "#fbbf24" }}>{compareProfile.symbol}</span>
            <span style={{ color: "#64748b", fontSize: 11 }}>Avg: {compareAvg}</span>
          </span>
        )}
      </div>

      {/* Radar chart */}
      <div className="dna-radar-wrap" style={{ marginBottom: 12 }}>
        <svg
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          width="100%"
          style={{ display: "block" }}
        >
          {/* Grid rings */}
          {gridRings.map((ring, i) => (
            <polygon
              key={`ring-${i}`}
              points={ring}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          ))}

          {/* Axes */}
          {axes.map((axis, i) => (
            <g key={`axis-${i}`}>
              <line
                x1={RADAR_CX}
                y1={RADAR_CY}
                x2={axis.end.x}
                y2={axis.end.y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={0.5}
              />
              <text
                x={axis.outer.x}
                y={axis.outer.y}
                fontSize={8}
                fill="#64748b"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {axis.name}
              </text>
            </g>
          ))}

          {/* Compare polygon (behind) */}
          {comparePolygon && (
            <polygon
              points={comparePolygon}
              fill="rgba(245,158,11,0.1)"
              stroke="#f59e0b"
              strokeWidth={1.5}
              opacity={0.7}
            />
          )}

          {/* Primary polygon */}
          <polygon
            points={primaryPolygon}
            fill="rgba(99,102,241,0.15)"
            stroke="#3b82f6"
            strokeWidth={2}
          />

          {/* Primary dots */}
          {primaryProfile.factors.map((f, i) => {
            const angle = (360 / 12) * i;
            const r = (f.score / 100) * RADAR_R;
            const { x, y } = polarToCartesian(RADAR_CX, RADAR_CY, r, angle);
            return (
              <circle
                key={`pd-${i}`}
                cx={x}
                cy={y}
                r={3}
                fill="#3b82f6"
                stroke="#1a1a2e"
                strokeWidth={1}
              />
            );
          })}

          {/* Compare dots */}
          {compareProfile?.factors.map((f, i) => {
            const angle = (360 / 12) * i;
            const r = (f.score / 100) * RADAR_R;
            const { x, y } = polarToCartesian(RADAR_CX, RADAR_CY, r, angle);
            return (
              <circle
                key={`cd-${i}`}
                cx={x}
                cy={y}
                r={3}
                fill="#f59e0b"
                stroke="#1a1a2e"
                strokeWidth={1}
              />
            );
          })}

          {/* Center score */}
          <text
            x={RADAR_CX}
            y={RADAR_CY - 4}
            fontSize={22}
            fontWeight={800}
            fill="#e2e8f0"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {primaryAvg}
          </text>
          <text
            x={RADAR_CX}
            y={RADAR_CY + 14}
            fontSize={9}
            fill="#64748b"
            textAnchor="middle"
          >
            Overall
          </text>
        </svg>
      </div>

      {/* Color strip */}
      <div
        className="dna-color-strip"
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {primaryProfile.factors.map((f, i) => {
          const totalScore = primaryProfile.factors.reduce((s, ff) => s + ff.score, 0);
          const width = (f.score / totalScore) * 100;
          return (
            <div
              key={`cs-${i}`}
              className="dna-color-segment"
              style={{
                width: `${width}%`,
                background: f.color,
                opacity: 0.75,
              }}
              title={`${f.name}: ${f.score}`}
            />
          );
        })}
      </div>

      {/* Factor grid */}
      <div
        className="dna-factor-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 14px",
        }}
      >
        {primaryProfile.factors.map((f, i) => {
          const compareVal = compareProfile?.factors[i]?.score;
          return (
            <div
              key={f.name}
              className="dna-factor"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                padding: "6px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: f.color,
                      display: "inline-block",
                    }}
                  />
                  {f.name}
                </span>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e2e8f0" }}>
                  {f.score}
                  {compareVal !== undefined && (
                    <span style={{ color: "#f59e0b", marginLeft: 4, fontSize: 10 }}>
                      / {compareVal}
                    </span>
                  )}
                </span>
              </div>

              {/* Mini bar chart */}
              <div
                className="dna-factor-bar"
                style={{
                  position: "relative",
                  height: 6,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  className="dna-factor-fill"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${f.score}%`,
                    background: f.color,
                    opacity: 0.7,
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
                {compareVal !== undefined && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${compareVal}%`,
                      top: -1,
                      width: 2,
                      height: 8,
                      background: "#f59e0b",
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Factor summary */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          fontSize: 11,
          color: "#64748b",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <BarChart3 size={12} />
          Strongest: {primaryProfile.factors.reduce((a, b) => (a.score > b.score ? a : b)).name}{" "}
          ({primaryProfile.factors.reduce((a, b) => (a.score > b.score ? a : b)).score})
        </span>
        <span>
          Weakest: {primaryProfile.factors.reduce((a, b) => (a.score < b.score ? a : b)).name}{" "}
          ({primaryProfile.factors.reduce((a, b) => (a.score < b.score ? a : b)).score})
        </span>
      </div>
    </div>
  );
}
