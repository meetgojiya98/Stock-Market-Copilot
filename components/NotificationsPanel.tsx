"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClockCheck,
  Archive,
  ArrowUpRight,
  BellRing,
  CheckCheck,
  CircleAlert,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DynamicBackdrop from "./DynamicBackdrop";
import {
  createLocalAlert,
  fetchNotificationsData,
  fetchPortfolioData,
  fetchWatchlistData,
} from "../lib/data-client";

type Severity = "critical" | "ops" | "info";
type FilterMode = "all" | "unread" | "critical" | "ops" | "info" | "archived";
type RuleOperator = "price_above" | "price_below" | "change_above" | "change_below";

type MarketNotification = {
  id?: string;
  symbol: string;
  message: string;
  time: string;
  type?: string;
};

type AlertRule = {
  id: string;
  symbol: string;
  operator: RuleOperator;
  threshold: number;
  cooldownMins: number;
  severity: Severity;
  note: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
};

type QuotePoint = {
  price: number;
  changePct: number;
  asOf: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const READ_KEY = "smc_notifications_read_v2";
const ARCHIVE_KEY = "smc_notifications_archived_v1";
const RULES_KEY = "smc_alert_rules_v3";
const LOCAL_NOTIFICATIONS_KEY = "smc_local_notifications_v2";

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function notificationKey(item: MarketNotification) {
  return item.id || `${normalizeSymbol(item.symbol)}-${item.time}-${item.message}`;
}

function severityFor(notification: MarketNotification): Severity {
  const type = String(notification.type || "").toLowerCase();
  const text = `${type} ${notification.message}`.toLowerCase();

  if (
    type === "critical" ||
    text.includes("critical") ||
    text.includes("risk") ||
    text.includes("drawdown") ||
    text.includes("stop") ||
    text.includes("breach") ||
    text.includes("escalat")
  ) {
    return "critical";
  }
  if (
    type === "portfolio" ||
    type === "watchlist" ||
    type === "execution" ||
    type === "automation" ||
    text.includes("portfolio") ||
    text.includes("watchlist") ||
    text.includes("execution")
  ) {
    return "ops";
  }
  return "info";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDateTime(value?: string) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function operatorLabel(operator: RuleOperator) {
  if (operator === "price_above") return "Price Above";
  if (operator === "price_below") return "Price Below";
  if (operator === "change_above") return "Day Change Above";
  return "Day Change Below";
}

function formatRuleThreshold(rule: AlertRule) {
  if (rule.operator === "price_above" || rule.operator === "price_below") {
    return formatMoney(rule.threshold);
  }
  return formatPercent(rule.threshold);
}

function normalizeNotification(input: MarketNotification): MarketNotification {
  return {
    ...input,
    symbol: normalizeSymbol(input.symbol || "SYS"),
    message: String(input.message || ""),
    time: String(input.time || new Date().toISOString()),
    type: input.type || "info",
  };
}

function mergeNotifications(
  current: MarketNotification[],
  incoming: MarketNotification[]
): MarketNotification[] {
  const map = new Map<string, MarketNotification>();
  [...incoming, ...current].forEach((item) => {
    const normalized = normalizeNotification(item);
    if (!normalized.message) return;
    const key = notificationKey(normalized);
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  });

  return [...map.values()]
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
    .slice(0, 500);
}

function parseBooleanMap(raw: string | null) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => Boolean(value))
    ) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function parseRules(raw: string | null): AlertRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as Partial<AlertRule>;
        const symbol = normalizeSymbol(String(row.symbol || ""));
        const threshold = Number(row.threshold);
        const cooldownMins = Math.max(1, Math.floor(Number(row.cooldownMins) || 60));
        const operator = row.operator;
        const severity = row.severity;
        if (
          !symbol ||
          !Number.isFinite(threshold) ||
          !operator ||
          !severity ||
          !["price_above", "price_below", "change_above", "change_below"].includes(operator) ||
          !["critical", "ops", "info"].includes(severity)
        ) {
          return null;
        }
        return {
          id: String(
            row.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          ),
          symbol,
          operator,
          threshold,
          cooldownMins,
          severity,
          note: String(row.note || ""),
          enabled: row.enabled !== false,
          createdAt: String(row.createdAt || new Date().toISOString()),
          ...(row.lastTriggeredAt
            ? { lastTriggeredAt: String(row.lastTriggeredAt) }
            : {}),
        } as AlertRule;
      })
      .filter((item): item is AlertRule => Boolean(item));
  } catch {
    return [];
  }
}

async function fetchQuote(symbol: string): Promise<QuotePoint> {
  const normalized = normalizeSymbol(symbol);

  if (API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/price/${encodeURIComponent(normalized)}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        const price = Number(data?.price);
        const changePct = Number(data?.change ?? 0);
        if (Number.isFinite(price) && price > 0) {
          return {
            price,
            changePct: Number.isFinite(changePct) ? changePct : 0,
            asOf: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Continue to local API fallback.
    }
  }

  try {
    const response = await fetch(`/api/stocks/price?symbol=${encodeURIComponent(normalized)}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      const price = Number(data?.price);
      const changePct = Number(data?.change ?? 0);
      if (Number.isFinite(price) && price > 0) {
        return {
          price,
          changePct: Number.isFinite(changePct) ? changePct : 0,
          asOf: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fallback below.
  }

  return {
    price: 0,
    changePct: 0,
    asOf: new Date().toISOString(),
  };
}

function rulePasses(rule: AlertRule, quote: QuotePoint) {
  if (rule.operator === "price_above") return quote.price >= rule.threshold;
  if (rule.operator === "price_below") return quote.price <= rule.threshold;
  if (rule.operator === "change_above") return quote.changePct >= rule.threshold;
  return quote.changePct <= rule.threshold;
}

function triggerMessage(rule: AlertRule, quote: QuotePoint) {
  const observed =
    rule.operator === "price_above" || rule.operator === "price_below"
      ? formatMoney(quote.price)
      : formatPercent(quote.changePct);
  const suffix = `${rule.symbol} ${operatorLabel(rule.operator)} ${formatRuleThreshold(rule)} (now ${observed}).`;
  return rule.note.trim() ? `${rule.note.trim()} ${suffix}` : suffix;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<MarketNotification[]>([]);
  const [readSet, setReadSet] = useState<Record<string, boolean>>({});
  const [archivedSet, setArchivedSet] = useState<Record<string, boolean>>({});
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [baseSymbols, setBaseSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuotePoint>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  const [ruleSymbol, setRuleSymbol] = useState("AAPL");
  const [ruleOperator, setRuleOperator] = useState<RuleOperator>("price_above");
  const [ruleThreshold, setRuleThreshold] = useState("");
  const [ruleCooldownMins, setRuleCooldownMins] = useState("60");
  const [ruleSeverity, setRuleSeverity] = useState<Severity>("critical");
  const [ruleNote, setRuleNote] = useState("");

  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const coverageSymbols = useMemo(
    () =>
      [...new Set([...baseSymbols, ...rules.map((rule) => rule.symbol)])]
        .filter(Boolean)
        .slice(0, 40),
    [baseSymbols, rules]
  );

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("access_token") || undefined;
    const result = await fetchNotificationsData(token);
    setNotifications((current) => mergeNotifications(current, result.data));
    setDataMode(result.mode);

    if (result.detail) {
      setError(`Remote stream unavailable. Using local alert channel: ${result.detail}`);
      return;
    }
    setError("");
  }, []);

  const refreshCoverageSymbols = useCallback(async () => {
    const token = localStorage.getItem("access_token") || undefined;
    const [watchlistResult, portfolioResult] = await Promise.all([
      fetchWatchlistData(token),
      fetchPortfolioData(token),
    ]);

    const symbols = [
      ...watchlistResult.data.map((row) => normalizeSymbol(row.symbol)),
      ...portfolioResult.data.map((row) => normalizeSymbol(row.symbol)),
    ].filter(Boolean);
    setBaseSymbols([...new Set(symbols)]);
  }, []);

  const evaluateRules = useCallback(
    async (announceWhenQuiet: boolean) => {
      const activeRules = rules.filter((rule) => rule.enabled);
      if (!activeRules.length) {
        if (announceWhenQuiet) setNotice("No active rules to evaluate.");
        return;
      }

      setEvaluating(true);
      setError("");

      try {
        const symbols = [...new Set(activeRules.map((rule) => rule.symbol))];
        const entries = await Promise.all(
          symbols.map(async (symbol) => [symbol, await fetchQuote(symbol)] as const)
        );
        const quoteMap = Object.fromEntries(entries);
        setQuotes((current) => ({
          ...current,
          ...quoteMap,
        }));

        const now = Date.now();
        let triggered = 0;
        const nextRules = rules.map((rule) => {
          if (!rule.enabled) return rule;

          const quote = quoteMap[rule.symbol];
          if (!quote) return rule;
          if (!rulePasses(rule, quote)) return rule;

          const cooldownMs = Math.max(1, rule.cooldownMins) * 60_000;
          const last = rule.lastTriggeredAt ? Date.parse(rule.lastTriggeredAt) : 0;
          if (last && now - last < cooldownMs) return rule;

          createLocalAlert(rule.symbol, triggerMessage(rule, quote), rule.severity);
          triggered += 1;

          return {
            ...rule,
            lastTriggeredAt: new Date(now).toISOString(),
          };
        });

        setRules(nextRules);

        if (triggered > 0) {
          await fetchNotifications();
          setNotice(`Rule engine triggered ${triggered} alert${triggered === 1 ? "" : "s"}.`);
        } else if (announceWhenQuiet) {
          setNotice("Rule scan complete. No triggers.");
        }
      } catch (evaluationError) {
        setError(
          evaluationError instanceof Error
            ? evaluationError.message
            : "Unable to evaluate alert rules."
        );
      } finally {
        setEvaluating(false);
      }
    },
    [fetchNotifications, rules]
  );

  useEffect(() => {
    setReadSet(parseBooleanMap(localStorage.getItem(READ_KEY)));
    setArchivedSet(parseBooleanMap(localStorage.getItem(ARCHIVE_KEY)));
    setRules(parseRules(localStorage.getItem(RULES_KEY)));
    fetchNotifications();
    refreshCoverageSymbols();
  }, [fetchNotifications, refreshCoverageSymbols]);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(readSet));
  }, [readSet]);

  useEffect(() => {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archivedSet));
  }, [archivedSet]);

  useEffect(() => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    if (!coverageSymbols.length) return;
    if (coverageSymbols.includes(ruleSymbol)) return;
    setRuleSymbol(coverageSymbols[0]);
  }, [coverageSymbols, ruleSymbol]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchNotifications();
      refreshCoverageSymbols();
    }, dataMode === "remote" ? 25_000 : 15_000);
    return () => window.clearInterval(id);
  }, [dataMode, fetchNotifications, refreshCoverageSymbols]);

  useEffect(() => {
    const id = window.setInterval(() => {
      evaluateRules(false);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [evaluateRules]);

  useEffect(() => {
    if (!API_BASE || dataMode !== "remote") {
      websocketRef.current?.close();
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      setSocketConnected(false);
      return;
    }

    let disposed = false;
    const token = localStorage.getItem("access_token");
    const wsBase = API_BASE.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/ws/notifications?token=${token}`;

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(wsUrl);
      websocketRef.current = socket;

      socket.onopen = () => {
        setSocketConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const incoming = normalizeNotification(
            JSON.parse(event.data) as MarketNotification
          );
          setNotifications((current) => mergeNotifications(current, [incoming]));
        } catch {
          // Ignore malformed payloads.
        }
      };

      socket.onclose = () => {
        setSocketConnected(false);
        if (disposed) return;
        reconnectTimerRef.current = window.setTimeout(connect, 8_000);
      };

      socket.onerror = () => {
        setSocketConnected(false);
      };
    };

    connect();

    return () => {
      disposed = true;
      websocketRef.current?.close();
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [dataMode]);

  const activeNotifications = useMemo(
    () =>
      notifications.filter((item) => !archivedSet[notificationKey(item)]),
    [archivedSet, notifications]
  );

  const unreadCount = useMemo(
    () =>
      activeNotifications.filter((item) => !readSet[notificationKey(item)]).length,
    [activeNotifications, readSet]
  );

  const criticalCount = useMemo(
    () =>
      activeNotifications.filter((item) => severityFor(item) === "critical").length,
    [activeNotifications]
  );

  const alerts24h = useMemo(() => {
    const now = Date.now();
    return activeNotifications.filter((item) => now - Date.parse(item.time) < 86_400_000)
      .length;
  }, [activeNotifications]);

  const ruleTriggers24h = useMemo(() => {
    const now = Date.now();
    return rules.filter(
      (rule) =>
        rule.lastTriggeredAt &&
        now - Date.parse(rule.lastTriggeredAt) < 86_400_000
    ).length;
  }, [rules]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source =
      filterMode === "archived"
        ? notifications.filter((item) => archivedSet[notificationKey(item)])
        : notifications.filter((item) => !archivedSet[notificationKey(item)]);

    return source.filter((item) => {
      const id = notificationKey(item);
      const unread = !readSet[id];
      const severity = severityFor(item);

      if (filterMode === "unread" && !unread) return false;
      if (filterMode === "critical" && severity !== "critical") return false;
      if (filterMode === "ops" && severity !== "ops") return false;
      if (filterMode === "info" && severity !== "info") return false;

      if (!query) return true;
      const haystack = `${item.symbol} ${item.message} ${item.type ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [archivedSet, filterMode, notifications, readSet, search]);

  const hourlyVolume = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const point = new Date(now - (11 - index) * 3_600_000);
      const key = `${point.getFullYear()}-${point.getMonth()}-${point.getDate()}-${point.getHours()}`;
      return {
        key,
        label: point.toLocaleTimeString("en-US", { hour: "numeric" }),
        count: 0,
      };
    });
    const byKey: Record<string, number> = {};
    buckets.forEach((bucket) => {
      byKey[bucket.key] = 0;
    });

    activeNotifications.forEach((item) => {
      const time = new Date(item.time);
      const key = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()}-${time.getHours()}`;
      if (Object.prototype.hasOwnProperty.call(byKey, key)) {
        byKey[key] += 1;
      }
    });

    return buckets.map((bucket) => ({
      label: bucket.label,
      count: byKey[bucket.key] || 0,
    }));
  }, [activeNotifications]);

  const markAllRead = () => {
    const next = { ...readSet };
    activeNotifications.forEach((item) => {
      next[notificationKey(item)] = true;
    });
    setReadSet(next);
    setNotice("All active alerts marked as read.");
  };

  const archiveRead = () => {
    const next = { ...archivedSet };
    activeNotifications.forEach((item) => {
      const key = notificationKey(item);
      if (readSet[key]) next[key] = true;
    });
    setArchivedSet(next);
    setNotice("Read alerts archived.");
  };

  const clearArchived = () => {
    setArchivedSet({});
    setNotice("Archived filter cleared.");
  };

  const clearLocalStream = () => {
    localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY);
    setNotifications([]);
    setReadSet({});
    setArchivedSet({});
    setNotice("Local alert stream cleared.");
  };

  const addSimulationAlert = () => {
    const samples = [
      "Stress scenario: Nasdaq -8% now projects portfolio drawdown above guardrail.",
      "Thesis drift detected across top holdings; review memo confidence deltas.",
      "Execution quality warning: slippage trend is widening on recent fills.",
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)];
    createLocalAlert("SIM", sample, "critical");
    fetchNotifications();
    setNotice("Simulation alert injected.");
  };

  const handleCreateRule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const symbol = normalizeSymbol(ruleSymbol);
    const threshold = Number(ruleThreshold);
    const cooldownMins = Number(ruleCooldownMins);

    if (!symbol) {
      setError("Enter a valid symbol for the alert rule.");
      return;
    }
    if (!Number.isFinite(threshold)) {
      setError("Enter a valid threshold.");
      return;
    }

    const nextRule: AlertRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol,
      operator: ruleOperator,
      threshold,
      cooldownMins:
        Number.isFinite(cooldownMins) && cooldownMins > 0
          ? Math.floor(cooldownMins)
          : 60,
      severity: ruleSeverity,
      note: ruleNote.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    setRules((current) => [nextRule, ...current]);
    setRuleThreshold("");
    setRuleNote("");
    setError("");
    setNotice(`Rule added: ${symbol} ${operatorLabel(ruleOperator)} ${formatRuleThreshold(nextRule)}.`);
  };

  const toggleRule = (id: string) => {
    setRules((current) =>
      current.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const deleteRule = (id: string) => {
    setRules((current) => current.filter((rule) => rule.id !== id));
  };

  return (
    <div className="grid xl:grid-cols-[1.45fr_1fr] gap-4">
      <div className="space-y-4">
        <section className="card-elevated dynamic-surface relative overflow-hidden rounded-xl p-4">
          <DynamicBackdrop variant="trading" />
          <div className="relative z-[1] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <BellRing size={16} />
                <span className="font-semibold section-title">
                  Alert Operations Center
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${dataMode === "remote" ? "badge-positive" : "badge-neutral"}`}>
                  {dataMode === "remote" ? "Remote + Local" : "Local"}
                </span>
                {socketConnected ? (
                  <span className="rounded-full px-2 py-0.5 badge-positive inline-flex items-center gap-1">
                    <Wifi size={12} />
                    Socket Live
                  </span>
                ) : (
                  <span className="rounded-full px-2 py-0.5 badge-negative inline-flex items-center gap-1">
                    <WifiOff size={12} />
                    Socket Idle
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs muted">
              Functional alerts pipeline with persistent triage, rule automation, and escalation workflows.
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

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2">
                <div className="text-[11px] muted">Unread</div>
                <div className="text-lg metric-value">{unreadCount}</div>
              </div>
              <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2">
                <div className="text-[11px] muted">Critical Active</div>
                <div className="text-lg metric-value">{criticalCount}</div>
              </div>
              <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2">
                <div className="text-[11px] muted">Alerts (24h)</div>
                <div className="text-lg metric-value">{alerts24h}</div>
              </div>
              <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2">
                <div className="text-[11px] muted">Rule Triggers (24h)</div>
                <div className="text-lg metric-value">{ruleTriggers24h}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search symbol, message, type"
                className="rounded-lg px-3 py-1.5 text-xs control-surface bg-white/80 dark:bg-black/25 w-full sm:w-auto sm:min-w-[180px]"
              />
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                  ["critical", "Critical"],
                  ["ops", "Ops"],
                  ["info", "Info"],
                  ["archived", "Archived"],
                ] as Array<[FilterMode, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilterMode(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    filterMode === id
                      ? id === "critical"
                        ? "bg-red-500 text-white"
                        : "bg-[var(--accent)] text-white"
                      : "control-surface bg-white/75 dark:bg-black/25"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
              >
                <CheckCheck size={13} />
                Mark All Read
              </button>
              <button
                onClick={archiveRead}
                className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
              >
                <Archive size={13} />
                Archive Read
              </button>
              <button
                onClick={clearArchived}
                className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
              >
                <Trash2 size={13} />
                Clear Archive
              </button>
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
              <button
                onClick={addSimulationAlert}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-400/45 bg-amber-500/10 px-3 py-1.5 text-xs"
              >
                <ShieldAlert size={13} />
                Simulate Critical
              </button>
              {dataMode === "local" && (
                <button
                  onClick={clearLocalStream}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 px-3 py-1.5 text-xs text-red-600 dark:text-red-300"
                >
                  <Trash2 size={13} />
                  Clear Local Stream
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="card-elevated dynamic-surface relative overflow-hidden rounded-xl p-4">
          <DynamicBackdrop variant="aurora" />
          <div className="relative z-[1]">
            <h3 className="section-title text-sm mb-2">Alert Volume (Last 12h)</h3>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,122,140,0.18)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--accent-2)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          {filteredNotifications.length === 0 && (
            <div className="card-elevated rounded-xl p-4 text-sm muted">
              No alerts for this filter yet.
            </div>
          )}

          {filteredNotifications.map((item, index) => {
            const id = notificationKey(item);
            const isRead = Boolean(readSet[id]);
            const isArchived = Boolean(archivedSet[id]);
            const severity = severityFor(item);
            const severityClass =
              severity === "critical"
                ? "badge-negative"
                : severity === "ops"
                ? "badge-positive"
                : "badge-neutral";

            return (
              <article
                key={`${id}-${index}`}
                className={`rounded-xl border p-3 ${
                  isArchived
                    ? "border-[var(--surface-border)] bg-black/5 dark:bg-white/5"
                    : isRead
                    ? "border-[var(--surface-border)] bg-white/75 dark:bg-black/25"
                    : severity === "critical"
                    ? "border-red-400/45 bg-red-500/10"
                    : "border-[var(--accent)]/45 bg-[var(--accent)]/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold inline-flex items-center gap-2">
                      {item.symbol}
                      <span className={`text-[10px] rounded-full px-2 py-0.5 ${severityClass}`}>
                        {severity}
                      </span>
                      {!isRead && !isArchived && (
                        <span className="text-[10px] rounded-full badge-positive px-2 py-0.5">
                          new
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-1">{item.message}</div>
                  </div>
                  <button
                    onClick={() =>
                      setReadSet((current) => ({ ...current, [id]: !current[id] }))
                    }
                    className="rounded-lg border border-[var(--surface-border)] bg-white/75 dark:bg-black/20 px-2 py-1 text-[11px]"
                  >
                    {isRead ? "Unread" : "Acknowledge"}
                  </button>
                </div>

                <div className="text-xs muted mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span>{formatDateTime(item.time)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setArchivedSet((current) => ({
                          ...current,
                          [id]: !current[id],
                        }))
                      }
                      className="rounded-lg border border-[var(--surface-border)] bg-white/75 dark:bg-black/20 px-2 py-1 text-[11px]"
                    >
                      {isArchived ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      onClick={() => {
                        createLocalAlert(
                          item.symbol,
                          `Escalated alert: ${item.message}`,
                          "critical"
                        );
                        setReadSet((current) => ({ ...current, [id]: true }));
                        fetchNotifications();
                        setNotice(`Escalated ${item.symbol} alert.`);
                      }}
                      className="rounded-lg border border-red-400/45 bg-red-500/10 px-2 py-1 text-[11px] text-red-600 dark:text-red-300 inline-flex items-center gap-1"
                    >
                      <ArrowUpRight size={11} />
                      Escalate
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card-elevated dynamic-surface relative overflow-hidden rounded-xl p-4">
          <DynamicBackdrop variant="mesh" />
          <div className="relative z-[1] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="section-title text-base inline-flex items-center gap-2">
                <AlarmClockCheck size={15} />
                Alert Rule Engine
              </h3>
              <button
                onClick={() => evaluateRules(true)}
                disabled={evaluating}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-70"
              >
                <Zap size={12} />
                {evaluating ? "Scanning..." : "Run Scan"}
              </button>
            </div>

            <p className="text-xs muted">
              Configure symbol-level triggers with cooldown control. Triggered rules publish directly into this alert stream.
            </p>

            <form onSubmit={handleCreateRule} className="grid sm:grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <div className="muted">Symbol</div>
                <input
                  value={ruleSymbol}
                  onChange={(event) => setRuleSymbol(event.target.value.toUpperCase())}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  placeholder="AAPL"
                  required
                />
              </label>

              <label className="text-xs space-y-1">
                <div className="muted">Condition</div>
                <select
                  value={ruleOperator}
                  onChange={(event) => setRuleOperator(event.target.value as RuleOperator)}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                >
                  <option value="price_above">Price Above</option>
                  <option value="price_below">Price Below</option>
                  <option value="change_above">Day Change Above %</option>
                  <option value="change_below">Day Change Below %</option>
                </select>
              </label>

              <label className="text-xs space-y-1">
                <div className="muted">Threshold</div>
                <input
                  value={ruleThreshold}
                  onChange={(event) => setRuleThreshold(event.target.value)}
                  type="number"
                  step={0.01}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  placeholder={ruleOperator.includes("price") ? "200" : "-3.5"}
                  required
                />
              </label>

              <label className="text-xs space-y-1">
                <div className="muted">Cooldown (mins)</div>
                <input
                  value={ruleCooldownMins}
                  onChange={(event) => setRuleCooldownMins(event.target.value)}
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="text-xs space-y-1">
                <div className="muted">Severity</div>
                <select
                  value={ruleSeverity}
                  onChange={(event) => setRuleSeverity(event.target.value as Severity)}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                >
                  <option value="critical">Critical</option>
                  <option value="ops">Ops</option>
                  <option value="info">Info</option>
                </select>
              </label>

              <label className="text-xs space-y-1 sm:col-span-2">
                <div className="muted">Rule Note</div>
                <input
                  value={ruleNote}
                  onChange={(event) => setRuleNote(event.target.value)}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  placeholder="Optional context added to trigger message"
                />
              </label>

              <button
                type="submit"
                className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-2 text-sm font-semibold"
              >
                <CircleAlert size={13} />
                Add Rule
              </button>
            </form>

            {!!coverageSymbols.length && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {coverageSymbols.slice(0, 12).map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setRuleSymbol(symbol)}
                    className={`rounded-full px-2.5 py-1 text-[11px] border ${
                      ruleSymbol === symbol
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                        : "border-[var(--surface-border)] bg-white/75 dark:bg-black/25"
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card-elevated rounded-xl p-4">
          <h3 className="section-title text-sm mb-2">Configured Rules</h3>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {rules.length === 0 && (
              <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs muted">
                No rules configured yet.
              </div>
            )}
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{rule.symbol}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${rule.enabled ? "badge-positive" : "badge-neutral"}`}>
                    {rule.enabled ? "ACTIVE" : "PAUSED"}
                  </span>
                </div>
                <div className="mt-1 muted">
                  {operatorLabel(rule.operator)} {formatRuleThreshold(rule)} · Cooldown{" "}
                  {rule.cooldownMins}m · {rule.severity.toUpperCase()}
                </div>
                {rule.lastTriggeredAt && (
                  <div className="mt-1 muted">
                    Last triggered {formatDateTime(rule.lastTriggeredAt)}
                  </div>
                )}
                {rule.note && <div className="mt-1">{rule.note}</div>}
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className="rounded-lg border border-[var(--surface-border)] bg-white/75 dark:bg-black/25 px-2.5 py-1 text-[11px]"
                  >
                    {rule.enabled ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="rounded-lg border border-red-400/45 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-600 dark:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card-elevated rounded-xl p-4 text-xs space-y-2">
          <div className="font-semibold section-title">Live Quote Context</div>
          {Object.keys(quotes).length === 0 && (
            <div className="muted">Quotes populate after a rule scan.</div>
          )}
          {Object.entries(quotes)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(0, 10)
            .map(([symbol, quote]) => (
              <div
                key={symbol}
                className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2.5 py-1.5 flex items-center justify-between gap-2"
              >
                <span className="font-semibold">{symbol}</span>
                <span className="metric-value">{formatMoney(quote.price)}</span>
                <span
                  className={
                    quote.changePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                  }
                >
                  {formatPercent(quote.changePct)}
                </span>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}
