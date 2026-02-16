"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  ChevronDown,
  Crown,
  Minus,
  Plus,
  Scale,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DimensionScore {
  dimension: string;
  scores: Record<string, number>; // symbol -> score 1-10
}

interface ComparisonResult {
  symbols: string[];
  dimensions: DimensionScore[];
  overallScores: Record<string, number>;
  verdict: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DIMENSIONS = [
  "Valuation",
  "Growth",
  "Profitability",
  "Cash Flow",
  "Debt",
  "Moat",
  "Management",
  "Momentum",
  "Risk",
  "Dividend",
] as const;

const DIMENSION_ICONS: Record<string, typeof BarChart3> = {
  Valuation: Scale,
  Growth: TrendingUp,
  Profitability: BarChart3,
  "Cash Flow": BarChart3,
  Debt: Minus,
  Moat: Award,
  Management: Star,
  Momentum: TrendingUp,
  Risk: Minus,
  Dividend: BarChart3,
};

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corp.",
  TSLA: "Tesla Inc.",
  META: "Meta Platforms",
  JPM: "JPMorgan Chase",
  V: "Visa Inc.",
  WMT: "Walmart Inc.",
  UNH: "UnitedHealth",
  HD: "Home Depot",
  PG: "Procter & Gamble",
  DIS: "Walt Disney",
  NFLX: "Netflix Inc.",
  CRM: "Salesforce Inc.",
  AMD: "AMD Inc.",
  INTC: "Intel Corp.",
  BA: "Boeing Co.",
  XOM: "ExxonMobil",
};

const COLORS = ["#a78bfa", "#38bdf8", "#22c55e", "#facc15"];

/* ------------------------------------------------------------------ */
/*  Deterministic hash-based score                                     */
/* ------------------------------------------------------------------ */

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function getScore(symbol: string, dimension: string): number {
  const h = hashString(`${symbol}-${dimension}-zentrade`);
  return (h % 10) + 1; // 1-10
}

/* ------------------------------------------------------------------ */
/*  Verdict generator                                                  */
/* ------------------------------------------------------------------ */

function generateVerdict(result: ComparisonResult): string {
  const { symbols, overallScores } = result;
  const sorted = [...symbols].sort((a, b) => overallScores[b] - overallScores[a]);
  const winner = sorted[0];
  const runnerUp = sorted[1];
  const winScore = overallScores[winner];
  const runnerScore = overallScores[runnerUp];

  const winnerName = COMPANY_NAMES[winner] || winner;
  const runnerName = COMPANY_NAMES[runnerUp] || runnerUp;

  /* Find winner's strongest dimensions */
  const winDims = result.dimensions
    .filter((d) => d.scores[winner] >= 8)
    .map((d) => d.dimension);

  const strongStr = winDims.length > 0
    ? `It excels particularly in ${winDims.slice(0, 3).join(", ")}.`
    : "It shows balanced strength across most dimensions.";

  if (winScore - runnerScore >= 15) {
    return `${winnerName} (${winner}) is the clear winner with an overall score of ${winScore} vs ${runnerName}'s ${runnerScore}. ${strongStr} The gap is significant enough to suggest a meaningful competitive advantage in the current market environment.`;
  }

  if (winScore - runnerScore >= 5) {
    return `${winnerName} (${winner}) edges ahead with a score of ${winScore} compared to ${runnerName}'s ${runnerScore}. ${strongStr} While the margin is moderate, ${winner} offers a better risk-adjusted profile for most investment horizons.`;
  }

  return `This is a close call between ${winnerName} (${winner}, score: ${winScore}) and ${runnerName} (${runnerUp}, score: ${runnerScore}). ${strongStr} The small gap means sector preference and individual risk tolerance should guide the final decision.`;
}

/* ------------------------------------------------------------------ */
/*  Generate comparison                                                */
/* ------------------------------------------------------------------ */

function generateComparison(symbols: string[]): ComparisonResult {
  const dimensions: DimensionScore[] = DIMENSIONS.map((dim) => {
    const scores: Record<string, number> = {};
    symbols.forEach((sym) => {
      scores[sym] = getScore(sym, dim);
    });
    return { dimension: dim, scores };
  });

  const overallScores: Record<string, number> = {};
  symbols.forEach((sym) => {
    overallScores[sym] = dimensions.reduce((sum, d) => sum + d.scores[sym], 0);
  });

  const result: ComparisonResult = { symbols, dimensions, overallScores, verdict: "" };
  result.verdict = generateVerdict(result);
  return result;
}

/* ------------------------------------------------------------------ */
/*  Score color                                                        */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#a78bfa";
  if (score >= 4) return "#facc15";
  return "#ef4444";
}

function overallColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.9) return "#22c55e";
  if (ratio >= 0.75) return "#a78bfa";
  if (ratio >= 0.6) return "#facc15";
  return "#ef4444";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AIStockComparator() {
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "MSFT", "GOOGL"]);
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const runComparison = useCallback((syms: string[]) => {
    if (syms.length < 2) return;
    setIsComparing(true);
    setTimeout(() => {
      setResult(generateComparison(syms));
      setIsComparing(false);
    }, 400);
  }, []);

  useEffect(() => {
    runComparison(symbols);
  }, [runComparison, symbols]);

  const addSymbol = () => {
    const sym = inputValue.trim().toUpperCase();
    if (sym && !symbols.includes(sym) && symbols.length < 4) {
      setSymbols((prev) => [...prev, sym]);
      setInputValue("");
      setShowInput(false);
    }
  };

  const removeSymbol = (sym: string) => {
    if (symbols.length <= 2) return;
    setSymbols((prev) => prev.filter((s) => s !== sym));
  };

  const maxOverall = result ? Math.max(...Object.values(result.overallScores)) : 0;

  return (
    <div style={{ background: "var(--card, #1e1e2f)", borderRadius: 16, padding: 24, color: "var(--foreground, #e2e2e2)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Scale size={22} style={{ color: "#a78bfa" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>AI Stock Comparator</h3>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Multi-dimensional analysis across {DIMENSIONS.length} factors</span>
          </div>
        </div>
      </div>

      {/* Symbol chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {symbols.map((sym, i) => (
          <div
            key={sym}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.25)",
              border: `1px solid ${COLORS[i % COLORS.length]}40`,
              borderRadius: 10,
              padding: "8px 14px",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{sym}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{COMPANY_NAMES[sym] || sym}</div>
            </div>
            {symbols.length > 2 && (
              <button
                onClick={() => removeSymbol(sym)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 2, marginLeft: 4 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {symbols.length < 4 && (
          <>
            {showInput ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") addSymbol(); if (e.key === "Escape") { setShowInput(false); setInputValue(""); } }}
                  placeholder="SYMBOL"
                  maxLength={5}
                  autoFocus
                  style={{
                    width: 80,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(167,139,250,0.4)",
                    background: "rgba(0,0,0,0.3)",
                    color: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    textTransform: "uppercase",
                  }}
                />
                <button
                  onClick={addSymbol}
                  style={{
                    background: "#a78bfa",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowInput(false); setInputValue(""); }}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInput(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(167,139,250,0.1)",
                  border: "1px dashed rgba(167,139,250,0.35)",
                  borderRadius: 10,
                  color: "#a78bfa",
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Plus size={16} /> Add Stock
              </button>
            )}
          </>
        )}
      </div>

      {/* Overall score circles */}
      {result && !isComparing && (
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24 }}>
          {result.symbols.map((sym, i) => {
            const score = result.overallScores[sym];
            const isWinner = score === maxOverall;
            const color = COLORS[i % COLORS.length];
            const pct = Math.round((score / 100) * 100);
            const circumference = 2 * Math.PI * 38;
            const offset = circumference - (pct / 100) * circumference;
            return (
              <div key={sym} className="comparator-score" style={{ textAlign: "center", position: "relative" }}>
                {isWinner && (
                  <Crown size={18} style={{ color: "#facc15", position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)" }} />
                )}
                <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={44} cy={44} r={38} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
                  <circle
                    cx={44} cy={44} r={38}
                    fill="none"
                    stroke={color}
                    strokeWidth={5}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{score}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{sym}</div>
                <div style={{ fontSize: 11, opacity: 0.45 }}>/ 100</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison grid */}
      {isComparing ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
          <Sparkles size={24} style={{ animation: "spin 1.2s linear infinite", marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>Analyzing stocks...</div>
        </div>
      ) : result ? (
        <div className="comparator-grid" style={{ overflowX: "auto", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
            <thead>
              <tr>
                <th
                  className="comparator-label-cell"
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0.5,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  Dimension
                </th>
                {result.symbols.map((sym, i) => (
                  <th
                    key={sym}
                    className="comparator-header-cell"
                    style={{
                      textAlign: "center",
                      padding: "10px 14px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: COLORS[i % COLORS.length],
                    }}
                  >
                    {sym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.dimensions.map((dim) => {
                const maxScore = Math.max(...Object.values(dim.scores));
                return (
                  <tr key={dim.dimension} style={{ background: "rgba(0,0,0,0.12)", borderRadius: 8 }}>
                    <td
                      className="comparator-label-cell"
                      style={{
                        padding: "12px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: "8px 0 0 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {dim.dimension}
                    </td>
                    {result.symbols.map((sym, i) => {
                      const sc = dim.scores[sym];
                      const isMax = sc === maxScore;
                      return (
                        <td
                          key={sym}
                          className="comparator-cell"
                          style={{
                            textAlign: "center",
                            padding: "12px 14px",
                            borderRadius: i === result.symbols.length - 1 ? "0 8px 8px 0" : 0,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 36,
                              height: 28,
                              borderRadius: 6,
                              fontSize: 14,
                              fontWeight: 700,
                              background: isMax ? `${scoreColor(sc)}18` : "transparent",
                              color: isMax ? scoreColor(sc) : "rgba(255,255,255,0.6)",
                              border: isMax ? `1px solid ${scoreColor(sc)}40` : "1px solid transparent",
                            }}
                          >
                            {sc}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* AI Verdict */}
      {result && !isComparing && (
        <div
          className="comparator-verdict"
          style={{
            background: "rgba(167,139,250,0.06)",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Trophy size={18} style={{ color: "#facc15" }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>AI Verdict</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, opacity: 0.8 }}>
            {result.verdict}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
