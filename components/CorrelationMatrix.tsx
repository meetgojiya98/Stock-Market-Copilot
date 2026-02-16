"use client";

import { Fragment, useMemo } from "react";
import { GitBranch, Info, ShieldAlert } from "lucide-react";

type CorrelationMatrixProps = {
  symbols?: string[];
};

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM"];

// Sector groupings for realistic correlation generation
const SECTOR_MAP: Record<string, string> = {
  AAPL: "tech",
  MSFT: "tech",
  GOOGL: "tech",
  AMZN: "tech-retail",
  NVDA: "tech-semi",
  TSLA: "auto-tech",
  META: "tech-social",
  JPM: "finance",
  BAC: "finance",
  JNJ: "health",
  XOM: "energy",
  WMT: "retail",
  DIS: "entertainment",
  KO: "consumer",
  PFE: "health",
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCorrelationMatrix(symbols: string[]): number[][] {
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Generate a consistent seed from the symbol list
  const seed = symbols.join("").split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 42);
  const rand = seededRandom(seed);

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;
    for (let j = i + 1; j < n; j++) {
      const sectorI = SECTOR_MAP[symbols[i]] || "other";
      const sectorJ = SECTOR_MAP[symbols[j]] || "other";

      let baseCorr: number;

      // Same sector: high correlation
      if (sectorI === sectorJ) {
        baseCorr = 0.7 + rand() * 0.2; // 0.7-0.9
      }
      // Both tech-adjacent
      else if (sectorI.startsWith("tech") && sectorJ.startsWith("tech")) {
        baseCorr = 0.55 + rand() * 0.25; // 0.55-0.80
      }
      // One tech, one non-tech
      else if (sectorI.startsWith("tech") || sectorJ.startsWith("tech")) {
        baseCorr = 0.1 + rand() * 0.35; // 0.1-0.45
      }
      // Cross-sector (potentially negative for finance vs tech, etc.)
      else {
        baseCorr = -0.15 + rand() * 0.55; // -0.15 to 0.4
      }

      // Finance tends to be less correlated with tech
      if (
        (sectorI === "finance" && sectorJ.startsWith("tech")) ||
        (sectorJ === "finance" && sectorI.startsWith("tech"))
      ) {
        baseCorr = 0.05 + rand() * 0.3; // 0.05-0.35
      }

      // Add small noise
      const noise = (rand() - 0.5) * 0.08;
      const corr = Math.max(-1, Math.min(1, Number((baseCorr + noise).toFixed(2))));

      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return matrix;
}

function findHighCorrelations(
  symbols: string[],
  matrix: number[][]
): { pair: [string, string]; value: number }[] {
  const pairs: { pair: [string, string]; value: number }[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      if (Math.abs(matrix[i][j]) > 0.7) {
        pairs.push({ pair: [symbols[i], symbols[j]], value: matrix[i][j] });
      }
    }
  }
  return pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

function findLowCorrelations(
  symbols: string[],
  matrix: number[][]
): { pair: [string, string]; value: number }[] {
  const pairs: { pair: [string, string]; value: number }[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      if (Math.abs(matrix[i][j]) < 0.2) {
        pairs.push({ pair: [symbols[i], symbols[j]], value: matrix[i][j] });
      }
    }
  }
  return pairs.sort((a, b) => Math.abs(a.value) - Math.abs(b.value));
}

export default function CorrelationMatrix({
  symbols = DEFAULT_SYMBOLS,
}: CorrelationMatrixProps) {
  const matrix = useMemo(() => generateCorrelationMatrix(symbols), [symbols]);
  const highCorr = useMemo(() => findHighCorrelations(symbols, matrix), [symbols, matrix]);
  const lowCorr = useMemo(() => findLowCorrelations(symbols, matrix), [symbols, matrix]);

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]">
            <GitBranch size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Portfolio Correlation Matrix
            </div>
            <p className="text-xs muted mt-0.5">
              {symbols.length} assets analyzed &mdash; values range from -1 (inverse) to +1 (perfect correlation)
            </p>
          </div>
        </div>
      </div>

      {/* Matrix grid */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 overflow-x-auto">
        <div
          className="correlation-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `60px repeat(${symbols.length}, 1fr)`,
            gap: "2px",
            minWidth: `${60 + symbols.length * 56}px`,
          }}
        >
          {/* Top-left empty cell */}
          <div />

          {/* Column headers */}
          {symbols.map((sym) => (
            <div
              key={`col-${sym}`}
              className="correlation-header text-[10px] sm:text-[11px] font-semibold text-center py-1 truncate"
            >
              {sym}
            </div>
          ))}

          {/* Rows */}
          {symbols.map((rowSym, i) => (
            <Fragment key={`row-${rowSym}`}>
              {/* Row header */}
              <div
                className="correlation-header text-[10px] sm:text-[11px] font-semibold flex items-center truncate"
              >
                {rowSym}
              </div>

              {/* Cells */}
              {symbols.map((colSym, j) => {
                const val = matrix[i][j];
                const isPositive = val >= 0;
                const strength = Math.abs(val);
                const isDiagonal = i === j;

                return (
                  <div
                    key={`${rowSym}-${colSym}`}
                    className={`correlation-cell ${
                      isPositive ? "correlation-positive" : "correlation-negative"
                    } ${isDiagonal ? "font-bold" : ""}`}
                    style={
                      {
                        "--corr-strength": strength,
                        padding: "6px 2px",
                        textAlign: "center",
                        fontSize: "11px",
                        borderRadius: "4px",
                        fontVariantNumeric: "tabular-nums",
                      } as React.CSSProperties
                    }
                    title={`${rowSym} vs ${colSym}: ${val.toFixed(2)}`}
                  >
                    {val.toFixed(2)}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Interpretation */}
      {highCorr.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={14} style={{ color: "var(--warning)" }} />
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Correlation Insights
            </div>
          </div>
          <ul className="space-y-2">
            {highCorr.slice(0, 4).map(({ pair, value }) => (
              <li key={pair.join("-")} className="rounded-xl control-surface p-3 text-sm">
                <span className="font-semibold">{pair[0]}</span> and{" "}
                <span className="font-semibold">{pair[1]}</span> show{" "}
                <span
                  className="font-semibold"
                  style={{ color: value > 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {value > 0 ? "high positive" : "high negative"} correlation ({value.toFixed(2)})
                </span>{" "}
                &mdash; consider diversifying to reduce concentration risk.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rebalancing suggestion */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} style={{ color: "var(--accent)" }} />
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Rebalancing Suggestion
          </div>
        </div>
        <div className="text-sm space-y-2">
          {highCorr.length >= 2 ? (
            <>
              <p>
                Your portfolio has <span className="font-semibold">{highCorr.length} highly correlated pairs</span>.
                This may expose you to concentrated sector risk during downturns.
              </p>
              <p className="muted">
                Consider replacing one of{" "}
                <span className="font-semibold">{highCorr[0].pair[0]}</span> or{" "}
                <span className="font-semibold">{highCorr[0].pair[1]}</span> with
                an asset from a different sector (e.g., bonds, commodities, or international equities)
                to improve diversification.
              </p>
              {lowCorr.length > 0 && (
                <p className="muted">
                  Bright spot:{" "}
                  <span className="font-semibold">{lowCorr[0].pair[0]}</span> and{" "}
                  <span className="font-semibold">{lowCorr[0].pair[1]}</span>{" "}
                  have low correlation ({lowCorr[0].value.toFixed(2)}), providing good diversification benefit.
                </p>
              )}
            </>
          ) : (
            <p className="muted">
              Your portfolio shows reasonable diversification. Continue monitoring correlations
              over time as market conditions change.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
