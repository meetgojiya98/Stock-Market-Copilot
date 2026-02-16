"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Minus,
  Pin,
  Square,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface VTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
  pinned?: boolean;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
}

export interface VirtualDataTableProps<T = Record<string, unknown>> {
  columns: VTableColumn<T>[];
  data: T[];
  rowHeight?: number;
  height?: number;
  onSelectionChange?: (selectedIndices: Set<number>) => void;
}

type SortDir = "asc" | "desc" | null;

interface SortState {
  key: string;
  dir: SortDir;
}

/* ------------------------------------------------------------------ */
/* Sparkline SVG helper                                                */
/* ------------------------------------------------------------------ */

function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const lineColor = color || (data[data.length - 1] >= data[0] ? "#22c55e" : "#ef4444");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mock stock data generator for demo mode                             */
/* ------------------------------------------------------------------ */

interface StockRow {
  [key: string]: unknown;
  id: number;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap: number;
  pe: number;
  sparkline: number[];
}

const SYMBOLS = [
  "AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
  "UNH", "JNJ", "V", "JPM", "XOM", "PG", "MA", "HD", "CVX", "MRK",
  "ABBV", "LLY", "PEP", "KO", "COST", "AVGO", "WMT", "MCD", "CSCO",
  "ACN", "TMO", "ABT", "DHR", "NEE", "LIN", "TXN", "PM", "CMCSA",
  "VZ", "INTC", "NKE", "ORCL", "CRM", "AMD", "IBM", "QCOM", "HON",
  "UNP", "LOW", "AMAT", "UPS", "GS",
];

const NAMES = [
  "Apple Inc.", "Microsoft Corp.", "Alphabet Inc.", "Amazon.com Inc.", "NVIDIA Corp.",
  "Meta Platforms", "Tesla Inc.", "Berkshire Hathaway", "UnitedHealth Group", "Johnson & Johnson",
  "Visa Inc.", "JPMorgan Chase", "Exxon Mobil", "Procter & Gamble", "Mastercard",
  "Home Depot", "Chevron Corp.", "Merck & Co.", "AbbVie Inc.", "Eli Lilly",
  "PepsiCo Inc.", "Coca-Cola Co.", "Costco Wholesale", "Broadcom Inc.", "Walmart Inc.",
  "McDonald's Corp.", "Cisco Systems", "Accenture plc", "Thermo Fisher", "Abbott Labs",
  "Danaher Corp.", "NextEra Energy", "Linde plc", "Texas Instruments", "Philip Morris",
  "Comcast Corp.", "Verizon Comm.", "Intel Corp.", "Nike Inc.", "Oracle Corp.",
  "Salesforce Inc.", "AMD Inc.", "IBM Corp.", "Qualcomm Inc.", "Honeywell Intl.",
  "Union Pacific", "Lowe's Cos.", "Applied Materials", "United Parcel", "Goldman Sachs",
];

const SECTORS = [
  "Technology", "Technology", "Technology", "Consumer Cyclical", "Technology",
  "Technology", "Consumer Cyclical", "Financials", "Healthcare", "Healthcare",
  "Financials", "Financials", "Energy", "Consumer Defensive", "Financials",
  "Consumer Cyclical", "Energy", "Healthcare", "Healthcare", "Healthcare",
  "Consumer Defensive", "Consumer Defensive", "Consumer Defensive", "Technology", "Consumer Defensive",
  "Consumer Cyclical", "Technology", "Technology", "Healthcare", "Healthcare",
  "Healthcare", "Utilities", "Materials", "Technology", "Consumer Defensive",
  "Communication", "Communication", "Technology", "Consumer Cyclical", "Technology",
  "Technology", "Technology", "Technology", "Technology", "Industrials",
  "Industrials", "Consumer Cyclical", "Technology", "Industrials", "Financials",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockData(count: number): StockRow[] {
  const rng = seededRandom(42);
  const rows: StockRow[] = [];

  for (let i = 0; i < count; i++) {
    const idx = i % SYMBOLS.length;
    const basePrice = 20 + rng() * 480;
    const change = (rng() - 0.45) * basePrice * 0.06;
    const sparkData: number[] = [];
    let sv = basePrice - change;
    for (let j = 0; j < 20; j++) {
      sv += (rng() - 0.48) * basePrice * 0.01;
      sparkData.push(sv);
    }
    sparkData.push(basePrice);

    rows.push({
      id: i,
      symbol: i < SYMBOLS.length ? SYMBOLS[idx] : `${SYMBOLS[idx]}.${Math.floor(i / SYMBOLS.length)}`,
      name: NAMES[idx],
      sector: SECTORS[idx],
      price: Math.round(basePrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round((change / (basePrice - change)) * 10000) / 100,
      volume: Math.round(rng() * 50000000),
      marketCap: Math.round(rng() * 2000 * 100) / 100,
      pe: Math.round((10 + rng() * 50) * 100) / 100,
      sparkline: sparkData,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* Default demo columns                                                */
/* ------------------------------------------------------------------ */

function defaultColumns(): VTableColumn<StockRow>[] {
  return [
    {
      key: "symbol",
      label: "Symbol",
      width: 90,
      minWidth: 70,
      pinned: true,
      render: (v) => <span style={{ fontWeight: 700, fontSize: 13 }}>{String(v)}</span>,
    },
    { key: "name", label: "Company", width: 170, minWidth: 100 },
    { key: "sector", label: "Sector", width: 140, minWidth: 80 },
    {
      key: "price",
      label: "Price",
      width: 100,
      minWidth: 70,
      align: "right",
      render: (v) => `$${Number(v).toFixed(2)}`,
    },
    {
      key: "change",
      label: "Change",
      width: 90,
      minWidth: 70,
      align: "right",
      render: (v) => {
        const n = Number(v);
        return (
          <span style={{ color: n >= 0 ? "#22c55e" : "#ef4444", fontWeight: 500 }}>
            {n >= 0 ? "+" : ""}{n.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "changePct",
      label: "Change %",
      width: 95,
      minWidth: 70,
      align: "right",
      render: (v) => {
        const n = Number(v);
        return (
          <span style={{ color: n >= 0 ? "#22c55e" : "#ef4444", fontWeight: 500 }}>
            {n >= 0 ? "+" : ""}{n.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: "volume",
      label: "Volume",
      width: 110,
      minWidth: 80,
      align: "right",
      render: (v) => {
        const n = Number(v);
        if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
        if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
        return String(n);
      },
    },
    {
      key: "marketCap",
      label: "Mkt Cap (B)",
      width: 110,
      minWidth: 80,
      align: "right",
      render: (v) => `$${Number(v).toFixed(1)}B`,
    },
    {
      key: "pe",
      label: "P/E",
      width: 70,
      minWidth: 60,
      align: "right",
      render: (v) => Number(v).toFixed(1),
    },
    {
      key: "sparkline",
      label: "Trend",
      width: 100,
      minWidth: 80,
      align: "center",
      render: (v) => {
        const arr = v as number[];
        return <Sparkline data={arr} width={80} height={22} />;
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function VirtualDataTable<T extends Record<string, unknown> = StockRow>({
  columns: propColumns,
  data: propData,
  rowHeight = 38,
  height = 600,
  onSelectionChange,
}: Partial<VirtualDataTableProps<T>> = {}) {
  /* Demo fallback */
  const isDemo = !propColumns || !propData;
  const demoData = useMemo(() => (isDemo ? generateMockData(500) : []), [isDemo]);
  const rawColumns = (propColumns || defaultColumns()) as VTableColumn<T>[];
  const rawData = (propData || demoData) as T[];

  /* Column widths (mutable via resize) */
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    rawColumns.forEach((c) => (map[c.key] = c.width));
    return map;
  });

  /* Sort state */
  const [sort, setSort] = useState<SortState>({ key: "", dir: null });

  /* Selection state */
  const [selected, setSelected] = useState<Set<number>>(new Set());

  /* Scroll position */
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Resize state */
  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  /* Sorted data */
  const sortedData = useMemo(() => {
    if (!sort.key || !sort.dir) return rawData;
    const copy = [...rawData];
    const dir = sort.dir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const av = a[sort.key as keyof T];
      const bv = b[sort.key as keyof T];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return copy;
  }, [rawData, sort]);

  /* Virtual scroll calculations */
  const totalHeight = sortedData.length * rowHeight;
  const visibleCount = Math.ceil(height / rowHeight) + 2;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endIdx = Math.min(sortedData.length, startIdx + visibleCount);
  const visibleRows = sortedData.slice(startIdx, endIdx);

  /* Scroll handler */
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  /* Sort cycle */
  const cycleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      if (prev.dir === "desc") return { key: "", dir: null };
      return { key, dir: "asc" };
    });
  }, []);

  /* Selection handlers */
  const toggleRow = useCallback(
    (idx: number) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange],
  );

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === sortedData.length) {
        onSelectionChange?.(new Set());
        return new Set();
      }
      const all = new Set(sortedData.map((_, i) => i));
      onSelectionChange?.(all);
      return all;
    });
  }, [sortedData, onSelectionChange]);

  /* Resize handlers */
  const onResizeStart = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = { key, startX: e.clientX, startW: colWidths[key] || 100 };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const { key: rKey, startX, startW } = resizingRef.current;
        const col = rawColumns.find((c) => c.key === rKey);
        const minW = col?.minWidth || 50;
        const newW = Math.max(minW, startW + (ev.clientX - startX));
        setColWidths((prev) => ({ ...prev, [rKey]: newW }));
      };

      const onMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [colWidths, rawColumns],
  );

  /* Total table width */
  const totalWidth = rawColumns.reduce((sum, c) => sum + (colWidths[c.key] || c.width), 0) + 50; // +50 for checkbox col

  const checkboxColW = 50;
  const headerHeight = 40;

  /* Select all state */
  const allSelected = selected.size === sortedData.length && sortedData.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Selection info */}
      {selected.size > 0 && (
        <div style={{ fontSize: 12, opacity: 0.7, padding: "4px 8px" }}>
          {selected.size} row{selected.size > 1 ? "s" : ""} selected
        </div>
      )}

      {/* Table container */}
      <div
        className="vtable-container"
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height,
          overflow: "auto",
          border: "1px solid rgba(148,163,184,0.15)",
          borderRadius: 8,
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          className="vtable-header"
          style={{
            display: "flex",
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "rgba(30,30,40,0.95)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(148,163,184,0.15)",
            minWidth: totalWidth,
          }}
        >
          {/* Checkbox header */}
          <div
            style={{
              width: checkboxColW,
              minWidth: checkboxColW,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: headerHeight,
              position: "sticky",
              left: 0,
              zIndex: 12,
              background: "rgba(30,30,40,0.98)",
            }}
          >
            <button
              onClick={toggleAll}
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                border: `1.5px solid ${allSelected || someSelected ? "#8b5cf6" : "rgba(148,163,184,0.3)"}`,
                background: allSelected ? "#8b5cf6" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              {allSelected && <Check size={12} color="#fff" />}
              {someSelected && <Minus size={12} color="#8b5cf6" />}
            </button>
          </div>

          {/* Column headers */}
          {rawColumns.map((col) => {
            const w = colWidths[col.key] || col.width;
            const isSorted = sort.key === col.key;
            const isPinned = col.pinned;

            return (
              <div
                key={col.key}
                className="vtable-header-cell"
                onClick={() => col.key !== "sparkline" && cycleSort(col.key)}
                style={{
                  width: w,
                  minWidth: w,
                  height: headerHeight,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: col.key !== "sparkline" ? "pointer" : "default",
                  userSelect: "none",
                  position: isPinned ? "sticky" : "relative",
                  left: isPinned ? checkboxColW : undefined,
                  zIndex: isPinned ? 11 : 1,
                  background: isPinned ? "rgba(30,30,40,0.98)" : "transparent",
                  justifyContent:
                    col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
                  gap: 4,
                }}
              >
                {isPinned && <Pin size={10} style={{ opacity: 0.4 }} />}
                <span>{col.label}</span>
                {isSorted && sort.dir === "asc" && <ArrowUp size={12} style={{ opacity: 0.7 }} />}
                {isSorted && sort.dir === "desc" && <ArrowDown size={12} style={{ opacity: 0.7 }} />}
                {!isSorted && col.key !== "sparkline" && (
                  <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                )}

                {/* Resize handle */}
                <div
                  className="vtable-resize-handle"
                  onMouseDown={(e) => onResizeStart(e, col.key)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 4,
                    bottom: 4,
                    width: 5,
                    cursor: "col-resize",
                    borderRight: "2px solid rgba(148,163,184,0.15)",
                    zIndex: 5,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Virtual body */}
        <div
          className="vtable-body"
          style={{
            height: totalHeight,
            position: "relative",
            minWidth: totalWidth,
          }}
        >
          {visibleRows.map((row, vi) => {
            const realIdx = startIdx + vi;
            const isSelected = selected.has(realIdx);

            return (
              <div
                key={realIdx}
                className="vtable-row"
                style={{
                  position: "absolute",
                  top: realIdx * rowHeight,
                  height: rowHeight,
                  display: "flex",
                  width: "100%",
                  background: isSelected
                    ? "rgba(139,92,246,0.08)"
                    : realIdx % 2 === 0
                    ? "transparent"
                    : "rgba(148,163,184,0.03)",
                  borderBottom: "1px solid rgba(148,163,184,0.06)",
                  transition: "background 0.1s",
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    width: checkboxColW,
                    minWidth: checkboxColW,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    background: isSelected ? "rgba(139,92,246,0.12)" : "rgba(30,30,40,0.8)",
                  }}
                >
                  <button
                    onClick={() => toggleRow(realIdx)}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: `1.5px solid ${isSelected ? "#8b5cf6" : "rgba(148,163,184,0.25)"}`,
                      background: isSelected ? "#8b5cf6" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {isSelected && <Check size={10} color="#fff" />}
                  </button>
                </div>

                {/* Cells */}
                {rawColumns.map((col) => {
                  const w = colWidths[col.key] || col.width;
                  const isPinned = col.pinned;
                  const value = row[col.key as keyof T];

                  return (
                    <div
                      key={col.key}
                      className="vtable-cell"
                      style={{
                        width: w,
                        minWidth: w,
                        height: rowHeight,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 10px",
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        position: isPinned ? "sticky" : "relative",
                        left: isPinned ? checkboxColW : undefined,
                        zIndex: isPinned ? 3 : 0,
                        background: isPinned
                          ? isSelected
                            ? "rgba(139,92,246,0.12)"
                            : "rgba(30,30,40,0.9)"
                          : "transparent",
                        justifyContent:
                          col.align === "right"
                            ? "flex-end"
                            : col.align === "center"
                            ? "center"
                            : "flex-start",
                      }}
                    >
                      {col.render
                        ? col.render(value as unknown, row, realIdx)
                        : String(value ?? "")}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.5, padding: "0 4px" }}>
        <span>{sortedData.length} rows</span>
        <span>{rawColumns.length} columns</span>
      </div>
    </div>
  );
}
