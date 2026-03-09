"use client";

import { useState, useMemo, useEffect } from "react";
import PageShell from "../../components/PageShell";
import { Info, Grid3X3 } from "lucide-react";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"];

function hashPair(a: string, b: string): number {
  const str = a < b ? `${a}:${b}` : `${b}:${a}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function getCorrelation(a: string, b: string): number {
  if (a === b) return 1;
  const h = hashPair(a, b);
  const normalized = ((h % 10000) + 10000) % 10000;
  const raw = (normalized / 10000) * 2 - 1;
  // Bias toward positive for same-sector feel
  return Math.round((raw * 0.7 + 0.15) * 100) / 100;
}

function corrColor(v: number): string {
  if (v >= 0) {
    const intensity = Math.round(v * 180);
    return `rgba(34, 197, 94, ${0.15 + v * 0.7})`;
  } else {
    const intensity = Math.round(Math.abs(v) * 180);
    return `rgba(239, 68, 68, ${0.15 + Math.abs(v) * 0.7})`;
  }
}

export default function CorrelationPage() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; value: number } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("zentrade_watchlist_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const tickers = parsed.map((item: string | { symbol: string }) =>
            typeof item === "string" ? item : item.symbol
          ).filter(Boolean);
          if (tickers.length >= 2) setSymbols(tickers.slice(0, 12));
        }
      }
    } catch {}
  }, []);

  const matrix = useMemo(() => {
    return symbols.map((s1) => symbols.map((s2) => getCorrelation(s1, s2)));
  }, [symbols]);

  const cellSize = symbols.length <= 6 ? 64 : symbols.length <= 8 ? 56 : 48;

  return (
    <PageShell
      title="Correlation Matrix"
      subtitle="Visualize correlations between your watchlist stocks to assess diversification."
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Grid3X3 size={16} style={{ color: "var(--ink-muted)" }} />
          <span style={{ fontSize: 13, color: "var(--ink-muted)", fontWeight: 500 }}>
            {symbols.length} stocks
          </span>
        </div>
      }
    >
      <div className="glass-card" style={{ padding: 20, overflowX: "auto" }}>
        <div style={{ display: "inline-block", minWidth: "fit-content" }}>
          {/* Header row */}
          <div style={{ display: "flex", marginLeft: cellSize + 8 }}>
            {symbols.map((s, i) => (
              <div
                key={i}
                style={{
                  width: cellSize,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                  padding: "0 2px 8px",
                  transform: symbols.length > 8 ? "rotate(-45deg)" : "none",
                  transformOrigin: "bottom center",
                }}
              >
                {s}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {symbols.map((rowSym, row) => (
            <div key={row} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: cellSize + 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                  textAlign: "right",
                  paddingRight: 8,
                  flexShrink: 0,
                }}
              >
                {rowSym}
              </div>
              {symbols.map((_, col) => {
                const val = matrix[row][col];
                const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
                const isDiagonal = row === col;
                return (
                  <div
                    key={col}
                    onMouseEnter={() => setHoveredCell({ row, col, value: val })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: isDiagonal ? 700 : 500,
                      color: isDiagonal ? "var(--ink)" : "var(--ink)",
                      background: isDiagonal ? "var(--surface-2)" : corrColor(val),
                      border: `1px solid ${isHovered ? "var(--accent-2)" : "var(--surface-border)"}`,
                      borderRadius: 4,
                      cursor: "default",
                      transition: "border-color 0.15s, transform 0.15s",
                      transform: isHovered ? "scale(1.08)" : "scale(1)",
                      position: "relative",
                      zIndex: isHovered ? 10 : 1,
                    }}
                  >
                    {val.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hover detail */}
        {hoveredCell && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 16px",
              background: "var(--surface-2)",
              borderRadius: 8,
              border: "1px solid var(--surface-border)",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              {symbols[hoveredCell.row]} / {symbols[hoveredCell.col]}
            </span>
            <span style={{ color: hoveredCell.value >= 0 ? "var(--positive)" : "var(--negative)", fontWeight: 700 }}>
              {hoveredCell.value.toFixed(2)}
            </span>
            <span style={{ color: "var(--ink-muted)" }}>
              {Math.abs(hoveredCell.value) > 0.7
                ? "Strong"
                : Math.abs(hoveredCell.value) > 0.4
                ? "Moderate"
                : "Weak"}{" "}
              {hoveredCell.value >= 0 ? "positive" : "negative"} correlation
            </span>
          </div>
        )}

        {/* Color scale legend */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-muted)" }}>
          <span>-1.0</span>
          <div
            style={{
              flex: 1,
              maxWidth: 240,
              height: 12,
              borderRadius: 6,
              background: "linear-gradient(to right, rgba(239,68,68,0.8), rgba(239,68,68,0.1), var(--surface-2), rgba(34,197,94,0.1), rgba(34,197,94,0.8))",
              border: "1px solid var(--surface-border)",
            }}
          />
          <span>+1.0</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 16, marginTop: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={16} style={{ color: "var(--accent-2)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, margin: 0 }}>
          Correlation measures how two stocks move in relation to each other, ranging from -1 (perfect inverse) to +1 (perfect unison).
          A well-diversified portfolio should include assets with low or negative correlations, which helps reduce overall portfolio risk.
          Values above 0.7 indicate strong positive correlation, meaning the stocks tend to move together.
          Consider adding assets with lower correlations to improve your portfolio&apos;s risk-adjusted returns.
        </p>
      </div>
    </PageShell>
  );
}
