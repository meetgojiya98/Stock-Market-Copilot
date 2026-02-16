"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  Star,
} from "lucide-react";

type PortfolioEntry = { symbol: string; shares: number };

type Portfolio = {
  id: string;
  name: string;
  stocks: PortfolioEntry[];
  active: boolean;
};

const STORAGE_KEY = "smc_multi_portfolios_v1";

function hashSymbol(symbol: string) {
  return symbol.split("").reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 7), 137);
}

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function getPrice(symbol: string): number {
  const seed = hashSymbol(symbol);
  const rng = seededRng(seed);
  return +(30 + rng() * 420).toFixed(2);
}

function portfolioValue(stocks: PortfolioEntry[]): number {
  return stocks.reduce((s, e) => s + getPrice(e.symbol) * e.shares, 0);
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function loadPortfolios(): Portfolio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return [];
}

export default function MultiPortfolio() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => loadPortfolios());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addSymbol, setAddSymbol] = useState("");
  const [addShares, setAddShares] = useState(10);

  const persist = useCallback((next: Portfolio[]) => {
    setPortfolios(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    // Sync from main portfolio if no multi-portfolios exist
    if (portfolios.length === 0) {
      try {
        const raw = localStorage.getItem("smc_local_portfolio_v2");
        if (raw) {
          const stocks = JSON.parse(raw) as PortfolioEntry[];
          if (stocks.length > 0) {
            persist([{ id: Date.now().toString(36), name: "Main Portfolio", stocks, active: true }]);
          }
        }
      } catch { /* empty */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim() || "New Portfolio";
    persist([...portfolios, { id: Date.now().toString(36), name, stocks: [], active: false }]);
    setNewName("");
    setShowCreate(false);
  };

  const handleDelete = (id: string) => {
    persist(portfolios.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
  };

  const handleSetActive = (id: string) => {
    persist(portfolios.map((p) => ({ ...p, active: p.id === id })));
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    persist(portfolios.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p)));
    setEditingId(null);
  };

  const handleAddStock = (portfolioId: string) => {
    const sym = addSymbol.trim().toUpperCase();
    if (!sym || addShares <= 0) return;
    persist(
      portfolios.map((p) => {
        if (p.id !== portfolioId) return p;
        const existing = p.stocks.find((s) => s.symbol === sym);
        if (existing) {
          return { ...p, stocks: p.stocks.map((s) => (s.symbol === sym ? { ...s, shares: s.shares + addShares } : s)) };
        }
        return { ...p, stocks: [...p.stocks, { symbol: sym, shares: addShares }] };
      })
    );
    setAddSymbol("");
    setAddShares(10);
  };

  const handleRemoveStock = (portfolioId: string, symbol: string) => {
    persist(
      portfolios.map((p) => (p.id === portfolioId ? { ...p, stocks: p.stocks.filter((s) => s.symbol !== symbol) } : p))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Briefcase size={15} className="text-[var(--accent)]" />
              <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Your Portfolios</span>
            </div>
            <p className="text-xs muted">{portfolios.length} portfolio{portfolios.length !== 1 ? "s" : ""} created</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"
          >
            <Plus size={13} />
            New Portfolio
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Plus size={14} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Create Portfolio</span>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs space-y-1 flex-1 min-w-[180px]">
              <div className="muted">Portfolio Name</div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g. "Retirement"'
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                maxLength={30}
              />
            </label>
            <button type="submit" className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </form>
      )}

      {/* Portfolio cards */}
      {portfolios.length === 0 && !showCreate && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center fade-up">
          <Briefcase size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="muted text-sm">No portfolios created yet. Click &ldquo;New Portfolio&rdquo; to get started.</p>
        </div>
      )}

      {portfolios.map((p) => {
        const value = portfolioValue(p.stocks);
        const isExpanded = expandedId === p.id;

        return (
          <div
            key={p.id}
            className={`rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up transition-all ${
              p.active ? "border border-[var(--accent)]" : ""
            }`}
          >
            {/* Portfolio header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {p.active && <Star size={13} className="text-[var(--accent)]" fill="var(--accent)" />}
                {editingId === p.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-2 py-1 text-sm w-36"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                    />
                    <button onClick={() => handleRename(p.id)} className="text-[var(--positive)]"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="muted"><X size={14} /></button>
                  </div>
                ) : (
                  <span className="font-semibold section-title text-base">{p.name}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {!p.active && (
                  <button
                    onClick={() => handleSetActive(p.id)}
                    className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs inline-flex items-center gap-1"
                  >
                    <Star size={11} /> Set Active
                  </button>
                )}
                <button
                  onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                  className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs inline-flex items-center gap-1"
                >
                  <Pencil size={11} /> Rename
                </button>
                {confirmDeleteId === p.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-500">Confirm?</span>
                    <button onClick={() => handleDelete(p.id)} className="rounded-lg bg-red-500 text-white px-2 py-1 text-xs">Yes</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-xs">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1.5 text-xs inline-flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-xs inline-flex items-center gap-1"
                >
                  <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  {isExpanded ? "Collapse" : "Manage"}
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="muted">{p.stocks.length} stock{p.stocks.length !== 1 ? "s" : ""}</span>
              <span className="metric-value font-semibold">{formatMoney(value)}</span>
              {p.active && <span className="inline-flex items-center gap-1 text-[var(--accent)] text-xs font-semibold">Active</span>}
            </div>

            {/* Expanded management */}
            {isExpanded && (
              <div className="mt-4 space-y-3">
                {/* Add stock */}
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-xs space-y-1">
                    <div className="muted">Symbol</div>
                    <input
                      value={addSymbol}
                      onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm w-28"
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <div className="muted">Shares</div>
                    <input
                      type="number"
                      min={1}
                      value={addShares}
                      onChange={(e) => setAddShares(Math.max(1, +e.target.value))}
                      className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm w-20"
                    />
                  </label>
                  <button
                    onClick={() => handleAddStock(p.id)}
                    className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Stock
                  </button>
                </div>

                {/* Stock list */}
                {p.stocks.length === 0 ? (
                  <div className="rounded-xl control-surface p-3 text-center text-xs muted">
                    No stocks in this portfolio yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {p.stocks.map((s) => {
                      const price = getPrice(s.symbol);
                      return (
                        <div key={s.symbol} className="rounded-xl control-surface p-3 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-sm section-title">{s.symbol}</span>
                            <span className="text-xs muted ml-2">{s.shares} shares</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="metric-value text-sm">{formatMoney(price * s.shares)}</span>
                            <button
                              onClick={() => handleRemoveStock(p.id, s.symbol)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
