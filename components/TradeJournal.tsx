"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";
import EmptyState from "./EmptyState";
import Tooltip from "./Tooltip";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmDialog";

type Emotion = "confident" | "nervous" | "neutral" | "excited" | "uncertain";
type Outcome = "good" | "bad" | "neutral" | "";

type JournalEntry = {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  date: string;
  reasoning: string;
  emotion: Emotion;
  outcome: Outcome;
};

const STORAGE_KEY = "smc_trade_journal_v1";

const EMOTION_COLORS: Record<Emotion, string> = {
  confident: "var(--positive)",
  nervous: "var(--negative)",
  neutral: "var(--ink-muted)",
  excited: "var(--accent)",
  uncertain: "var(--warning)",
};

const EMOTION_LABELS: Emotion[] = ["confident", "nervous", "neutral", "excited", "uncertain"];

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function TradeJournal() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const addFormRef = useRef<HTMLFormElement>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [symbol, setSymbol] = useState("");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reasoning, setReasoning] = useState("");
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [outcome, setOutcome] = useState<Outcome>("");

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return entries;
    return entries.filter((e) => e.symbol.includes(q));
  }, [entries, filter]);

  const stats = useMemo(() => {
    const symbolCounts: Record<string, number> = {};
    const emotionCounts: Record<string, number> = {};
    for (const e of entries) {
      symbolCounts[e.symbol] = (symbolCounts[e.symbol] || 0) + 1;
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
    }
    const mostTraded = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0];
    return { total: entries.length, mostTraded, emotionCounts };
  }, [entries]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym || !shares || !price) return;
    const entry: JournalEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      symbol: sym,
      action,
      shares: Number(shares),
      price: Number(price),
      date,
      reasoning,
      emotion,
      outcome,
    };
    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(next);
    setSymbol("");
    setShares("");
    setPrice("");
    setReasoning("");
    setEmotion("neutral");
    setOutcome("");
    setShowForm(false);
    toast({ type: "success", message: "Journal entry added" });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete entry?",
      message: "This journal entry will be permanently deleted.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveEntries(next);
    toast({ type: "success", message: "Entry deleted" });
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <BookOpen size={13} /> Total entries
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <BarChart3 size={13} /> Most traded
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">
            {stats.mostTraded ? `${stats.mostTraded[0]} (${stats.mostTraded[1]})` : "---"}
          </div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Emotion spread</div>
          <div className="mt-2 flex gap-1 items-end h-6">
            {EMOTION_LABELS.map((em) => {
              const count = stats.emotionCounts[em] || 0;
              const maxCount = Math.max(1, ...Object.values(stats.emotionCounts));
              const height = count > 0 ? Math.max(4, (count / maxCount) * 24) : 2;
              return (
                <div key={em} className="flex flex-col items-center gap-0.5 flex-1">
                  <div
                    className="rounded-sm w-full"
                    style={{ height, backgroundColor: EMOTION_COLORS[em] }}
                    title={`${em}: ${count}`}
                  />
                  <span className="text-[9px] muted">{em.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
          <label htmlFor="journal-filter" className="sr-only">Filter by symbol</label>
          <input
            id="journal-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value.toUpperCase())}
            placeholder="Filter by symbol"
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 pl-8 pr-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
        >
          <Plus size={14} />
          New entry
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form ref={addFormRef} onSubmit={handleAdd} className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3 fade-up">
          <div className="text-sm font-semibold section-title">Log a new trade</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Symbol</div>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                required
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Action</div>
              <select value={action} onChange={(e) => setAction(e.target.value as "buy" | "sell")} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Shares</div>
              <input type="number" value={shares} onChange={(e) => setShares(e.target.value)} min={1} required className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Price</div>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0.01} step={0.01} required className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label className="text-xs space-y-1">
              <div className="muted">Date</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Emotion</div>
              <select value={emotion} onChange={(e) => setEmotion(e.target.value as Emotion)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm">
                {EMOTION_LABELS.map((em) => (
                  <option key={em} value={em}>{em.charAt(0).toUpperCase() + em.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Outcome</div>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm">
                <option value="">Not set</option>
                <option value="good">Good</option>
                <option value="bad">Bad</option>
                <option value="neutral">Neutral</option>
              </select>
            </label>
          </div>
          <label className="text-xs space-y-1">
            <div className="muted">Reasoning</div>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why did you make this trade? What was your thinking?"
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm min-h-[72px]"
            />
          </label>
          <button type="submit" className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold">
            Save entry
          </button>
        </form>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {filtered.length === 0 && entries.length === 0 && (
          <EmptyState
            icon={<BookOpen size={48} />}
            title="No journal entries yet"
            description="Record your trades to track performance over time."
            action={
              <button
                onClick={() => {
                  setShowForm(true);
                  setTimeout(() => addFormRef.current?.querySelector("input")?.focus(), 100);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
              >
                <Plus size={14} />
                New entry
              </button>
            }
          />
        )}
        {filtered.length === 0 && entries.length > 0 && (
          <div className="rounded-xl control-surface p-4 text-sm muted">
            No entries match your filter.
          </div>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{entry.symbol}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    entry.action === "buy"
                      ? "bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]"
                      : "bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] text-[var(--negative)]"
                  }`}
                >
                  {entry.action === "buy" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {entry.action.toUpperCase()}
                </span>
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${EMOTION_COLORS[entry.emotion]} 16%, transparent)`,
                    color: EMOTION_COLORS[entry.emotion],
                  }}
                >
                  {entry.emotion}
                </span>
                {entry.outcome && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      entry.outcome === "good"
                        ? "bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]"
                        : entry.outcome === "bad"
                        ? "bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] text-[var(--negative)]"
                        : "bg-[color-mix(in_srgb,var(--ink-muted)_16%,transparent)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {entry.outcome === "good" ? <TrendingUp size={11} /> : entry.outcome === "bad" ? <TrendingDown size={11} /> : <Minus size={11} />}
                    {entry.outcome}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs muted">{new Date(entry.date).toLocaleDateString()}</span>
                <Tooltip content="Delete entry">
                  <button onClick={() => handleDelete(entry.id)} aria-label="Delete entry" className="text-[var(--negative)] hover:opacity-80">
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs muted">
              <span>{entry.shares} shares</span>
              <span>${entry.price.toFixed(2)}</span>
              <span className="metric-value">${(entry.shares * entry.price).toFixed(2)} total</span>
            </div>
            {entry.reasoning && (
              <p className="mt-2 text-sm muted leading-relaxed">{entry.reasoning}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
