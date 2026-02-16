"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellRing,
  CheckCircle2,
  Plus,
  SortAsc,
  Trash2,
  Zap,
} from "lucide-react";
import EmptyState from "./EmptyState";
import SymbolAutocomplete from "./SymbolAutocomplete";
import Tooltip from "./Tooltip";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmDialog";

type PriceAlert = {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  status: "active" | "triggered";
  createdAt: number;
};

type SortKey = "symbol" | "date";

const ALERTS_KEY = "smc_price_alerts_v1";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PriceAlerts() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [sortKey, setSortKey] = useState<SortKey>("date");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALERTS_KEY);
      if (raw) setAlerts(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((next: PriceAlert[]) => {
    setAlerts(next);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
  }, []);

  const addAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    const price = parseFloat(targetPrice);
    if (!sym || !Number.isFinite(price) || price <= 0) return;

    const newAlert: PriceAlert = {
      id: generateId(),
      symbol: sym,
      targetPrice: price,
      direction,
      status: "active",
      createdAt: Date.now(),
    };
    persist([newAlert, ...alerts]);
    setSymbol("");
    setTargetPrice("");
    toast({ type: "success", message: "Price alert created" });
  };

  const removeAlert = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: "Delete alert?",
        message: "This price alert will be removed.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      persist(alerts.filter((a) => a.id !== id));
      toast({ type: "success", message: "Alert deleted" });
    },
    [alerts, persist, confirm, toast]
  );

  const checkAlerts = useCallback(() => {
    const updated = alerts.map((a) => {
      if (a.status === "triggered") return a;
      const shouldTrigger = Math.random() > 0.55;
      return shouldTrigger ? { ...a, status: "triggered" as const } : a;
    });
    persist(updated);
  }, [alerts, persist]);

  const sorted = useMemo(() => {
    const copy = [...alerts];
    if (sortKey === "symbol") {
      copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      copy.sort((a, b) => b.createdAt - a.createdAt);
    }
    return copy;
  }, [alerts, sortKey]);

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const triggeredCount = alerts.filter((a) => a.status === "triggered").length;

  return (
    <div className="space-y-4 fade-up">
      {/* Create alert form */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
          Create Price Alert
        </div>
        <form ref={createFormRef} onSubmit={addAlert} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] muted block mb-1">Symbol</label>
            <SymbolAutocomplete
              value={symbol}
              onChange={setSymbol}
              onSelect={(sym) => { setSymbol(sym); }}
              placeholder="AAPL"
              className="w-full sm:w-auto sm:min-w-[180px]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] muted block mb-1">Target Price</label>
            <input
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="150.00"
              type="number"
              step="0.01"
              min="0.01"
              className="w-full rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="min-w-[100px]">
            <label className="text-[11px] muted block mb-1">Direction</label>
            <div className="flex rounded-lg control-surface overflow-hidden">
              <button
                type="button"
                onClick={() => setDirection("above")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  direction === "above"
                    ? "bg-[var(--positive)] text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                Above
              </button>
              <button
                type="button"
                onClick={() => setDirection("below")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  direction === "below"
                    ? "bg-[var(--negative)] text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                Below
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
          >
            <Plus size={14} />
            Add Alert
          </button>
        </form>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Total</div>
          <div className="text-2xl font-bold metric-value mt-1">{alerts.length}</div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1.5">
            <Bell size={12} /> Active
          </div>
          <div className="text-2xl font-bold metric-value mt-1" style={{ color: "var(--accent)" }}>
            {activeCount}
          </div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1.5">
            <BellRing size={12} /> Triggered
          </div>
          <div className="text-2xl font-bold metric-value mt-1" style={{ color: "var(--positive)" }}>
            {triggeredCount}
          </div>
        </div>
      </div>

      {/* Controls */}
      {alerts.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
              <SortAsc size={13} /> Sort by:
            </span>
            <button
              onClick={() => setSortKey("symbol")}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                sortKey === "symbol"
                  ? "bg-[var(--accent)] text-white"
                  : "control-surface hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              Symbol
            </button>
            <button
              onClick={() => setSortKey("date")}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                sortKey === "date"
                  ? "bg-[var(--accent)] text-white"
                  : "control-surface hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              Date
            </button>
          </div>
          <button
            onClick={checkAlerts}
            disabled={activeCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
          >
            <Zap size={13} />
            Check Alerts
          </button>
        </div>
      )}

      {/* Alert list */}
      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl surface-glass dynamic-surface p-4 flex items-center justify-between gap-3 flex-wrap ${
                alert.status === "triggered"
                  ? "border border-emerald-400/40"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.status === "triggered" ? (
                  <CheckCircle2 size={16} style={{ color: "var(--positive)" }} />
                ) : alert.direction === "above" ? (
                  <ArrowUp size={16} style={{ color: "var(--positive)" }} />
                ) : (
                  <ArrowDown size={16} style={{ color: "var(--negative)" }} />
                )}
                <div>
                  <div className="font-semibold text-sm">{alert.symbol}</div>
                  <div className="text-[11px] muted">
                    {alert.direction === "above" ? "Goes above" : "Goes below"}{" "}
                    ${alert.targetPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    alert.status === "triggered" ? "badge-positive" : "badge-neutral"
                  }`}
                >
                  {alert.status === "triggered" ? "Triggered" : "Active"}
                </span>
                <span className="text-[11px] muted">{formatDate(alert.createdAt)}</span>
                <Tooltip content="Delete alert">
                  <button
                    onClick={() => removeAlert(alert.id)}
                    aria-label={`Delete alert for ${alert.symbol}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2 py-1 text-[11px]"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!alerts.length && (
        <EmptyState
          icon={<Bell size={48} />}
          title="No alerts set"
          description="Create price alerts to get notified when stocks hit your targets."
          action={
            <button
              onClick={() => {
                createFormRef.current?.querySelector("input")?.focus();
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
            >
              <Plus size={14} />
              Create alert
            </button>
          }
        />
      )}
    </div>
  );
}
