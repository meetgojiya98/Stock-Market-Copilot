"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Target, Plus, Trash2, Trophy, CalendarDays, TrendingUp } from "lucide-react";

type PortfolioRow = { symbol: string; shares: number };

type Goal = {
  id: string;
  name: string;
  target: number;
  targetDate: string;
};

const GOALS_KEY = "smc_goals_v1";

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

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return [];
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

export default function GoalTracker() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("My Goal");
  const [newTarget, setNewTarget] = useState(50000);
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_local_portfolio_v2");
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  const persist = useCallback((next: Goal[]) => {
    setGoals(next);
    localStorage.setItem(GOALS_KEY, JSON.stringify(next));
  }, []);

  const currentValue = useMemo(
    () => portfolio.reduce((sum, r) => sum + getPrice(r.symbol) * r.shares, 0),
    [portfolio]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTarget <= 0) return;
    const goal: Goal = {
      id: Date.now().toString(36),
      name: newName.trim() || "My Goal",
      target: newTarget,
      targetDate: newDate,
    };
    persist([...goals, goal]);
    setShowForm(false);
    setNewName("My Goal");
    setNewTarget(50000);
  };

  const handleRemove = (id: string) => {
    persist(goals.filter((g) => g.id !== id));
  };

  const MILESTONES = [25, 50, 75, 100];

  return (
    <div className="space-y-4">
      {/* Current value card */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={15} className="text-[var(--accent)]" />
              <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Current Portfolio Value</span>
            </div>
            <div className="metric-value text-2xl font-semibold">{formatMoney(currentValue)}</div>
            <p className="text-xs muted mt-1">Based on {portfolio.length} stock{portfolio.length !== 1 ? "s" : ""} in your portfolio</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"
          >
            <Plus size={13} />
            New Goal
          </button>
        </div>
      </div>

      {/* New goal form */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Create a New Goal</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs space-y-1">
              <div className="muted">Goal Name</div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                maxLength={40}
              />
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Target Value ($)</div>
              <input
                type="number"
                min={100}
                step={500}
                value={newTarget}
                onChange={(e) => setNewTarget(+e.target.value)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs space-y-1">
              <div className="muted">Target Date</div>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold">
              Add Goal
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showForm && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center fade-up">
          <Target size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="muted text-sm">No goals set yet. Create your first goal to start tracking your progress.</p>
        </div>
      )}

      {goals.map((goal) => {
        const pct = goal.target > 0 ? Math.min((currentValue / goal.target) * 100, 100) : 0;
        const remaining = Math.max(0, goal.target - currentValue);
        const days = daysUntil(goal.targetDate);
        const dailyNeeded = days > 0 ? remaining / days : 0;
        const weeklyNeeded = days > 0 ? remaining / (days / 7) : 0;
        const reached = pct >= 100;

        return (
          <div key={goal.id} className={`rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up ${reached ? "border border-[var(--positive)]" : ""}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <div>
                <div className="font-semibold section-title text-base">{goal.name}</div>
                <div className="text-xs muted mt-0.5">Target: {formatMoney(goal.target)}</div>
              </div>
              <div className="flex items-center gap-2">
                {reached && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--positive)] text-white px-2.5 py-1 text-xs font-semibold">
                    <Trophy size={11} /> Reached
                  </span>
                )}
                <button
                  onClick={() => handleRemove(goal.id)}
                  className="rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1 text-xs inline-flex items-center gap-1"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-6 rounded-full bg-[var(--surface-emphasis)] overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: reached
                    ? "var(--positive)"
                    : "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--positive)))",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {pct.toFixed(1)}%
              </div>
            </div>

            {/* Milestones */}
            <div className="flex items-center gap-1 mb-3">
              {MILESTONES.map((m) => (
                <div key={m} className="flex-1 text-center">
                  <div
                    className={`h-1.5 rounded-full mb-1 ${
                      pct >= m ? "bg-[var(--positive)]" : "bg-[var(--surface-emphasis)]"
                    }`}
                  />
                  <span className={`text-[10px] ${pct >= m ? "text-[var(--positive)] font-semibold" : "muted"}`}>{m}%</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid sm:grid-cols-3 gap-2">
              <div className="rounded-xl control-surface p-3">
                <div className="flex items-center gap-1 mb-1">
                  <CalendarDays size={12} className="muted" />
                  <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Days Left</span>
                </div>
                <div className="metric-value text-sm font-semibold">{days}</div>
              </div>
              <div className="rounded-xl control-surface p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={12} className="muted" />
                  <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Daily Gain Needed</span>
                </div>
                <div className="metric-value text-sm font-semibold">{remaining > 0 ? formatMoney(dailyNeeded) : "Done"}</div>
              </div>
              <div className="rounded-xl control-surface p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={12} className="muted" />
                  <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Weekly Gain Needed</span>
                </div>
                <div className="metric-value text-sm font-semibold">{remaining > 0 ? formatMoney(weeklyNeeded) : "Done"}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
