"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { addPortfolioPosition } from "../lib/data-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ParsedRow = {
  symbol: string;
  shares: number;
  avg_cost: number;
  valid: boolean;
  errors: string[];
};

type ImportSummary = {
  added: number;
  skipped: number;
  errored: number;
};

/* ------------------------------------------------------------------ */
/*  Header aliases for common brokerage exports                        */
/* ------------------------------------------------------------------ */

const SYMBOL_ALIASES = [
  "symbol", "ticker", "stock", "sym", "instrument", "security",
  "stock symbol", "ticker symbol",
];

const SHARES_ALIASES = [
  "shares", "quantity", "qty", "units", "amount", "share",
  "current qty", "current quantity", "total shares",
];

const COST_ALIASES = [
  "avg_cost", "avgcost", "avg cost", "average cost", "cost basis",
  "cost", "price", "avg price", "average price", "cost per share",
  "cost/share", "purchase price", "unit cost",
];

function fuzzyMatch(header: string, aliases: string[]): boolean {
  const normalized = header.trim().toLowerCase().replace(/[_\-./]/g, " ");
  return aliases.some((alias) => {
    const normalizedAlias = alias.toLowerCase().replace(/[_\-./]/g, " ");
    return (
      normalized === normalizedAlias ||
      normalized.includes(normalizedAlias) ||
      normalizedAlias.includes(normalized)
    );
  });
}

function detectColumnMapping(headers: string[]): {
  symbolIdx: number;
  sharesIdx: number;
  costIdx: number;
} {
  let symbolIdx = -1;
  let sharesIdx = -1;
  let costIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (symbolIdx === -1 && fuzzyMatch(h, SYMBOL_ALIASES)) symbolIdx = i;
    else if (sharesIdx === -1 && fuzzyMatch(h, SHARES_ALIASES)) sharesIdx = i;
    else if (costIdx === -1 && fuzzyMatch(h, COST_ALIASES)) costIdx = i;
  }

  return { symbolIdx, sharesIdx, costIdx };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): {
  rows: ParsedRow[];
  headers: string[];
  mapping: { symbolIdx: number; sharesIdx: number; costIdx: number };
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], headers: [], mapping: { symbolIdx: -1, sharesIdx: -1, costIdx: -1 } };
  }

  const headers = parseCSVLine(lines[0]);
  const mapping = detectColumnMapping(headers);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const errors: string[] = [];

    // Symbol
    let symbol = "";
    if (mapping.symbolIdx >= 0 && cols[mapping.symbolIdx]) {
      symbol = cols[mapping.symbolIdx].replace(/[^A-Za-z.]/g, "").toUpperCase();
    }
    if (!symbol) errors.push("Missing symbol");

    // Shares
    let shares = 0;
    if (mapping.sharesIdx >= 0 && cols[mapping.sharesIdx]) {
      shares = Number(cols[mapping.sharesIdx].replace(/[^0-9.]/g, ""));
    }
    if (!Number.isFinite(shares) || shares <= 0) errors.push("Invalid shares");

    // Avg cost
    let avg_cost = 0;
    if (mapping.costIdx >= 0 && cols[mapping.costIdx]) {
      avg_cost = Number(cols[mapping.costIdx].replace(/[$,]/g, ""));
    }
    if (!Number.isFinite(avg_cost) || avg_cost < 0) errors.push("Invalid cost");

    rows.push({
      symbol,
      shares,
      avg_cost,
      valid: errors.length === 0,
      errors,
    });
  }

  return { rows, headers, mapping };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type PortfolioImporterProps = {
  onImported?: () => void;
};

export default function PortfolioImporter({ onImported }: PortfolioImporterProps) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ symbolIdx: number; sharesIdx: number; costIdx: number }>({
    symbolIdx: -1,
    sharesIdx: -1,
    costIdx: -1,
  });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parseError, setParseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsedRows([]);
    setHeaders([]);
    setMapping({ symbolIdx: -1, sharesIdx: -1, costIdx: -1 });
    setSummary(null);
    setParseError("");
    setProgress(0);
    setImporting(false);
  };

  const handleFile = useCallback((file: File) => {
    reset();
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please upload a .csv file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text?.trim()) {
        setParseError("File is empty.");
        return;
      }
      const result = parseCSV(text);
      if (result.rows.length === 0) {
        setParseError("No data rows found. Ensure the CSV has a header row and at least one data row.");
        return;
      }
      if (result.mapping.symbolIdx === -1) {
        setParseError("Could not detect a symbol/ticker column. Expected headers like: symbol, ticker, stock.");
        return;
      }
      if (result.mapping.sharesIdx === -1) {
        setParseError("Could not detect a shares/quantity column. Expected headers like: shares, quantity, qty.");
        return;
      }
      setParsedRows(result.rows);
      setHeaders(result.headers);
      setMapping(result.mapping);
    };
    reader.onerror = () => setParseError("Failed to read file.");
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImportAll = async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (!validRows.length) return;

    setImporting(true);
    setSummary(null);
    setProgress(0);

    let added = 0;
    let skipped = 0;
    let errored = 0;
    const token = localStorage.getItem("access_token");

    // Also persist to smc_portfolio_v3 for avg_cost support
    let v3Data: { symbol: string; shares: number; avg_cost: number; name: string }[] = [];
    try {
      const raw = localStorage.getItem("smc_portfolio_v3");
      if (raw) v3Data = JSON.parse(raw);
      if (!Array.isArray(v3Data)) v3Data = [];
    } catch {
      v3Data = [];
    }

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const result = await addPortfolioPosition(row.symbol, row.shares, token || undefined);
        if (result.ok) {
          added++;
          // Merge into v3 data with avg_cost
          const existingIdx = v3Data.findIndex((p) => p.symbol === row.symbol);
          if (existingIdx >= 0) {
            const existing = v3Data[existingIdx];
            const totalShares = existing.shares + row.shares;
            const blendedCost =
              totalShares > 0
                ? ((existing.avg_cost || 0) * existing.shares + row.avg_cost * row.shares) / totalShares
                : row.avg_cost;
            v3Data[existingIdx] = {
              ...existing,
              shares: totalShares,
              avg_cost: blendedCost,
            };
          } else {
            v3Data.push({
              symbol: row.symbol,
              shares: row.shares,
              avg_cost: row.avg_cost,
              name: row.symbol,
            });
          }
        } else {
          skipped++;
        }
      } catch {
        errored++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    localStorage.setItem("smc_portfolio_v3", JSON.stringify(v3Data));

    setSummary({ added, skipped, errored });
    setImporting(false);
    if (added > 0) onImported?.();
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const errorCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <div className="card-elevated rounded-xl fade-up">
      {/* Toggle header */}
      <button
        onClick={() => { setOpen(!open); if (open) reset(); }}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold section-title">Import CSV</span>
          {summary && !open && (
            <span className="text-xs badge-positive rounded-full px-2 py-0.5 font-semibold">
              {summary.added} imported
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="muted" /> : <ChevronDown size={16} className="muted" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Drop zone */}
          {parsedRows.length === 0 && !parseError && (
            <div
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors p-8 flex flex-col items-center gap-3 ${
                dragging
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              <Upload
                size={32}
                className="muted"
                style={dragging ? { color: "var(--accent)" } : undefined}
              />
              <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                Drag & drop a CSV file here
              </div>
              <div className="text-xs muted">
                or click to browse. Supports Robinhood, Fidelity, Schwab exports.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-red-600 dark:text-red-300">{parseError}</div>
                <button
                  onClick={reset}
                  className="mt-1 text-xs underline muted"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Column mapping feedback */}
          {parsedRows.length > 0 && (
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-3 text-xs space-y-1">
              <div className="font-semibold muted uppercase tracking-wider text-[10px]">
                Detected Column Mapping
              </div>
              <div className="flex flex-wrap gap-3 mt-1">
                <span>
                  Symbol:{" "}
                  <strong style={{ color: mapping.symbolIdx >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {mapping.symbolIdx >= 0 ? headers[mapping.symbolIdx] : "Not found"}
                  </strong>
                </span>
                <span>
                  Shares:{" "}
                  <strong style={{ color: mapping.sharesIdx >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {mapping.sharesIdx >= 0 ? headers[mapping.sharesIdx] : "Not found"}
                  </strong>
                </span>
                <span>
                  Avg Cost:{" "}
                  <strong style={{ color: mapping.costIdx >= 0 ? "var(--positive)" : "var(--ink-muted)" }}>
                    {mapping.costIdx >= 0 ? headers[mapping.costIdx] : "Not found (optional)"}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border soft-divider bg-[color-mix(in_srgb,var(--surface)_86%,transparent)]">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-black/5 dark:bg-white/10">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Symbol</th>
                    <th className="px-3 py-2 font-medium">Shares</th>
                    <th className="px-3 py-2 font-medium">Avg Cost</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-black/5 dark:border-white/10 ${
                        !row.valid ? "bg-red-500/5" : ""
                      }`}
                    >
                      <td className="px-3 py-2 muted">{idx + 1}</td>
                      <td className={`px-3 py-2 font-semibold ${!row.symbol ? "text-[var(--negative)]" : ""}`}>
                        {row.symbol || "--"}
                      </td>
                      <td
                        className={`px-3 py-2 metric-value ${
                          row.errors.includes("Invalid shares") ? "text-[var(--negative)]" : ""
                        }`}
                      >
                        {row.shares || "--"}
                      </td>
                      <td
                        className={`px-3 py-2 metric-value ${
                          row.errors.includes("Invalid cost") ? "text-[var(--negative)]" : ""
                        }`}
                      >
                        {row.avg_cost > 0 ? `$${row.avg_cost.toFixed(2)}` : "--"}
                      </td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 badge-positive rounded-full px-2 py-0.5 text-xs font-semibold">
                            <CheckCircle2 size={12} /> Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 badge-negative rounded-full px-2 py-0.5 text-xs font-semibold"
                            title={row.errors.join(", ")}
                          >
                            <XCircle size={12} /> {row.errors.join(", ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary stats & actions */}
          {parsedRows.length > 0 && !summary && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs">
                <span style={{ color: "var(--positive)" }} className="font-semibold">
                  {validCount} valid
                </span>
                {errorCount > 0 && (
                  <span style={{ color: "var(--negative)" }} className="font-semibold">
                    {errorCount} errors
                  </span>
                )}
                <span className="muted">{parsedRows.length} total rows</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportAll}
                  disabled={importing || validCount === 0}
                  className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2 text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Importing {progress}%
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Import All ({validCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div className="w-full rounded-full h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>
          )}

          {/* Import summary */}
          {summary && (
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-4 space-y-2 fade-up">
              <div className="text-sm font-semibold section-title">Import Complete</div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1" style={{ color: "var(--positive)" }}>
                  <CheckCircle2 size={14} />
                  <strong>{summary.added}</strong> added
                </span>
                {summary.skipped > 0 && (
                  <span className="flex items-center gap-1 muted">
                    <AlertCircle size={14} />
                    <strong>{summary.skipped}</strong> skipped
                  </span>
                )}
                {summary.errored > 0 && (
                  <span className="flex items-center gap-1" style={{ color: "var(--negative)" }}>
                    <XCircle size={14} />
                    <strong>{summary.errored}</strong> errors
                  </span>
                )}
              </div>
              <button
                onClick={reset}
                className="mt-2 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs font-semibold"
              >
                Import Another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
