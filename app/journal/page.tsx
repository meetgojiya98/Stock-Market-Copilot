"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Trash2, Search, Sparkles, X } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import {
  saveTradeEntry,
  loadTradeEntries,
  deleteTradeEntry,
  getTradeStats,
  type TradeEntry,
} from "../../lib/trade-journal";
import { streamAgent } from "../../lib/agents/run-agent";
import type { AgentId } from "../../lib/agents/types";

function generateId() {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [stats, setStats] = useState(getTradeStats());
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Form state
  const [formSymbol, setFormSymbol] = useState("");
  const [formType, setFormType] = useState<"buy" | "sell">("buy");
  const [formQuantity, setFormQuantity] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formPnl, setFormPnl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTags, setFormTags] = useState("");

  const refresh = useCallback(() => {
    setEntries(loadTradeEntries());
    setStats(getTradeStats());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = () => {
    if (!formSymbol.trim() || !formQuantity || !formPrice) return;
    const entry: TradeEntry = {
      id: generateId(),
      symbol: formSymbol.trim().toUpperCase(),
      type: formType,
      quantity: parseFloat(formQuantity),
      price: parseFloat(formPrice),
      date: formDate,
      notes: formNotes.trim(),
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      pnl: formPnl ? parseFloat(formPnl) : undefined,
      createdAt: new Date().toISOString(),
    };
    saveTradeEntry(entry);
    resetForm();
    setShowForm(false);
    refresh();
  };

  const resetForm = () => {
    setFormSymbol("");
    setFormType("buy");
    setFormQuantity("");
    setFormPrice("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormPnl("");
    setFormNotes("");
    setFormTags("");
  };

  const handleDelete = (id: string) => {
    deleteTradeEntry(id);
    setDeleteConfirmId(null);
    refresh();
  };

  const handleAttachAnalysis = async (entry: TradeEntry) => {
    setAnalyzingId(entry.id);
    let analysis = "";
    try {
      await streamAgent(
        "research-analyst" as AgentId,
        [entry.symbol],
        `Analyze this trade: ${entry.type.toUpperCase()} ${entry.quantity} shares of ${entry.symbol} at $${entry.price} on ${entry.date}. ${entry.notes ? `Notes: ${entry.notes}` : ""}`,
        (chunk) => {
          analysis = chunk;
        },
        (result) => {
          const text = result.details || analysis || result.summary;
          const updated: TradeEntry = { ...entry, agentAnalysis: text };
          saveTradeEntry(updated);
          refresh();
          setAnalyzingId(null);
        }
      );
    } catch {
      if (analysis) {
        const updated: TradeEntry = { ...entry, agentAnalysis: analysis };
        saveTradeEntry(updated);
        refresh();
      }
      setAnalyzingId(null);
    }
  };

  const filtered = entries.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.symbol.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AuthGuard>
      <PageShell title="Trade Journal" subtitle="Log trades, track P&L, and attach AI analysis">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="stat-card">
            <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
              Total Trades
            </span>
            <span className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              {stats.totalTrades}
            </span>
          </div>
          <div className="stat-card">
            <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
              Win Rate %
            </span>
            <span className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="stat-card">
            <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
              Total P&L
            </span>
            <span
              className="text-xl font-bold"
              style={{
                color:
                  stats.totalPnL >= 0 ? "var(--positive, #22c55e)" : "var(--negative, #ef4444)",
              }}
            >
              {stats.totalPnL >= 0 ? "+" : ""}${stats.totalPnL.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
              Avg P&L
            </span>
            <span
              className="text-xl font-bold"
              style={{
                color:
                  stats.avgPnL >= 0 ? "var(--positive, #22c55e)" : "var(--negative, #ef4444)",
              }}
            >
              {stats.avgPnL >= 0 ? "+" : ""}${stats.avgPnL.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Log Trade Button */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
              color: "var(--accent-2)",
            }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? "Cancel" : "Log Trade"}
          </button>
        </div>

        {/* Inline Form */}
        {showForm && (
          <div className="glass-card p-5 mb-6 space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--ink)" }}>
              New Trade Entry
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Symbol */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Symbol
                </label>
                <input
                  type="text"
                  placeholder="AAPL"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>

              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Type
                </label>
                <div className="flex rounded-lg overflow-hidden border border-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                  <button
                    onClick={() => setFormType("buy")}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${
                      formType === "buy"
                        ? "bg-[#22c55e] text-white"
                        : "bg-transparent"
                    }`}
                    style={formType !== "buy" ? { color: "var(--ink-muted)" } : {}}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setFormType("sell")}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${
                      formType === "sell"
                        ? "bg-[#ef4444] text-white"
                        : "bg-transparent"
                    }`}
                    style={formType !== "sell" ? { color: "var(--ink-muted)" } : {}}
                  >
                    Sell
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Quantity
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>

              {/* P&L */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  P&L (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="250.00"
                  value={formPnl}
                  onChange={(e) => setFormPnl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="swing, earnings, breakout"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Trade rationale, setup description..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors resize-none"
                style={{ color: "var(--ink)" }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!formSymbol.trim() || !formQuantity || !formPrice}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: "var(--accent-2)" }}
            >
              Save Trade
            </button>
          </div>
        )}

        {/* Search / Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--ink-muted)" }}
            />
            <input
              type="text"
              placeholder="Search by symbol or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
              style={{ color: "var(--ink)" }}
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
            {(["all", "buy", "sell"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 text-xs font-medium transition-all ${
                  filterType === t
                    ? "bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-[var(--accent-2)]"
                    : ""
                }`}
                style={filterType !== t ? { color: "var(--ink-muted)" } : {}}
              >
                {t === "all" ? "All" : t === "buy" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>
        </div>

        {/* Trades List */}
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <BookOpen size={32} className="mx-auto mb-3" style={{ color: "var(--ink-muted)" }} />
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              {entries.length === 0
                ? "No trades logged yet. Click \"Log Trade\" to record your first trade."
                : "No trades match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <div key={entry.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header: Symbol + Type Badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base font-bold" style={{ color: "var(--ink)" }}>
                        {entry.symbol}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white"
                        style={{
                          background: entry.type === "buy" ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {entry.type}
                      </span>
                      <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {entry.quantity} x ${entry.price.toFixed(2)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {entry.date}
                      </span>
                    </div>

                    {/* P&L */}
                    {entry.pnl !== undefined && (
                      <div className="mb-1.5">
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color:
                              entry.pnl >= 0
                                ? "var(--positive, #22c55e)"
                                : "var(--negative, #ef4444)",
                          }}
                        >
                          P&L: {entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {entry.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                            style={{
                              background:
                                "color-mix(in srgb, var(--accent-2) 12%, transparent)",
                              color: "var(--accent-2)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes Preview */}
                    {entry.notes && (
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {entry.notes}
                      </p>
                    )}

                    {/* Agent Analysis */}
                    {entry.agentAnalysis && (
                      <div
                        className="mt-2 p-3 rounded-lg text-xs leading-relaxed"
                        style={{
                          background:
                            "color-mix(in srgb, var(--accent-2) 6%, transparent)",
                          color: "var(--ink-muted)",
                          borderLeft: "2px solid var(--accent-2)",
                        }}
                      >
                        <span className="font-semibold text-[var(--accent-2)] text-[10px] uppercase block mb-1">
                          AI Analysis
                        </span>
                        <span className="line-clamp-4">{entry.agentAnalysis}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleAttachAnalysis(entry)}
                      disabled={analyzingId === entry.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                        color: "var(--accent-2)",
                      }}
                      title="Attach AI Analysis"
                    >
                      <Sparkles size={12} />
                      {analyzingId === entry.id ? "Analyzing..." : "AI Analysis"}
                    </button>

                    {deleteConfirmId === entry.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-[#ef4444] transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-md text-[10px] font-semibold transition-all"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(entry.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-[color-mix(in_srgb,#ef4444_10%,transparent)]"
                        style={{ color: "var(--ink-muted)" }}
                        title="Delete trade"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
