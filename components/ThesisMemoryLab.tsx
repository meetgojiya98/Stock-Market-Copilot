"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  BookCopy,
  BrainCircuit,
  Clock3,
  History,
  Save,
  TrendingUp,
} from "lucide-react";
import { createLocalAlert } from "../lib/data-client";
import {
  fetchThesisLibrary,
  invalidateLatestThesis,
  saveThesisVersion,
  type ThesisLibrary,
  type ThesisSource,
  type ThesisStatus,
  type ThesisVersion,
} from "../lib/thesis-memory";

type ThesisMemoryLabProps = {
  symbols: string[];
  defaultSymbol?: string;
};

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function parseList(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: ThesisStatus) {
  return status === "active" ? "badge-positive" : "badge-negative";
}

export default function ThesisMemoryLab({ symbols, defaultSymbol }: ThesisMemoryLabProps) {
  const [library, setLibrary] = useState<ThesisLibrary>({ versions: [], updatedAt: new Date().toISOString() });
  const [activeSymbol, setActiveSymbol] = useState(
    normalizeSymbol(defaultSymbol || symbols[0] || "AAPL")
  );
  const [memo, setMemo] = useState("");
  const [confidence, setConfidence] = useState(60);
  const [source, setSource] = useState<ThesisSource>("manual");
  const [status, setStatus] = useState<ThesisStatus>("active");
  const [driversInput, setDriversInput] = useState("");
  const [invalidationInput, setInvalidationInput] = useState("");
  const [invalidateReason, setInvalidateReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const symbolUniverse = useMemo(() => {
    const fromLibrary = library.versions.map((item) => item.symbol);
    const merged = [...new Set([...symbols.map(normalizeSymbol), ...fromLibrary])].filter(Boolean);
    return merged.length ? merged : ["AAPL"];
  }, [library.versions, symbols]);

  const timeline = useMemo(
    () => library.versions.filter((item) => item.symbol === activeSymbol),
    [activeSymbol, library.versions]
  );

  const latest = timeline[0];
  const previous = timeline[1];
  const drift = latest && previous ? latest.confidence - previous.confidence : 0;

  const summary = useMemo(() => {
    const latestBySymbol = new Map<string, ThesisVersion>();
    library.versions.forEach((item) => {
      if (!latestBySymbol.has(item.symbol)) latestBySymbol.set(item.symbol, item);
    });
    const latestRows = [...latestBySymbol.values()];
    return {
      symbols: latestRows.length,
      active: latestRows.filter((item) => item.status === "active").length,
      invalidated: latestRows.filter((item) => item.status === "invalidated").length,
      driftAlerts: latestRows.filter((item) => Math.abs(item.confidenceDelta) >= 15).length,
    };
  }, [library.versions]);

  useEffect(() => {
    const load = async () => {
      const result = await fetchThesisLibrary();
      setLibrary(result.data);
    };
    load();
  }, []);

  useEffect(() => {
    if (symbolUniverse.includes(activeSymbol)) return;
    setActiveSymbol(symbolUniverse[0]);
  }, [activeSymbol, symbolUniverse]);

  const hydrateFromLatest = () => {
    if (!latest) return;
    setMemo(latest.memo);
    setConfidence(latest.confidence);
    setSource(latest.source);
    setStatus("active");
    setDriversInput(latest.keyDrivers.join(", "));
    setInvalidationInput(latest.invalidationTriggers.join(", "));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await saveThesisVersion({
        symbol: activeSymbol,
        memo,
        confidence,
        source,
        status,
        keyDrivers: parseList(driversInput),
        invalidationTriggers: parseList(invalidationInput),
      });

      setLibrary(result.data);

      if (!result.ok) {
        setError(result.detail || "Unable to save thesis memo.");
        return;
      }

      const savedVersion = result.version;
      if (savedVersion) {
        setActiveSymbol(savedVersion.symbol);
      }

      const msg = `Saved thesis version for ${activeSymbol}.`;
      setNotice(msg);
      createLocalAlert(activeSymbol, msg, "execution");

      if (result.driftAlert) {
        createLocalAlert(activeSymbol, result.driftAlert, "critical");
      }
      if (result.invalidatedAlert) {
        createLocalAlert(activeSymbol, result.invalidatedAlert, "critical");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInvalidate = async () => {
    if (!latest) {
      setError("No thesis available to invalidate.");
      return;
    }

    const result = await invalidateLatestThesis(activeSymbol, invalidateReason);
    setLibrary(result.data);

    if (!result.ok) {
      setError(result.detail || "Unable to invalidate thesis.");
      return;
    }

    const message =
      result.invalidatedAlert || `${activeSymbol} thesis invalidated and escalated.`;
    setNotice(message);
    setError("");
    createLocalAlert(activeSymbol, message, "critical");
    setInvalidateReason("");
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <BrainCircuit size={16} />
          AI Thesis Memory + Versioning
        </h3>
        <div className="text-xs muted">
          {library.updatedAt ? `Updated ${formatDate(library.updatedAt)}` : ""}
        </div>
      </div>

      <p className="text-xs muted">
        Save thesis versions per symbol, inspect what changed since prior memo, monitor confidence drift, and trigger invalidation alerts.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted flex items-center gap-1">
            <BookCopy size={12} />
            Tracked Symbols
          </div>
          <div className="mt-1 text-lg metric-value">{summary.symbols}</div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Active Theses</div>
          <div className="mt-1 text-lg metric-value text-[var(--positive)]">{summary.active}</div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Invalidated</div>
          <div className="mt-1 text-lg metric-value text-[var(--negative)]">{summary.invalidated}</div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted flex items-center gap-1">
            <TrendingUp size={12} />
            Confidence Drift Alerts
          </div>
          <div className="mt-1 text-lg metric-value">{summary.driftAlerts}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {symbolUniverse.slice(0, 16).map((symbol) => (
          <button
            key={symbol}
            onClick={() => setActiveSymbol(symbol)}
            className={`rounded-full px-2.5 py-1 text-xs border ${
              activeSymbol === symbol
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
            }`}
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.3fr_1fr] gap-4">
        <form className="space-y-3" onSubmit={handleSave}>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Symbol</div>
              <input
                value={activeSymbol}
                onChange={(event) => setActiveSymbol(event.target.value.toUpperCase())}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Source</div>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as ThesisSource)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="watchlist">Watchlist</option>
                <option value="research">Research</option>
              </select>
            </label>
          </div>

          <label className="block text-xs space-y-1">
            <div className="muted">Thesis Memo</div>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="w-full min-h-[120px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              placeholder="Describe the setup, edge, and why this idea should work."
              required
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="muted">Confidence</span>
                <span className="metric-value">{confidence.toFixed(0)}/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={confidence}
                onChange={(event) => setConfidence(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Status</div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ThesisStatus)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="invalidated">Invalidated</option>
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Key Drivers (comma/newline)</div>
              <textarea
                value={driversInput}
                onChange={(event) => setDriversInput(event.target.value)}
                className="w-full min-h-[88px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
                placeholder="EPS revision, margin expansion, product cycle"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Invalidation Triggers (comma/newline)</div>
              <textarea
                value={invalidationInput}
                onChange={(event) => setInvalidationInput(event.target.value)}
                className="w-full min-h-[88px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
                placeholder="Guidance cut, support break, volume fade"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3.5 py-2 text-sm font-semibold disabled:opacity-70"
            >
              <Save size={13} />
              {saving ? "Saving..." : "Save Thesis Version"}
            </button>
            {latest && (
              <button
                type="button"
                onClick={hydrateFromLatest}
                className="inline-flex items-center gap-1.5 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3.5 py-2 text-xs"
              >
                <History size={13} />
                Load Latest Memo
              </button>
            )}
          </div>
        </form>

        <aside className="space-y-3">
          <div className="card-elevated rounded-xl p-3">
            <div className="text-xs muted flex items-center gap-1">
              <Clock3 size={12} />
              Current Memo Snapshot
            </div>
            {latest ? (
              <div className="mt-2 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{latest.symbol}</span>
                  <span className={`rounded-full px-2 py-0.5 ${statusBadge(latest.status)}`}>
                    {latest.status.toUpperCase()}
                  </span>
                </div>
                <div className="muted">{formatDate(latest.createdAt)}</div>
                <div>Confidence: <span className="metric-value">{latest.confidence.toFixed(1)}</span></div>
                {previous && (
                  <div className={drift >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                    Drift vs prior memo: {drift >= 0 ? "+" : ""}{drift.toFixed(1)} points
                  </div>
                )}
                <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-[11px]">
                  {latest.memo}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs muted">
                No memo for {activeSymbol} yet.
              </div>
            )}
          </div>

          <div className="card-elevated rounded-xl p-3">
            <div className="text-xs muted flex items-center gap-1">
              <AlertOctagon size={12} />
              Invalidation Escalation
            </div>
            <textarea
              value={invalidateReason}
              onChange={(event) => setInvalidateReason(event.target.value)}
              className="mt-2 w-full min-h-[70px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              placeholder="Why is this thesis invalid now?"
            />
            <button
              onClick={handleInvalidate}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-3 py-2 text-xs"
            >
              Invalidate Latest Thesis
            </button>
          </div>
        </aside>
      </div>

      <div className="card-elevated rounded-xl p-3">
        <div className="text-sm font-semibold section-title">Version Timeline ({activeSymbol})</div>
        <div className="text-xs muted mt-1">What changed since last memo is attached to each checkpoint.</div>

        <div className="mt-2 space-y-2">
          {timeline.length === 0 && (
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-3 py-2 text-xs muted">
              No thesis versions saved for this symbol.
            </div>
          )}

          {timeline.slice(0, 12).map((version) => (
            <div
              key={version.id}
              className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="font-semibold">{formatDate(version.createdAt)}</div>
                <div className="flex items-center gap-2">
                  <span className="metric-value">{version.confidence.toFixed(1)}</span>
                  <span className={`rounded-full px-2 py-0.5 ${statusBadge(version.status)}`}>
                    {version.status}
                  </span>
                </div>
              </div>
              <div className="text-[11px] muted mt-1">
                Source: {version.source} • Drivers: {version.keyDrivers.length} • Triggers: {version.invalidationTriggers.length}
              </div>
              <div className="text-xs mt-1">{version.memo}</div>
              <div className="mt-2 text-[11px]">
                {version.changeSummary.map((line, index) => (
                  <div key={`${version.id}-change-${index}`} className="muted">
                    • {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
