"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "../../components/PageShell";
import {
  Briefcase,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  X,
} from "lucide-react";
import {
  getPortfolios,
  savePortfolio,
  deletePortfolio,
  addPosition,
  removePosition,
  getPortfolioValue,
  getMockCurrentPrice,
  type Portfolio,
} from "../../lib/multi-portfolio";

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // New portfolio form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  // Add position form
  const [posSymbol, setPosSymbol] = useState("");
  const [posShares, setPosShares] = useState("");
  const [posAvgCost, setPosAvgCost] = useState("");

  const reload = useCallback(() => {
    setPortfolios(getPortfolios());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const active = portfolios[activeTab] ?? portfolios[0];
  const stats = active ? getPortfolioValue(active) : null;

  function handleCreatePortfolio() {
    if (!newName.trim()) return;
    const portfolio: Portfolio = {
      id: `portfolio_${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      positions: [],
      createdAt: new Date().toISOString(),
      color: newColor,
    };
    savePortfolio(portfolio);
    setNewName("");
    setNewDesc("");
    setNewColor("#3b82f6");
    setShowNewPortfolio(false);
    reload();
    setActiveTab(portfolios.length);
  }

  function handleAddPosition() {
    if (!active || !posSymbol.trim() || !posShares || !posAvgCost) return;
    addPosition(active.id, {
      symbol: posSymbol.toUpperCase().trim(),
      shares: parseFloat(posShares),
      avgCost: parseFloat(posAvgCost),
    });
    setPosSymbol("");
    setPosShares("");
    setPosAvgCost("");
    setShowAddPosition(false);
    reload();
  }

  function handleDeletePortfolio(id: string) {
    deletePortfolio(id);
    setDeleteConfirm(null);
    reload();
    if (activeTab >= portfolios.length - 1) {
      setActiveTab(Math.max(0, activeTab - 1));
    }
  }

  function handleRemovePosition(symbol: string) {
    if (!active) return;
    removePosition(active.id, symbol);
    reload();
  }

  return (
    <PageShell
      title="Multi-Portfolio Manager"
      subtitle="Manage multiple investment portfolios with separate positions and tracking"
      actions={
        <button
          onClick={() => setShowNewPortfolio(true)}
          className="glass-card flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{ color: "var(--accent-2)", borderColor: "var(--surface-border)" }}
        >
          <Plus size={16} />
          New Portfolio
        </button>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {portfolios.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActiveTab(i)}
            className="glass-card flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              borderColor:
                activeTab === i ? p.color : "var(--surface-border)",
              borderWidth: activeTab === i ? 2 : 1,
              color: activeTab === i ? "var(--ink)" : "var(--ink-muted)",
            }}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {active && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
              <DollarSign size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Total Value</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              ${stats.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
              <TrendingUp size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Day Change</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--positive)" }}>
              +${stats.dayChange.toFixed(2)}
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
              <PieChart size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Total P&L</span>
            </div>
            <p
              className="text-xl font-bold"
              style={{ color: stats.totalPnL >= 0 ? "var(--positive)" : "var(--negative)" }}
            >
              {stats.totalPnL >= 0 ? "+" : ""}${stats.totalPnL.toFixed(2)}
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
              <Briefcase size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">P&L %</span>
            </div>
            <p
              className="text-xl font-bold"
              style={{ color: stats.totalPnLPercent >= 0 ? "var(--positive)" : "var(--negative)" }}
            >
              {stats.totalPnLPercent >= 0 ? "+" : ""}{stats.totalPnLPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Portfolio info */}
      {active && (
        <div className="glass-card p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: active.color }} />
                <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                  {active.name}
                </h2>
              </div>
              {active.description && (
                <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                  {active.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddPosition(true)}
                className="glass-card flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                style={{ color: "var(--accent-2)" }}
              >
                <Plus size={14} /> Add Position
              </button>
              <button
                onClick={() => setDeleteConfirm(active.id)}
                className="glass-card flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                style={{ color: "var(--negative)" }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Positions table */}
      {active && active.positions.length > 0 && (
        <div className="glass-card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                {["Symbol", "Shares", "Avg Cost", "Current Price", "P&L", "P&L %", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {active.positions.map((pos) => {
                const curPrice = getMockCurrentPrice(pos.symbol);
                const pnl = (curPrice - pos.avgCost) * pos.shares;
                const pnlPct =
                  pos.avgCost > 0
                    ? ((curPrice - pos.avgCost) / pos.avgCost) * 100
                    : 0;
                const isUp = pnl >= 0;
                return (
                  <tr
                    key={pos.symbol}
                    style={{ borderBottom: "1px solid var(--surface-border)" }}
                  >
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                      {pos.symbol}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                      {pos.shares}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-muted)" }}>
                      ${pos.avgCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                      ${curPrice.toFixed(2)}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                    >
                      {isUp ? "+" : ""}${pnl.toFixed(2)}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemovePosition(pos.symbol)}
                        className="p-1 rounded transition-colors hover:opacity-70"
                        style={{ color: "var(--negative)" }}
                        title="Remove position"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {active && active.positions.length === 0 && (
        <div className="glass-card p-8 mt-4 text-center" style={{ color: "var(--ink-muted)" }}>
          <Briefcase size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No positions yet. Add your first position to get started.</p>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="glass-card p-6 w-full max-w-md mx-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                Add Position
              </h3>
              <button onClick={() => setShowAddPosition(false)} style={{ color: "var(--ink-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Symbol
                </label>
                <input
                  type="text"
                  value={posSymbol}
                  onChange={(e) => setPosSymbol(e.target.value)}
                  placeholder="e.g. AAPL"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--surface-border)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Shares
                </label>
                <input
                  type="number"
                  value={posShares}
                  onChange={(e) => setPosShares(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--surface-border)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Avg Cost
                </label>
                <input
                  type="number"
                  value={posAvgCost}
                  onChange={(e) => setPosAvgCost(e.target.value)}
                  placeholder="e.g. 150.00"
                  step="0.01"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--surface-border)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <button
                onClick={handleAddPosition}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--accent-2)" }}
              >
                Add Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Portfolio Modal */}
      {showNewPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="glass-card p-6 w-full max-w-md mx-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                Create Portfolio
              </h3>
              <button onClick={() => setShowNewPortfolio(false)} style={{ color: "var(--ink-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Growth Portfolio"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--surface-border)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--surface-border)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Color
                </label>
                <div className="flex gap-2">
                  {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className="w-8 h-8 rounded-full transition-transform"
                        style={{
                          backgroundColor: c,
                          transform: newColor === c ? "scale(1.2)" : "scale(1)",
                          outline: newColor === c ? "2px solid var(--ink)" : "none",
                          outlineOffset: 2,
                        }}
                      />
                    )
                  )}
                </div>
              </div>
              <button
                onClick={handleCreatePortfolio}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--accent-2)" }}
              >
                Create Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="glass-card p-6 w-full max-w-sm mx-4" style={{ background: "var(--surface)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--ink)" }}>
              Delete Portfolio?
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
              This action cannot be undone. All positions in this portfolio will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border"
                style={{
                  borderColor: "var(--surface-border)",
                  color: "var(--ink-muted)",
                  background: "var(--surface-2)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePortfolio(deleteConfirm)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--negative)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
