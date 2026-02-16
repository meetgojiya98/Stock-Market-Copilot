"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  FileJson,
  FileText,
  BriefcaseBusiness,
  Eye,
  BookOpen,
  Bell,
  Flag,
  Package,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";

type DataSource = {
  id: string;
  label: string;
  icon: typeof Download;
  storageKey: string;
};

const SOURCES: DataSource[] = [
  { id: "portfolio", label: "Portfolio", icon: BriefcaseBusiness, storageKey: "smc_local_portfolio_v2" },
  { id: "watchlist", label: "Watchlist", icon: Eye, storageKey: "smc_local_watchlist_v2" },
  { id: "journal", label: "Trade Journal", icon: BookOpen, storageKey: "smc_trade_journal_v1" },
  { id: "alerts", label: "Price Alerts", icon: Bell, storageKey: "smc_price_alerts_v1" },
  { id: "goals", label: "Goals", icon: Flag, storageKey: "smc_goals_v1" },
];

type Format = "json" | "csv";

function loadData(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toCSV(data: unknown[]): string {
  if (data.length === 0) return "";
  const first = data[0] as Record<string, unknown>;
  const headers = Object.keys(first);
  const rows = data.map((row) => {
    const r = row as Record<string, unknown>;
    return headers.map((h) => {
      const val = r[h];
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExport() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [format, setFormat] = useState<Format>("json");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);

  useEffect(() => {
    const c: Record<string, number> = {};
    for (const source of SOURCES) {
      c[source.id] = loadData(source.storageKey).length;
    }
    setCounts(c);
    const saved = localStorage.getItem("smc_last_export_time");
    if (saved) setLastExport(saved);
  }, []);

  const totalRecords = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  const showPreview = (sourceId: string) => {
    if (preview === sourceId) {
      setPreview(null);
      setPreviewContent("");
      return;
    }
    const source = SOURCES.find((s) => s.id === sourceId);
    if (!source) return;
    const data = loadData(source.storageKey);
    if (format === "json") {
      setPreviewContent(JSON.stringify(data, null, 2));
    } else {
      setPreviewContent(data.length > 0 ? toCSV(data) : "(no data)");
    }
    setPreview(sourceId);
  };

  const handleExport = useCallback((sourceId: string) => {
    const source = SOURCES.find((s) => s.id === sourceId);
    if (!source) return;
    const data = loadData(source.storageKey);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    if (format === "json") {
      downloadFile(JSON.stringify(data, null, 2), `zentrade_${source.id}_${timestamp}.json`, "application/json");
    } else {
      const csv = data.length > 0 ? toCSV(data) : "";
      downloadFile(csv, `zentrade_${source.id}_${timestamp}.csv`, "text/csv");
    }
    const now = new Date().toLocaleString();
    setLastExport(now);
    localStorage.setItem("smc_last_export_time", now);
    setExported(sourceId);
    setTimeout(() => setExported(null), 2000);
  }, [format]);

  const handleExportAll = useCallback(() => {
    const allData: Record<string, unknown[]> = {};
    for (const source of SOURCES) {
      allData[source.id] = loadData(source.storageKey);
    }
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    downloadFile(JSON.stringify(allData, null, 2), `zentrade_all_data_${timestamp}.json`, "application/json");
    const now = new Date().toLocaleString();
    setLastExport(now);
    localStorage.setItem("smc_last_export_time", now);
  }, []);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Package size={13} /> Data sources
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{SOURCES.length}</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <FileJson size={13} /> Total records
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{totalRecords}</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Clock size={13} /> Last export
          </div>
          <div className="mt-1 text-sm metric-value font-semibold truncate">
            {lastExport || "Never"}
          </div>
        </div>
      </div>

      {/* Format + Export All row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg control-surface p-1">
          <button
            onClick={() => setFormat("json")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              format === "json" ? "bg-[var(--accent)] text-white" : "muted hover:opacity-80"
            }`}
          >
            <span className="flex items-center gap-1"><FileJson size={12} /> JSON</span>
          </button>
          <button
            onClick={() => setFormat("csv")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              format === "csv" ? "bg-[var(--accent)] text-white" : "muted hover:opacity-80"
            }`}
          >
            <span className="flex items-center gap-1"><FileText size={12} /> CSV</span>
          </button>
        </div>
        <button
          onClick={handleExportAll}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
        >
          <Download size={13} /> Export All (JSON)
        </button>
      </div>

      {/* Data source cards */}
      <div className="space-y-2">
        {SOURCES.map((source) => {
          const Icon = source.icon;
          const count = counts[source.id] || 0;
          const isPreview = preview === source.id;
          const justExported = exported === source.id;
          return (
            <div key={source.id} className="rounded-2xl surface-glass dynamic-surface fade-up overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                    <Icon size={15} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold section-title">{source.label}</div>
                    <div className="text-xs muted">{count} record{count !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => showPreview(source.id)}
                      className="inline-flex items-center gap-1 rounded-lg control-surface px-3 py-2 text-xs font-semibold muted hover:opacity-80"
                    >
                      {isPreview ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Preview
                    </button>
                    <button
                      onClick={() => handleExport(source.id)}
                      disabled={count === 0}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                        count === 0
                          ? "control-surface muted opacity-50 cursor-not-allowed"
                          : justExported
                          ? "bg-[var(--positive)] text-white"
                          : "bg-[var(--accent)] text-white"
                      }`}
                    >
                      {justExported ? <><Check size={12} /> Done</> : <><Download size={12} /> Export</>}
                    </button>
                  </div>
                </div>
              </div>

              {isPreview && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                  <div className="rounded-xl control-surface p-3 overflow-x-auto">
                    {count === 0 ? (
                      <p className="text-sm muted">No data stored for this source yet.</p>
                    ) : (
                      <pre className="text-xs muted leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {previewContent}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
