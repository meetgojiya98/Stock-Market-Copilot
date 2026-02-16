"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Copy,
  Edit3,
  FileText,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrderType = "market" | "limit" | "stop-loss" | "trailing-stop";
type SizingMode = "fixed-shares" | "fixed-dollars" | "percent-portfolio";
type ConditionOp = "above" | "below";

type TemplateCondition = {
  symbol: string;
  op: ConditionOp;
  value: number;
};

type OrderTemplate = {
  id: string;
  name: string;
  symbol: string;
  orderType: OrderType;
  sizingMode: SizingMode;
  sizingValue: number;
  condition: TemplateCondition | null;
  createdAt: string;
  updatedAt: string;
};

type BacktestDay = {
  day: number;
  price: number;
  triggered: boolean;
  pnl: number;
};

type BacktestResult = {
  days: BacktestDay[];
  totalPnl: number;
  triggerCount: number;
  winRate: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LS_KEY = "smc_order_templates_v1";
const EXEC_KEY = "smc_execution_v1";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
  { value: "stop-loss", label: "Stop-Loss" },
  { value: "trailing-stop", label: "Trailing Stop" },
];

const SIZING_MODES: { value: SizingMode; label: string }[] = [
  { value: "fixed-shares", label: "Fixed Shares" },
  { value: "fixed-dollars", label: "Fixed Dollar Amount" },
  { value: "percent-portfolio", label: "% of Portfolio" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadTemplates(): OrderTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as OrderTemplate[];
  } catch {
    /* empty */
  }
  return [];
}

function saveTemplates(templates: OrderTemplate[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function orderTypeIcon(type: OrderType) {
  switch (type) {
    case "market":
      return Target;
    case "limit":
      return ArrowUpRight;
    case "stop-loss":
      return ShieldCheck;
    case "trailing-stop":
      return TrendingDown;
  }
}

function orderTypeBadgeClass(type: OrderType): string {
  switch (type) {
    case "market":
      return "badge-neutral";
    case "limit":
      return "badge-positive";
    case "stop-loss":
      return "badge-negative";
    case "trailing-stop":
      return "badge-neutral";
  }
}

function sizingLabel(mode: SizingMode, value: number): string {
  switch (mode) {
    case "fixed-shares":
      return `${value} shares`;
    case "fixed-dollars":
      return formatMoney(value);
    case "percent-portfolio":
      return `${value}% of portfolio`;
  }
}

/* ------------------------------------------------------------------ */
/*  Synthetic backtest engine                                          */
/* ------------------------------------------------------------------ */

function generateSyntheticPrices(basePrice: number, days: number, seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  const prices: number[] = [basePrice];
  let current = basePrice;

  for (let i = 1; i < days; i++) {
    hash = ((hash << 5) - hash + i) | 0;
    const noise = ((hash % 1000) / 1000 - 0.5) * 0.04;
    const drift = 0.0003;
    current = current * (1 + drift + noise);
    current = Math.max(current * 0.5, current);
    prices.push(Math.round(current * 100) / 100);
  }

  return prices;
}

function runBacktest(template: OrderTemplate): BacktestResult {
  const basePrice = 150 + (template.symbol.charCodeAt(0) % 50);
  const prices = generateSyntheticPrices(basePrice, 30, template.id + template.symbol);

  const days: BacktestDay[] = [];
  let totalPnl = 0;
  let triggers = 0;
  let wins = 0;

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    let triggered = false;
    let pnl = 0;

    if (template.condition) {
      const condMet =
        template.condition.op === "above"
          ? price > template.condition.value
          : price < template.condition.value;

      if (condMet && i < prices.length - 1) {
        triggered = true;
        triggers++;

        const exitPrice = prices[Math.min(i + 3, prices.length - 1)];

        let shares = 1;
        switch (template.sizingMode) {
          case "fixed-shares":
            shares = template.sizingValue;
            break;
          case "fixed-dollars":
            shares = Math.floor(template.sizingValue / price);
            break;
          case "percent-portfolio":
            shares = Math.floor((100000 * template.sizingValue) / 100 / price);
            break;
        }
        shares = Math.max(1, shares);

        if (template.orderType === "stop-loss" || template.orderType === "trailing-stop") {
          pnl = (price - exitPrice) * shares;
        } else {
          pnl = (exitPrice - price) * shares;
        }

        totalPnl += pnl;
        if (pnl > 0) wins++;
      }
    } else {
      if (i % 5 === 0 && i < prices.length - 1) {
        triggered = true;
        triggers++;

        const exitPrice = prices[Math.min(i + 3, prices.length - 1)];
        let shares = 1;
        switch (template.sizingMode) {
          case "fixed-shares":
            shares = template.sizingValue;
            break;
          case "fixed-dollars":
            shares = Math.floor(template.sizingValue / price);
            break;
          case "percent-portfolio":
            shares = Math.floor((100000 * template.sizingValue) / 100 / price);
            break;
        }
        shares = Math.max(1, shares);
        pnl = (exitPrice - price) * shares;
        totalPnl += pnl;
        if (pnl > 0) wins++;
      }
    }

    days.push({ day: i + 1, price, triggered, pnl: Math.round(pnl * 100) / 100 });
  }

  return {
    days,
    totalPnl: Math.round(totalPnl * 100) / 100,
    triggerCount: triggers,
    winRate: triggers > 0 ? Math.round((wins / triggers) * 100) : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Quick-execute helper                                               */
/* ------------------------------------------------------------------ */

function quickExecute(template: OrderTemplate) {
  try {
    const raw = localStorage.getItem(EXEC_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    entries.push({
      id: uid(),
      templateId: template.id,
      templateName: template.name,
      symbol: template.symbol,
      orderType: template.orderType,
      sizingMode: template.sizingMode,
      sizingValue: template.sizingValue,
      side: "buy",
      status: "filled",
      executedAt: new Date().toISOString(),
      source: "template",
    });
    localStorage.setItem(EXEC_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Empty form state                                                   */
/* ------------------------------------------------------------------ */

function emptyForm() {
  return {
    name: "",
    symbol: "",
    orderType: "market" as OrderType,
    sizingMode: "fixed-shares" as SizingMode,
    sizingValue: 10,
    hasCondition: false,
    condSymbol: "",
    condOp: "above" as ConditionOp,
    condValue: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrderTemplateBuilder() {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    if (templates.length > 0 || localStorage.getItem(LS_KEY)) {
      saveTemplates(templates);
    }
  }, [templates]);

  const flash = useCallback((msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setNotice("");
    } else {
      setNotice(msg);
      setError("");
    }
    setTimeout(() => {
      setNotice("");
      setError("");
    }, 3500);
  }, []);

  const backtestResult = useMemo(() => {
    if (!backtestId) return null;
    const t = templates.find((tpl) => tpl.id === backtestId);
    if (!t) return null;
    return runBacktest(t);
  }, [backtestId, templates]);

  const handleOpenNew = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((template: OrderTemplate) => {
    setForm({
      name: template.name,
      symbol: template.symbol,
      orderType: template.orderType,
      sizingMode: template.sizingMode,
      sizingValue: template.sizingValue,
      hasCondition: template.condition !== null,
      condSymbol: template.condition?.symbol ?? "",
      condOp: template.condition?.op ?? "above",
      condValue: template.condition?.value ?? 0,
    });
    setEditingId(template.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (backtestId === id) setBacktestId(null);
      if (editingId === id) {
        setShowForm(false);
        setEditingId(null);
      }
      flash("Template deleted.");
    },
    [backtestId, editingId, flash]
  );

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      flash("Template name is required.", true);
      return;
    }
    if (!form.symbol.trim()) {
      flash("Symbol is required.", true);
      return;
    }
    if (form.sizingValue <= 0) {
      flash("Sizing value must be greater than zero.", true);
      return;
    }

    const now = new Date().toISOString();
    const condition: TemplateCondition | null = form.hasCondition
      ? {
          symbol: form.condSymbol.trim().toUpperCase() || form.symbol.trim().toUpperCase(),
          op: form.condOp,
          value: form.condValue,
        }
      : null;

    if (editingId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: form.name.trim(),
                symbol: form.symbol.trim().toUpperCase(),
                orderType: form.orderType,
                sizingMode: form.sizingMode,
                sizingValue: form.sizingValue,
                condition,
                updatedAt: now,
              }
            : t
        )
      );
      flash("Template updated.");
    } else {
      const newTemplate: OrderTemplate = {
        id: uid(),
        name: form.name.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        orderType: form.orderType,
        sizingMode: form.sizingMode,
        sizingValue: form.sizingValue,
        condition,
        createdAt: now,
        updatedAt: now,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      flash("Template saved.");
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }, [editingId, flash, form]);

  const handleQuickExecute = useCallback(
    (template: OrderTemplate) => {
      const ok = quickExecute(template);
      if (ok) {
        flash(`Template "${template.name}" executed as paper trade on ${template.symbol}.`);
      } else {
        flash("Failed to execute template.", true);
      }
    },
    [flash]
  );

  const handleDuplicate = useCallback(
    (template: OrderTemplate) => {
      const now = new Date().toISOString();
      const dup: OrderTemplate = {
        ...template,
        id: uid(),
        name: `${template.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };
      setTemplates((prev) => [dup, ...prev]);
      flash("Template duplicated.");
    },
    [flash]
  );

  return (
    <div className="space-y-5 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="section-title text-base flex items-center gap-2">
              <FileText size={16} />
              Order Template Builder
            </h3>
            <p className="text-xs muted mt-1">
              Build reusable order templates, preview backtested performance, and quick-execute into paper trades.
            </p>
          </div>
          <button
            onClick={handleOpenNew}
            className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus size={13} />
            New Template
          </button>
        </div>

        {(notice || error) && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${
              error
                ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
                : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {error || notice}
          </div>
        )}
      </div>

      {/* Template Builder Form */}
      {showForm && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="section-title text-sm flex items-center gap-2">
              <Edit3 size={14} />
              {editingId ? "Edit Template" : "Create Template"}
            </h4>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-xs muted"
            >
              <X size={13} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1">
              <div className="muted">Template Name</div>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                placeholder="e.g. AAPL Dip Buy"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Symbol</div>
              <input
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                placeholder="AAPL"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Order Type</div>
              <select
                value={form.orderType}
                onChange={(e) => setForm((f) => ({ ...f, orderType: e.target.value as OrderType }))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                {ORDER_TYPES.map((ot) => (
                  <option key={ot.value} value={ot.value}>
                    {ot.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Sizing Mode</div>
              <select
                value={form.sizingMode}
                onChange={(e) => setForm((f) => ({ ...f, sizingMode: e.target.value as SizingMode }))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              >
                {SIZING_MODES.map((sm) => (
                  <option key={sm.value} value={sm.value}>
                    {sm.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">
                {form.sizingMode === "fixed-shares"
                  ? "Number of Shares"
                  : form.sizingMode === "fixed-dollars"
                  ? "Dollar Amount"
                  : "Portfolio %"}
              </div>
              <input
                type="number"
                min={0}
                step={form.sizingMode === "percent-portfolio" ? 1 : form.sizingMode === "fixed-dollars" ? 100 : 1}
                value={form.sizingValue}
                onChange={(e) => setForm((f) => ({ ...f, sizingValue: Number(e.target.value) }))}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* Condition toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasCondition}
                onChange={(e) => setForm((f) => ({ ...f, hasCondition: e.target.checked }))}
                className="accent-[var(--accent)]"
              />
              <span className="muted">Add price condition (optional)</span>
            </label>

            {form.hasCondition && (
              <div className="grid sm:grid-cols-3 gap-2 pl-5">
                <label className="text-xs space-y-1">
                  <div className="muted">Condition Symbol</div>
                  <input
                    value={form.condSymbol}
                    onChange={(e) => setForm((f) => ({ ...f, condSymbol: e.target.value.toUpperCase() }))}
                    className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                    placeholder={form.symbol || "AAPL"}
                  />
                </label>

                <label className="text-xs space-y-1">
                  <div className="muted">Direction</div>
                  <select
                    value={form.condOp}
                    onChange={(e) => setForm((f) => ({ ...f, condOp: e.target.value as ConditionOp }))}
                    className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  >
                    <option value="above">Price Above</option>
                    <option value="below">Price Below</option>
                  </select>
                </label>

                <label className="text-xs space-y-1">
                  <div className="muted">Trigger Value ($)</div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.condValue}
                    onChange={(e) => setForm((f) => ({ ...f, condValue: Number(e.target.value) }))}
                    className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Save size={13} />
              {editingId ? "Update Template" : "Save Template"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="rounded-lg border border-[var(--surface-border)] bg-white/80 dark:bg-black/25 px-4 py-2.5 text-xs muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template Library */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <h4 className="section-title text-sm flex items-center gap-2">
          <FileText size={14} />
          Template Library
          <span className="text-xs rounded-full px-2 py-0.5 badge-neutral">
            {templates.length}
          </span>
        </h4>

        {templates.length === 0 && (
          <p className="text-xs muted py-4 text-center">
            No templates yet. Create your first order template to get started.
          </p>
        )}

        <div className="space-y-2">
          {templates.map((template) => {
            const Icon = orderTypeIcon(template.orderType);
            const isBacktesting = backtestId === template.id;

            return (
              <div key={template.id} className="rounded-xl control-surface p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon size={14} className="text-[var(--accent)] flex-shrink-0" />
                      <span className="text-sm font-semibold section-title">{template.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${orderTypeBadgeClass(template.orderType)}`}>
                        {ORDER_TYPES.find((ot) => ot.value === template.orderType)?.label}
                      </span>
                    </div>
                    <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mt-0.5">
                      {template.symbol} &middot; {sizingLabel(template.sizingMode, template.sizingValue)}
                    </div>
                    {template.condition && (
                      <p className="text-xs muted mt-1">
                        Condition: If {template.condition.symbol} price{" "}
                        {template.condition.op === "above" ? (
                          <TrendingUp size={11} className="inline text-[var(--positive)]" />
                        ) : (
                          <TrendingDown size={11} className="inline text-[var(--negative)]" />
                        )}{" "}
                        {template.condition.op} {formatMoney(template.condition.value)}
                      </p>
                    )}
                    <p className="text-[11px] muted mt-1">
                      Created {formatTimestamp(template.createdAt)}
                      {template.updatedAt !== template.createdAt && (
                        <> &middot; Updated {formatTimestamp(template.updatedAt)}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => handleQuickExecute(template)}
                      title="Quick Execute"
                      className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-[11px] inline-flex items-center gap-1"
                    >
                      <Play size={11} />
                      Execute
                    </button>
                    <button
                      onClick={() => setBacktestId(isBacktesting ? null : template.id)}
                      title="Backtest Preview"
                      className={`rounded-lg border px-2 py-1 text-[11px] inline-flex items-center gap-1 ${
                        isBacktesting
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                          : "border-[var(--surface-border)] muted"
                      }`}
                    >
                      <BarChart3 size={11} />
                      Backtest
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      title="Edit"
                      className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-[11px] muted inline-flex items-center gap-1"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template)}
                      title="Duplicate"
                      className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-[11px] muted inline-flex items-center gap-1"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      title="Delete"
                      className="rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2 py-1 text-[11px] inline-flex items-center gap-1"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Backtest Preview Panel */}
                {isBacktesting && backtestResult && (
                  <div className="border-t border-[var(--surface-border)] pt-3 space-y-2">
                    <div className="text-xs font-semibold section-title flex items-center gap-1.5">
                      <BarChart3 size={13} />
                      30-Day Backtest Preview (Synthetic Data)
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-white/60 dark:bg-black/20 p-2 text-center">
                        <div className="text-[11px] muted">Total P/L</div>
                        <div
                          className={`text-sm font-semibold metric-value ${
                            backtestResult.totalPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                          }`}
                        >
                          {formatMoney(backtestResult.totalPnl)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/60 dark:bg-black/20 p-2 text-center">
                        <div className="text-[11px] muted">Triggers</div>
                        <div className="text-sm font-semibold metric-value">{backtestResult.triggerCount}</div>
                      </div>
                      <div className="rounded-lg bg-white/60 dark:bg-black/20 p-2 text-center">
                        <div className="text-[11px] muted">Win Rate</div>
                        <div
                          className={`text-sm font-semibold metric-value ${
                            backtestResult.winRate >= 50 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                          }`}
                        >
                          {backtestResult.winRate}%
                        </div>
                      </div>
                    </div>

                    {/* Mini spark-bar chart */}
                    <div className="flex items-end gap-[2px] h-12">
                      {backtestResult.days.map((day) => {
                        const maxAbs = Math.max(
                          1,
                          ...backtestResult.days.map((d) => Math.abs(d.pnl))
                        );
                        const height = day.pnl !== 0 ? Math.max(4, (Math.abs(day.pnl) / maxAbs) * 100) : 2;
                        return (
                          <div
                            key={day.day}
                            className="flex-1 rounded-sm"
                            style={{
                              height: `${height}%`,
                              backgroundColor: day.triggered
                                ? day.pnl >= 0
                                  ? "var(--positive)"
                                  : "var(--negative)"
                                : "var(--surface-border)",
                              opacity: day.triggered ? 1 : 0.3,
                            }}
                            title={`Day ${day.day}: ${formatMoney(day.price)}${day.triggered ? ` | P/L: ${formatMoney(day.pnl)}` : ""}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[10px] muted">
                      <span>Day 1</span>
                      <span>Day 30</span>
                    </div>

                    {/* Triggered days detail */}
                    <div className="max-h-32 overflow-auto">
                      <table className="w-full text-[11px]">
                        <thead className="muted">
                          <tr>
                            <th className="text-left py-1">Day</th>
                            <th className="text-right py-1">Price</th>
                            <th className="text-right py-1">P/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtestResult.days
                            .filter((d) => d.triggered)
                            .map((d) => (
                              <tr key={d.day} className="border-t border-[var(--surface-border)]">
                                <td className="py-1">Day {d.day}</td>
                                <td className="py-1 text-right metric-value">{formatMoney(d.price)}</td>
                                <td
                                  className={`py-1 text-right font-semibold ${
                                    d.pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                                  }`}
                                >
                                  {formatMoney(d.pnl)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
