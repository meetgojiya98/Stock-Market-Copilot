"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Filter,
  GripVertical,
  Layers,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Operator = ">" | "<" | "=" | "between";

interface FilterDefinition {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  defaultValue2: number;
  type: "number" | "select";
  options?: string[];
}

interface ActiveFilter {
  id: string;
  filterId: string;
  operator: Operator;
  value: number | string;
  value2: number | string;
}

interface ScreenResult {
  symbol: string;
  name: string;
  metrics: Record<string, string>;
}

interface SavedScreen {
  id: string;
  name: string;
  filters: ActiveFilter[];
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_saved_screens_v1";

const FILTER_PALETTE: FilterDefinition[] = [
  { id: "pe", name: "P/E Ratio", unit: "x", min: 0, max: 100, step: 1, defaultValue: 20, defaultValue2: 40, type: "number" },
  { id: "mktcap", name: "Market Cap", unit: "$B", min: 0, max: 3000, step: 10, defaultValue: 50, defaultValue2: 500, type: "number" },
  { id: "revgrowth", name: "Revenue Growth", unit: "%", min: -50, max: 200, step: 1, defaultValue: 10, defaultValue2: 50, type: "number" },
  { id: "margin", name: "Profit Margin", unit: "%", min: -100, max: 80, step: 1, defaultValue: 15, defaultValue2: 40, type: "number" },
  { id: "divyield", name: "Dividend Yield", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 2, defaultValue2: 5, type: "number" },
  { id: "beta", name: "Beta", unit: "", min: 0, max: 3, step: 0.1, defaultValue: 1, defaultValue2: 1.5, type: "number" },
  { id: "perf52w", name: "52W Performance", unit: "%", min: -80, max: 300, step: 1, defaultValue: 10, defaultValue2: 50, type: "number" },
  { id: "volume", name: "Volume", unit: "M", min: 0, max: 200, step: 1, defaultValue: 5, defaultValue2: 50, type: "number" },
  { id: "rsi", name: "RSI", unit: "", min: 0, max: 100, step: 1, defaultValue: 30, defaultValue2: 70, type: "number" },
  { id: "sector", name: "Sector", unit: "", min: 0, max: 0, step: 0, defaultValue: 0, defaultValue2: 0, type: "select", options: ["Technology", "Healthcare", "Financials", "Energy", "Consumer", "Industrials", "Utilities", "Real Estate"] },
  { id: "country", name: "Country", unit: "", min: 0, max: 0, step: 0, defaultValue: 0, defaultValue2: 0, type: "select", options: ["United States", "China", "United Kingdom", "Japan", "Germany", "Canada", "France", "India"] },
  { id: "epsgrowth", name: "EPS Growth", unit: "%", min: -100, max: 500, step: 1, defaultValue: 15, defaultValue2: 50, type: "number" },
];

const OPERATORS: Operator[] = [">", "<", "=", "between"];

/* ------------------------------------------------------------------ */
/*  Mock stock data                                                    */
/* ------------------------------------------------------------------ */

interface MockStock {
  symbol: string;
  name: string;
  pe: number;
  mktcap: number;
  revgrowth: number;
  margin: number;
  divyield: number;
  beta: number;
  perf52w: number;
  volume: number;
  rsi: number;
  sector: string;
  country: string;
  epsgrowth: number;
}

const MOCK_STOCKS: MockStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", pe: 28, mktcap: 2900, revgrowth: 8, margin: 26, divyield: 0.5, beta: 1.2, perf52w: 22, volume: 65, rsi: 58, sector: "Technology", country: "United States", epsgrowth: 12 },
  { symbol: "MSFT", name: "Microsoft Corp.", pe: 34, mktcap: 2800, revgrowth: 15, margin: 36, divyield: 0.8, beta: 0.9, perf52w: 18, volume: 28, rsi: 62, sector: "Technology", country: "United States", epsgrowth: 20 },
  { symbol: "NVDA", name: "NVIDIA Corp.", pe: 65, mktcap: 2200, revgrowth: 122, margin: 55, divyield: 0.03, beta: 1.7, perf52w: 180, volume: 48, rsi: 72, sector: "Technology", country: "United States", epsgrowth: 150 },
  { symbol: "GOOGL", name: "Alphabet Inc.", pe: 25, mktcap: 1900, revgrowth: 13, margin: 25, divyield: 0.0, beta: 1.1, perf52w: 28, volume: 22, rsi: 55, sector: "Technology", country: "United States", epsgrowth: 18 },
  { symbol: "AMZN", name: "Amazon.com Inc.", pe: 60, mktcap: 1800, revgrowth: 12, margin: 8, divyield: 0.0, beta: 1.2, perf52w: 15, volume: 40, rsi: 50, sector: "Consumer", country: "United States", epsgrowth: 45 },
  { symbol: "TSLA", name: "Tesla Inc.", pe: 75, mktcap: 800, revgrowth: 21, margin: 11, divyield: 0.0, beta: 2.0, perf52w: -5, volume: 95, rsi: 44, sector: "Consumer", country: "United States", epsgrowth: -10 },
  { symbol: "META", name: "Meta Platforms", pe: 27, mktcap: 1200, revgrowth: 25, margin: 35, divyield: 0.4, beta: 1.3, perf52w: 50, volume: 18, rsi: 64, sector: "Technology", country: "United States", epsgrowth: 35 },
  { symbol: "JPM", name: "JPMorgan Chase", pe: 12, mktcap: 550, revgrowth: 6, margin: 30, divyield: 2.4, beta: 1.1, perf52w: 25, volume: 10, rsi: 60, sector: "Financials", country: "United States", epsgrowth: 10 },
  { symbol: "UNH", name: "UnitedHealth Group", pe: 22, mktcap: 480, revgrowth: 10, margin: 8, divyield: 1.5, beta: 0.7, perf52w: 12, volume: 4, rsi: 48, sector: "Healthcare", country: "United States", epsgrowth: 14 },
  { symbol: "V", name: "Visa Inc.", pe: 30, mktcap: 520, revgrowth: 11, margin: 52, divyield: 0.8, beta: 0.9, perf52w: 16, volume: 7, rsi: 57, sector: "Financials", country: "United States", epsgrowth: 16 },
  { symbol: "XOM", name: "ExxonMobil Corp.", pe: 14, mktcap: 450, revgrowth: -3, margin: 12, divyield: 3.5, beta: 0.8, perf52w: 8, volume: 15, rsi: 45, sector: "Energy", country: "United States", epsgrowth: -8 },
  { symbol: "PG", name: "Procter & Gamble", pe: 26, mktcap: 380, revgrowth: 4, margin: 19, divyield: 2.4, beta: 0.4, perf52w: 5, volume: 6, rsi: 52, sector: "Consumer", country: "United States", epsgrowth: 6 },
  { symbol: "HD", name: "Home Depot Inc.", pe: 24, mktcap: 350, revgrowth: 3, margin: 14, divyield: 2.5, beta: 1.0, perf52w: 10, volume: 4, rsi: 50, sector: "Consumer", country: "United States", epsgrowth: 8 },
  { symbol: "ABBV", name: "AbbVie Inc.", pe: 16, mktcap: 310, revgrowth: 5, margin: 20, divyield: 3.8, beta: 0.6, perf52w: 14, volume: 8, rsi: 55, sector: "Healthcare", country: "United States", epsgrowth: 7 },
  { symbol: "CRM", name: "Salesforce Inc.", pe: 48, mktcap: 260, revgrowth: 11, margin: 17, divyield: 0.6, beta: 1.3, perf52w: 20, volume: 6, rsi: 60, sector: "Technology", country: "United States", epsgrowth: 25 },
  { symbol: "BABA", name: "Alibaba Group", pe: 10, mktcap: 210, revgrowth: 8, margin: 14, divyield: 1.2, beta: 0.8, perf52w: 35, volume: 12, rsi: 58, sector: "Technology", country: "China", epsgrowth: 20 },
  { symbol: "SHEL", name: "Shell PLC", pe: 8, mktcap: 220, revgrowth: -2, margin: 9, divyield: 3.9, beta: 0.7, perf52w: 6, volume: 5, rsi: 47, sector: "Energy", country: "United Kingdom", epsgrowth: -5 },
  { symbol: "TM", name: "Toyota Motor Corp.", pe: 11, mktcap: 280, revgrowth: 7, margin: 8, divyield: 2.8, beta: 0.5, perf52w: 9, volume: 3, rsi: 50, sector: "Consumer", country: "Japan", epsgrowth: 12 },
  { symbol: "SAP", name: "SAP SE", pe: 35, mktcap: 250, revgrowth: 9, margin: 22, divyield: 1.1, beta: 1.0, perf52w: 30, volume: 4, rsi: 63, sector: "Technology", country: "Germany", epsgrowth: 15 },
  { symbol: "RY", name: "Royal Bank of Canada", pe: 13, mktcap: 170, revgrowth: 5, margin: 28, divyield: 3.6, beta: 0.8, perf52w: 11, volume: 3, rsi: 53, sector: "Financials", country: "Canada", epsgrowth: 9 },
];

/* ------------------------------------------------------------------ */
/*  Screen runner                                                      */
/* ------------------------------------------------------------------ */

function runScreen(filters: ActiveFilter[]): ScreenResult[] {
  if (filters.length === 0) return [];

  const matched = MOCK_STOCKS.filter((stock) => {
    return filters.every((f) => {
      const def = FILTER_PALETTE.find((fp) => fp.id === f.filterId);
      if (!def) return true;

      if (def.type === "select") {
        const stockVal = (stock as unknown as Record<string, string>)[def.id];
        return stockVal === f.value;
      }

      const stockVal = (stock as unknown as Record<string, number>)[def.id];
      const v = Number(f.value);
      const v2 = Number(f.value2);

      switch (f.operator) {
        case ">": return stockVal > v;
        case "<": return stockVal < v;
        case "=": return Math.abs(stockVal - v) < def.step * 2;
        case "between": return stockVal >= Math.min(v, v2) && stockVal <= Math.max(v, v2);
        default: return true;
      }
    });
  });

  const activeFilterIds = filters.map((f) => f.filterId);
  return matched.slice(0, 10).map((stock) => {
    const metrics: Record<string, string> = {};
    activeFilterIds.forEach((fid) => {
      const def = FILTER_PALETTE.find((fp) => fp.id === fid);
      if (!def) return;
      const val = (stock as unknown as Record<string, number | string>)[def.id];
      metrics[def.name] = def.unit ? `${val}${def.unit}` : String(val);
    });
    return { symbol: stock.symbol, name: stock.name, metrics };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VisualScreenerBuilder() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [screenName, setScreenName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [dragOverBuilder, setDragOverBuilder] = useState(false);

  /* Load saved screens */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedScreens(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  /* Save to localStorage */
  const persistScreens = useCallback((screens: SavedScreen[]) => {
    setSavedScreens(screens);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(screens));
    } catch { /* ignore */ }
  }, []);

  /* Add a filter */
  const addFilter = useCallback((filterId: string) => {
    const def = FILTER_PALETTE.find((f) => f.id === filterId);
    if (!def) return;
    /* Allow duplicate filter types */
    const newFilter: ActiveFilter = {
      id: `${filterId}-${Date.now()}`,
      filterId,
      operator: def.type === "select" ? "=" : ">",
      value: def.type === "select" ? (def.options?.[0] || "") : def.defaultValue,
      value2: def.defaultValue2,
    };
    setActiveFilters((prev) => [...prev, newFilter]);
    setHasRun(false);
  }, []);

  /* Remove filter */
  const removeFilter = useCallback((id: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== id));
    setHasRun(false);
  }, []);

  /* Update filter */
  const updateFilter = useCallback((id: string, updates: Partial<ActiveFilter>) => {
    setActiveFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
    setHasRun(false);
  }, []);

  /* Run screen */
  const handleRun = useCallback(() => {
    const res = runScreen(activeFilters);
    setResults(res);
    setHasRun(true);
  }, [activeFilters]);

  /* Save screen */
  const handleSave = useCallback(() => {
    if (!screenName.trim()) return;
    const newScreen: SavedScreen = {
      id: `screen-${Date.now()}`,
      name: screenName.trim(),
      filters: activeFilters,
      timestamp: Date.now(),
    };
    const updated = [...savedScreens, newScreen];
    persistScreens(updated);
    setScreenName("");
    setShowSave(false);
  }, [screenName, activeFilters, savedScreens, persistScreens]);

  /* Load screen */
  const handleLoad = useCallback((screen: SavedScreen) => {
    setActiveFilters(screen.filters);
    setHasRun(false);
    setShowLoad(false);
  }, []);

  /* Delete saved screen */
  const handleDeleteSaved = useCallback((id: string) => {
    const updated = savedScreens.filter((s) => s.id !== id);
    persistScreens(updated);
  }, [savedScreens, persistScreens]);

  /* Drag handlers */
  const handleDragStart = (e: React.DragEvent, filterId: string) => {
    e.dataTransfer.setData("text/plain", filterId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverBuilder(true);
  };

  const handleDragLeave = () => setDragOverBuilder(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBuilder(false);
    const filterId = e.dataTransfer.getData("text/plain");
    if (filterId) addFilter(filterId);
  };

  return (
    <div className="screener-builder" style={{ background: "var(--card, #1e1e2f)", borderRadius: 16, padding: 24, color: "var(--foreground, #e2e2e2)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Filter size={22} style={{ color: "#a78bfa" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Visual Stock Screener</h3>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Drag filters to build your screen</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowLoad(!showLoad)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: 8, color: "#38bdf8", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            <Upload size={14} /> Load
          </button>
          <button
            onClick={() => setShowSave(!showSave)}
            disabled={activeFilters.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: activeFilters.length > 0 ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeFilters.length > 0 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8, color: activeFilters.length > 0 ? "#22c55e" : "rgba(255,255,255,0.3)",
              padding: "6px 12px", cursor: activeFilters.length > 0 ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600,
            }}
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      {/* Save dialog */}
      {showSave && (
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="Screen name..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)", color: "inherit", fontSize: 13, outline: "none" }}
          />
          <button onClick={handleSave} style={{ background: "#22c55e", border: "none", borderRadius: 8, color: "#fff", padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Save
          </button>
          <button onClick={() => setShowSave(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Load dialog */}
      {showLoad && (
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          {savedScreens.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.5, textAlign: "center", padding: 12 }}>No saved screens yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {savedScreens.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>{s.filters.length} filters</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleLoad(s)} style={{ background: "#38bdf8", border: "none", borderRadius: 6, color: "#fff", padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Load</button>
                    <button onClick={() => handleDeleteSaved(s.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter palette */}
      <div className="screener-filter-palette" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Filter Palette (drag or click to add)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FILTER_PALETTE.map((f) => (
            <div
              key={f.id}
              className="screener-filter-option"
              draggable
              onDragStart={(e) => handleDragStart(e, f.id)}
              onClick={() => addFilter(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: 8,
                padding: "7px 12px",
                cursor: "grab",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s ease",
                userSelect: "none",
              }}
            >
              <GripVertical size={12} style={{ opacity: 0.4 }} />
              {f.name}
              {f.unit && <span style={{ opacity: 0.4, fontSize: 10 }}>({f.unit})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Builder area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          minHeight: 120,
          background: dragOverBuilder ? "rgba(167,139,250,0.08)" : "rgba(0,0,0,0.15)",
          border: `2px dashed ${dragOverBuilder ? "#a78bfa" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          transition: "all 0.2s ease",
        }}
      >
        {activeFilters.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, opacity: 0.35 }}>
            <Layers size={28} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>Drop filters here or click them above to build your screen</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeFilters.map((af) => {
              const def = FILTER_PALETTE.find((f) => f.id === af.filterId);
              if (!def) return null;
              return (
                <div
                  key={af.id}
                  className="screener-filter-block"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(167,139,250,0.15)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    flexWrap: "wrap",
                  }}
                >
                  <GripVertical size={14} style={{ opacity: 0.3, cursor: "grab" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 120 }}>
                    {def.name}
                    {def.unit && <span style={{ opacity: 0.4, fontWeight: 400, marginLeft: 4 }}>({def.unit})</span>}
                  </span>

                  {def.type === "select" ? (
                    <select
                      value={af.value as string}
                      onChange={(e) => updateFilter(af.id, { value: e.target.value })}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(0,0,0,0.4)",
                        color: "inherit",
                        fontSize: 12,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {def.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      {/* Operator */}
                      <select
                        value={af.operator}
                        onChange={(e) => updateFilter(af.id, { operator: e.target.value as Operator })}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(0,0,0,0.4)",
                          color: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          outline: "none",
                          cursor: "pointer",
                          width: 80,
                        }}
                      >
                        {OPERATORS.map((op) => (
                          <option key={op} value={op}>
                            {op === "between" ? "between" : op}
                          </option>
                        ))}
                      </select>

                      {/* Value input */}
                      <input
                        type="number"
                        value={af.value as number}
                        onChange={(e) => updateFilter(af.id, { value: Number(e.target.value) })}
                        step={def.step}
                        style={{
                          width: 80,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(0,0,0,0.4)",
                          color: "inherit",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />

                      {af.operator === "between" && (
                        <>
                          <span style={{ fontSize: 12, opacity: 0.5 }}>and</span>
                          <input
                            type="number"
                            value={af.value2 as number}
                            onChange={(e) => updateFilter(af.id, { value2: Number(e.target.value) })}
                            step={def.step}
                            style={{
                              width: 80,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid rgba(255,255,255,0.15)",
                              background: "rgba(0,0,0,0.4)",
                              color: "inherit",
                              fontSize: 13,
                              outline: "none",
                            }}
                          />
                        </>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => removeFilter(af.id)}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6, padding: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={activeFilters.length === 0}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",
          background: activeFilters.length > 0 ? "#a78bfa" : "rgba(255,255,255,0.06)",
          color: activeFilters.length > 0 ? "#fff" : "rgba(255,255,255,0.3)",
          fontSize: 14,
          fontWeight: 700,
          cursor: activeFilters.length > 0 ? "pointer" : "not-allowed",
          marginBottom: 20,
          transition: "all 0.2s ease",
        }}
      >
        <Play size={16} /> Run Screen ({activeFilters.length} filter{activeFilters.length !== 1 ? "s" : ""})
      </button>

      {/* Results */}
      {hasRun && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Search size={16} style={{ color: "#a78bfa" }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Results</span>
            <span style={{ fontSize: 12, opacity: 0.45 }}>({results.length} matches)</span>
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, opacity: 0.4, fontSize: 13 }}>
              No stocks match your criteria. Try adjusting your filters.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, opacity: 0.5, textTransform: "uppercase" }}>Symbol</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, opacity: 0.5, textTransform: "uppercase" }}>Name</th>
                    {Object.keys(results[0]?.metrics || {}).map((key) => (
                      <th key={key} style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, fontWeight: 600, opacity: 0.5, textTransform: "uppercase" }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={row.symbol} style={{ background: "rgba(0,0,0,0.12)" }}>
                      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700, color: "#a78bfa", borderRadius: "8px 0 0 8px" }}>{row.symbol}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, opacity: 0.7 }}>{row.name}</td>
                      {Object.values(row.metrics).map((val, i) => (
                        <td key={i} style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, fontWeight: 600, borderRadius: i === Object.values(row.metrics).length - 1 ? "0 8px 8px 0" : 0 }}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
