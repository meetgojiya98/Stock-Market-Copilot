"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  ChevronDown,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Smartphone,
  Trash2,
  TrendingDown,
  TrendingUp,
  Volume2,
  Zap,
} from "lucide-react";

type AlertCondition =
  | "price_above"
  | "price_below"
  | "pct_change_up"
  | "pct_change_down"
  | "volume_spike";

type NotifChannel = "in_app" | "email" | "sms";

type Alert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  channels: NotifChannel[];
  enabled: boolean;
  triggered: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
};

const ALERTS_KEY = "smc_alerts_v1";

const CONDITION_LABELS: Record<AlertCondition, string> = {
  price_above: "Price Above",
  price_below: "Price Below",
  pct_change_up: "% Change Up",
  pct_change_down: "% Change Down",
  volume_spike: "Volume Spike",
};

const CONDITION_ICONS: Record<AlertCondition, React.ReactNode> = {
  price_above: <TrendingUp size={13} />,
  price_below: <TrendingDown size={13} />,
  pct_change_up: <TrendingUp size={13} />,
  pct_change_down: <TrendingDown size={13} />,
  volume_spike: <Volume2 size={13} />,
};

const CHANNEL_CONFIG: { id: NotifChannel; label: string; icon: React.ReactNode }[] = [
  { id: "in_app", label: "In-App", icon: <Bell size={12} /> },
  { id: "email", label: "Email", icon: <Mail size={12} /> },
  { id: "sms", label: "SMS", icon: <Smartphone size={12} /> },
];

// Mock current prices for alert evaluation
const MOCK_PRICES: Record<string, { price: number; changePct: number; volume: number }> = {
  AAPL: { price: 189.84, changePct: 1.24, volume: 54_200_000 },
  MSFT: { price: 420.55, changePct: -0.38, volume: 22_100_000 },
  GOOGL: { price: 176.23, changePct: 2.15, volume: 18_700_000 },
  AMZN: { price: 185.07, changePct: 0.82, volume: 35_800_000 },
  NVDA: { price: 878.37, changePct: 3.41, volume: 42_300_000 },
  TSLA: { price: 177.48, changePct: -2.67, volume: 98_500_000 },
  META: { price: 505.75, changePct: 1.55, volume: 15_600_000 },
  JPM: { price: 196.62, changePct: -0.12, volume: 8_400_000 },
};

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadAlerts(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw) return JSON.parse(raw) as Alert[];
  } catch {
    // ignore
  }
  return [];
}

function persistAlerts(alerts: Alert[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

function evaluateCondition(
  alert: Alert,
  price: { price: number; changePct: number; volume: number }
): boolean {
  // Add randomness to simulate live market fluctuation
  const jitter = () => (Math.random() - 0.5) * 2;
  const currentPrice = price.price + jitter() * 3;
  const currentChangePct = price.changePct + jitter();
  const currentVolume = price.volume * (0.8 + Math.random() * 0.4);

  switch (alert.condition) {
    case "price_above":
      return currentPrice >= alert.threshold;
    case "price_below":
      return currentPrice <= alert.threshold;
    case "pct_change_up":
      return currentChangePct >= alert.threshold;
    case "pct_change_down":
      return currentChangePct <= -alert.threshold;
    case "volume_spike":
      return currentVolume >= alert.threshold * 1_000_000;
    default:
      return false;
  }
}

export default function AlertBuilder() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("price_above");
  const [threshold, setThreshold] = useState("");
  const [channels, setChannels] = useState<NotifChannel[]>(["in_app"]);
  const [showForm, setShowForm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  // Alert evaluation loop - every 30 seconds
  useEffect(() => {
    const evaluate = () => {
      setAlerts((prev) => {
        let changed = false;
        const next = prev.map((alert) => {
          if (!alert.enabled || alert.triggered) return alert;

          const mockPrice = MOCK_PRICES[alert.symbol];
          if (!mockPrice) {
            // Generate random mock data for unknown symbols
            const randPrice = {
              price: 50 + Math.random() * 400,
              changePct: (Math.random() - 0.5) * 6,
              volume: 5_000_000 + Math.random() * 50_000_000,
            };
            if (evaluateCondition(alert, randPrice)) {
              changed = true;
              return {
                ...alert,
                triggered: true,
                lastTriggeredAt: new Date().toISOString(),
              };
            }
            return alert;
          }

          if (evaluateCondition(alert, mockPrice)) {
            changed = true;
            return {
              ...alert,
              triggered: true,
              lastTriggeredAt: new Date().toISOString(),
            };
          }
          return alert;
        });

        if (changed) {
          persistAlerts(next);
        }
        return changed ? next : prev;
      });
    };

    intervalRef.current = setInterval(evaluate, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleAddAlert = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const sym = symbol.trim().toUpperCase();
      const thresh = parseFloat(threshold);
      if (!sym || !Number.isFinite(thresh) || thresh <= 0) return;

      const newAlert: Alert = {
        id: generateId(),
        symbol: sym,
        condition,
        threshold: thresh,
        channels: channels.length > 0 ? channels : ["in_app"],
        enabled: true,
        triggered: false,
        lastTriggeredAt: null,
        createdAt: new Date().toISOString(),
      };

      const next = [newAlert, ...alerts];
      setAlerts(next);
      persistAlerts(next);
      setSymbol("");
      setThreshold("");
      setChannels(["in_app"]);
      setShowForm(false);
    },
    [alerts, symbol, condition, threshold, channels]
  );

  const toggleChannel = useCallback((ch: NotifChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }, []);

  const toggleAlert = useCallback(
    (id: string) => {
      const next = alerts.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled, triggered: false } : a
      );
      setAlerts(next);
      persistAlerts(next);
    },
    [alerts]
  );

  const deleteAlert = useCallback(
    (id: string) => {
      const next = alerts.filter((a) => a.id !== id);
      setAlerts(next);
      persistAlerts(next);
    },
    [alerts]
  );

  const resetAlert = useCallback(
    (id: string) => {
      const next = alerts.map((a) =>
        a.id === id ? { ...a, triggered: false, lastTriggeredAt: null } : a
      );
      setAlerts(next);
      persistAlerts(next);
    },
    [alerts]
  );

  const activeCount = alerts.filter((a) => a.enabled && !a.triggered).length;
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2">
              <Zap size={13} style={{ color: "var(--accent)" }} />
              Advanced Alert Builder
            </div>
            <p className="text-sm muted mt-1">
              Create custom alerts with multi-condition triggers and notification routing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] rounded-full px-2 py-0.5 badge-positive font-semibold">
              {activeCount} active
            </span>
            {triggeredCount > 0 && (
              <span className="text-[11px] rounded-full px-2 py-0.5 badge-negative font-semibold">
                {triggeredCount} triggered
              </span>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
            >
              {showForm ? (
                <>
                  <ChevronDown size={14} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={14} />
                  New Alert
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Create alert form */}
      {showForm && (
        <form onSubmit={handleAddAlert} className="alert-rule-card surface-glass dynamic-surface">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
            Configure Alert
          </div>

          <div className="alert-condition mb-3">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[11px] muted block mb-1">Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="text-[11px] muted block mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AlertCondition)}
                className="w-full rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-sm"
              >
                {(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="text-[11px] muted block mb-1">
                Threshold
                {condition === "volume_spike" ? " (M)" : condition.includes("pct") ? " (%)" : " ($)"}
              </label>
              <input
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={condition === "volume_spike" ? "50" : condition.includes("pct") ? "2.5" : "200"}
                type="number"
                step="0.01"
                min="0.01"
                className="w-full rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[11px] muted block mb-1.5">Notification Channels</label>
            <div className="alert-channel-chips">
              {CHANNEL_CONFIG.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  className={`alert-channel-chip inline-flex items-center gap-1 ${
                    channels.includes(ch.id) ? "active" : ""
                  }`}
                >
                  {ch.icon}
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-xs font-semibold"
          >
            <Bell size={13} />
            Create Alert
          </button>
        </form>
      )}

      {/* Alert list */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-rule-card surface-glass dynamic-surface ${
                alert.triggered ? "triggered" : alert.enabled ? "active" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {CONDITION_ICONS[alert.condition]}
                    <span className="text-sm font-bold section-title">{alert.symbol}</span>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      alert.triggered
                        ? "badge-negative"
                        : alert.enabled
                        ? "badge-positive"
                        : "badge-neutral"
                    }`}
                  >
                    {alert.triggered ? "Triggered" : alert.enabled ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {alert.triggered && (
                    <button
                      onClick={() => resetAlert(alert.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] px-2 py-1 text-[11px] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <MessageSquare size={11} />
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] px-2 py-1 text-[11px] hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {alert.enabled ? <Pause size={11} /> : <Play size={11} />}
                    {alert.enabled ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2 py-1 text-[11px]"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs muted">
                {CONDITION_LABELS[alert.condition]}{" "}
                {alert.condition === "volume_spike"
                  ? `${alert.threshold}M`
                  : alert.condition.includes("pct")
                  ? `${alert.threshold}%`
                  : `$${alert.threshold.toFixed(2)}`}
              </div>

              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <div className="alert-channel-chips">
                  {alert.channels.map((ch) => {
                    const config = CHANNEL_CONFIG.find((c) => c.id === ch);
                    return (
                      <span key={ch} className="alert-channel-chip active">
                        {config?.icon}
                        {config?.label}
                      </span>
                    );
                  })}
                </div>
                {alert.lastTriggeredAt && (
                  <span className="text-[10px] muted flex items-center gap-1">
                    <BellRing size={10} />
                    Last: {formatDateTime(alert.lastTriggeredAt)}
                  </span>
                )}
                <span className="text-[10px] muted">
                  Created: {formatDateTime(alert.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {alerts.length === 0 && !showForm && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Bell size={28} className="mx-auto muted" />
          <p className="mt-3 text-sm muted">
            No alerts configured. Create your first alert to get notified on price movements.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
          >
            <Plus size={14} />
            Create Alert
          </button>
        </div>
      )}
    </div>
  );
}
