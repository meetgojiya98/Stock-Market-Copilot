"use client";

import { useState, useMemo } from "react";
import PageShell from "../../components/PageShell";
import { ChevronRight, X, TrendingUp, TrendingDown } from "lucide-react";

type Timeframe = "1D" | "1W" | "1M" | "3M";

interface SectorData {
  name: string;
  weight: number;
  returns: Record<Timeframe, number>;
  topStocks: { symbol: string; name: string; change: number }[];
}

function seededRand(seed: number): number {
  const s = ((seed * 16807 + 12345) % 2147483647);
  return ((s & 0x7fffffff) / 2147483647) * 2 - 1;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SECTORS: SectorData[] = [
  {
    name: "Technology",
    weight: 28,
    returns: { "1D": 0.85, "1W": 2.3, "1M": 4.1, "3M": 8.7 },
    topStocks: [
      { symbol: "AAPL", name: "Apple Inc.", change: 1.2 },
      { symbol: "MSFT", name: "Microsoft Corp.", change: 0.9 },
      { symbol: "NVDA", name: "NVIDIA Corp.", change: 2.1 },
      { symbol: "AVGO", name: "Broadcom Inc.", change: 0.5 },
      { symbol: "ORCL", name: "Oracle Corp.", change: -0.3 },
    ],
  },
  {
    name: "Healthcare",
    weight: 13,
    returns: { "1D": -0.4, "1W": 0.8, "1M": -1.2, "3M": 2.1 },
    topStocks: [
      { symbol: "UNH", name: "UnitedHealth", change: -0.6 },
      { symbol: "JNJ", name: "Johnson & Johnson", change: 0.3 },
      { symbol: "LLY", name: "Eli Lilly", change: 1.8 },
      { symbol: "PFE", name: "Pfizer Inc.", change: -1.1 },
      { symbol: "ABBV", name: "AbbVie Inc.", change: 0.2 },
    ],
  },
  {
    name: "Financials",
    weight: 12,
    returns: { "1D": 0.55, "1W": 1.6, "1M": 3.2, "3M": 5.4 },
    topStocks: [
      { symbol: "JPM", name: "JPMorgan Chase", change: 0.8 },
      { symbol: "BAC", name: "Bank of America", change: 0.4 },
      { symbol: "GS", name: "Goldman Sachs", change: 1.3 },
      { symbol: "WFC", name: "Wells Fargo", change: -0.2 },
      { symbol: "MS", name: "Morgan Stanley", change: 0.6 },
    ],
  },
  {
    name: "Consumer Disc",
    weight: 10,
    returns: { "1D": -0.2, "1W": -0.8, "1M": 1.5, "3M": 3.8 },
    topStocks: [
      { symbol: "AMZN", name: "Amazon.com", change: 0.7 },
      { symbol: "TSLA", name: "Tesla Inc.", change: -2.3 },
      { symbol: "HD", name: "Home Depot", change: 0.4 },
      { symbol: "NKE", name: "Nike Inc.", change: -0.9 },
      { symbol: "MCD", name: "McDonald's", change: 0.2 },
    ],
  },
  {
    name: "Consumer Staples",
    weight: 7,
    returns: { "1D": 0.15, "1W": 0.5, "1M": 0.9, "3M": 1.2 },
    topStocks: [
      { symbol: "PG", name: "Procter & Gamble", change: 0.3 },
      { symbol: "KO", name: "Coca-Cola Co.", change: 0.1 },
      { symbol: "PEP", name: "PepsiCo Inc.", change: -0.2 },
      { symbol: "COST", name: "Costco", change: 0.6 },
      { symbol: "WMT", name: "Walmart Inc.", change: 0.4 },
    ],
  },
  {
    name: "Energy",
    weight: 5,
    returns: { "1D": 1.2, "1W": 3.4, "1M": -2.1, "3M": -4.5 },
    topStocks: [
      { symbol: "XOM", name: "ExxonMobil", change: 1.5 },
      { symbol: "CVX", name: "Chevron Corp.", change: 0.9 },
      { symbol: "COP", name: "ConocoPhillips", change: 1.1 },
      { symbol: "SLB", name: "Schlumberger", change: 2.0 },
      { symbol: "EOG", name: "EOG Resources", change: 0.7 },
    ],
  },
  {
    name: "Industrials",
    weight: 8,
    returns: { "1D": 0.3, "1W": 1.1, "1M": 2.5, "3M": 4.0 },
    topStocks: [
      { symbol: "CAT", name: "Caterpillar", change: 0.5 },
      { symbol: "BA", name: "Boeing Co.", change: -1.2 },
      { symbol: "UNP", name: "Union Pacific", change: 0.3 },
      { symbol: "HON", name: "Honeywell", change: 0.8 },
      { symbol: "GE", name: "GE Aerospace", change: 1.0 },
    ],
  },
  {
    name: "Materials",
    weight: 3,
    returns: { "1D": -0.6, "1W": -1.2, "1M": -0.5, "3M": 1.8 },
    topStocks: [
      { symbol: "LIN", name: "Linde plc", change: 0.2 },
      { symbol: "APD", name: "Air Products", change: -0.4 },
      { symbol: "SHW", name: "Sherwin-Williams", change: 0.6 },
      { symbol: "FCX", name: "Freeport-McMoRan", change: -1.5 },
      { symbol: "NEM", name: "Newmont Corp.", change: 1.1 },
    ],
  },
  {
    name: "Utilities",
    weight: 3,
    returns: { "1D": 0.1, "1W": 0.3, "1M": 1.1, "3M": 2.5 },
    topStocks: [
      { symbol: "NEE", name: "NextEra Energy", change: 0.4 },
      { symbol: "DUK", name: "Duke Energy", change: 0.1 },
      { symbol: "SO", name: "Southern Co.", change: 0.2 },
      { symbol: "D", name: "Dominion Energy", change: -0.3 },
      { symbol: "AEP", name: "American Electric", change: 0.5 },
    ],
  },
  {
    name: "Real Estate",
    weight: 3,
    returns: { "1D": -0.3, "1W": -0.9, "1M": -1.8, "3M": -3.2 },
    topStocks: [
      { symbol: "PLD", name: "Prologis Inc.", change: -0.5 },
      { symbol: "AMT", name: "American Tower", change: -0.2 },
      { symbol: "CCI", name: "Crown Castle", change: -0.8 },
      { symbol: "EQIX", name: "Equinix Inc.", change: 0.3 },
      { symbol: "SPG", name: "Simon Property", change: -0.6 },
    ],
  },
  {
    name: "Comm Services",
    weight: 8,
    returns: { "1D": 0.7, "1W": 1.9, "1M": 3.6, "3M": 7.2 },
    topStocks: [
      { symbol: "GOOGL", name: "Alphabet Inc.", change: 1.0 },
      { symbol: "META", name: "Meta Platforms", change: 1.5 },
      { symbol: "NFLX", name: "Netflix Inc.", change: 0.8 },
      { symbol: "DIS", name: "Walt Disney", change: -0.4 },
      { symbol: "CMCSA", name: "Comcast Corp.", change: 0.2 },
    ],
  },
];

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M"];

function perfColor(val: number): string {
  if (val > 0) {
    const intensity = Math.min(val / 10, 1);
    return `rgba(34, 197, 94, ${0.3 + intensity * 0.5})`;
  } else {
    const intensity = Math.min(Math.abs(val) / 10, 1);
    return `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`;
  }
}

export default function SectorsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [selectedSector, setSelectedSector] = useState<SectorData | null>(null);

  // Build treemap layout: simple row-based packing
  const layout = useMemo(() => {
    const totalWeight = SECTORS.reduce((s, sec) => s + sec.weight, 0);
    const containerW = 800;
    const containerH = 500;
    const rects: { sector: SectorData; x: number; y: number; w: number; h: number }[] = [];

    // Simple squarified-ish layout by rows
    let remaining = [...SECTORS].sort((a, b) => b.weight - a.weight);
    let yOffset = 0;

    while (remaining.length > 0) {
      const rowItems: SectorData[] = [];
      let rowWeight = 0;
      const targetRowWeight = totalWeight * 0.25;

      while (remaining.length > 0 && (rowWeight < targetRowWeight || rowItems.length === 0)) {
        rowItems.push(remaining[0]);
        rowWeight += remaining[0].weight;
        remaining = remaining.slice(1);
      }

      const rowH = (rowWeight / totalWeight) * containerH;
      let xOffset = 0;

      for (const item of rowItems) {
        const w = (item.weight / rowWeight) * containerW;
        rects.push({ sector: item, x: xOffset, y: yOffset, w, h: rowH });
        xOffset += w;
      }
      yOffset += rowH;
    }

    return { rects, containerW, containerH };
  }, []);

  return (
    <PageShell
      title="Sector Rotation Map"
      subtitle="Analyze sector performance and market rotation across different timeframes."
      actions={
        <div style={{ display: "flex", gap: 6 }}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--surface-border)",
                background: timeframe === tf ? "var(--accent-2)" : "var(--surface-2)",
                color: timeframe === tf ? "#fff" : "var(--ink-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      }
    >
      <div className="glass-card" style={{ padding: 16, overflow: "hidden" }}>
        <div style={{ position: "relative", width: "100%", paddingBottom: `${(layout.containerH / layout.containerW) * 100}%` }}>
          <svg
            viewBox={`0 0 ${layout.containerW} ${layout.containerH}`}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          >
            {layout.rects.map(({ sector, x, y, w, h }) => {
              const perf = sector.returns[timeframe];
              return (
                <g
                  key={sector.name}
                  onClick={() => setSelectedSector(sector)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={w - 2}
                    height={h - 2}
                    rx={6}
                    fill={perfColor(perf)}
                    stroke="var(--surface-border)"
                    strokeWidth={1}
                  />
                  {w > 60 && h > 40 && (
                    <>
                      <text
                        x={x + w / 2}
                        y={y + h / 2 - 8}
                        textAnchor="middle"
                        fontSize={w > 120 ? 13 : 11}
                        fontWeight={700}
                        fill="var(--ink)"
                      >
                        {sector.name}
                      </text>
                      <text
                        x={x + w / 2}
                        y={y + h / 2 + 10}
                        textAnchor="middle"
                        fontSize={w > 120 ? 15 : 12}
                        fontWeight={700}
                        fill={perf >= 0 ? "var(--positive)" : "var(--negative)"}
                      >
                        {perf >= 0 ? "+" : ""}
                        {perf.toFixed(1)}%
                      </text>
                      {w > 100 && h > 60 && (
                        <text
                          x={x + w / 2}
                          y={y + h / 2 + 28}
                          textAnchor="middle"
                          fontSize={10}
                          fill="var(--ink-muted)"
                        >
                          {sector.weight}% weight
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Sector detail panel */}
      {selectedSector && (
        <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                {selectedSector.name}
              </h3>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 0" }}>
                {selectedSector.weight}% of S&P 500 market cap
              </p>
            </div>
            <button
              onClick={() => setSelectedSector(null)}
              style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}
            >
              <X size={16} style={{ color: "var(--ink-muted)" }} />
            </button>
          </div>

          {/* Timeframe returns */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {TIMEFRAMES.map((tf) => {
              const val = selectedSector.returns[tf];
              return (
                <div
                  key={tf}
                  style={{
                    padding: "8px 16px",
                    background: "var(--surface-2)",
                    borderRadius: 8,
                    border: `1px solid ${tf === timeframe ? "var(--accent-2)" : "var(--surface-border)"}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 500 }}>{tf}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: val >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {val >= 0 ? "+" : ""}{val.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top stocks table */}
          <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 10px" }}>Top 5 Stocks</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {selectedSector.topStocks.map((stock) => (
              <div
                key={stock.symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderRadius: 8,
                  border: "1px solid var(--surface-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {stock.change >= 0 ? (
                    <TrendingUp size={14} style={{ color: "var(--positive)" }} />
                  ) : (
                    <TrendingDown size={14} style={{ color: "var(--negative)" }} />
                  )}
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{stock.symbol}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-muted)", marginLeft: 8 }}>{stock.name}</span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: stock.change >= 0 ? "var(--positive)" : "var(--negative)",
                  }}
                >
                  {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
