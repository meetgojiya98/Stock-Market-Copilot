"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CheckCheck, RefreshCw, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { createLocalAlert, fetchNotificationsData } from "../lib/data-client";

type MarketNotification = {
  id?: string;
  symbol: string;
  message: string;
  time: string;
  type?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

function severityFor(notification: MarketNotification) {
  const text = `${notification.type ?? ""} ${notification.message}`.toLowerCase();
  if (
    text.includes("risk") ||
    text.includes("drop") ||
    text.includes("drawdown") ||
    text.includes("stop") ||
    text.includes("critical") ||
    text.includes("alert")
  ) {
    return "critical";
  }

  if (text.includes("portfolio") || text.includes("watchlist")) {
    return "ops";
  }

  return "info";
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<MarketNotification[]>([]);
  const [readSet, setReadSet] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "critical">("all");
  const [search, setSearch] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");
  const [error, setError] = useState("");
  const websocketRef = useRef<WebSocket | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !readSet[`${item.symbol}-${item.time}-${item.message}`]).length,
    [notifications, readSet]
  );

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const id = `${item.symbol}-${item.time}-${item.message}`;
      const isUnread = !readSet[id];
      const severity = severityFor(item);

      if (filterMode === "unread" && !isUnread) return false;
      if (filterMode === "critical" && severity !== "critical") return false;

      if (!query) return true;

      const haystack = `${item.symbol} ${item.message} ${item.type ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [notifications, filterMode, readSet, search]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("access_token") || undefined;
    const result = await fetchNotificationsData(token);

    setNotifications(result.data);
    setDataMode(result.mode);

    if (result.detail) {
      setError(`Switched to Local Mode: ${result.detail}`);
    } else {
      setError("");
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dataMode !== "local") return;

    const interval = window.setInterval(fetchNotifications, 20_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode]);

  useEffect(() => {
    if (!API_BASE || dataMode !== "remote") {
      setSocketConnected(false);
      websocketRef.current?.close();
      return;
    }

    const token = localStorage.getItem("access_token");
    const wsBase = API_BASE.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/ws/notifications?token=${token}`;

    const socket = new WebSocket(wsUrl);
    websocketRef.current = socket;

    socket.onopen = () => {
      setSocketConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data) as MarketNotification;
        setNotifications((current) => [incoming, ...current]);
      } catch {
        // Ignore invalid payload.
      }
    };

    socket.onclose = () => {
      setSocketConnected(false);
    };

    socket.onerror = () => {
      setSocketConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [dataMode]);

  const markAllRead = () => {
    const entries = notifications.map((item) => [`${item.symbol}-${item.time}-${item.message}`, true] as const);
    setReadSet(Object.fromEntries(entries));
  };

  const addSimulationAlert = () => {
    createLocalAlert("SYS", "Simulation alert: risk threshold crossed for monitored basket.", "critical");
    fetchNotifications();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <BellRing size={16} />
          <span className="font-semibold section-title">Live Notification Stream</span>
          <span className="rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-xs muted">
            {unreadCount} unread
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${dataMode === "remote" ? "badge-positive" : "badge-neutral"}`}>
            {dataMode === "remote" ? "Remote" : "Local"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alerts"
            className="rounded-lg px-3 py-1.5 text-xs control-surface bg-white/80 dark:bg-black/25 min-w-[120px]"
          />
          <button
            onClick={() => setFilterMode("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filterMode === "all"
                ? "bg-[var(--accent-2)] text-white"
                : "control-surface bg-white/75 dark:bg-black/25"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode("unread")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filterMode === "unread"
                ? "bg-[var(--accent)] text-white"
                : "control-surface bg-white/75 dark:bg-black/25"
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilterMode("critical")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filterMode === "critical"
                ? "bg-red-500 text-white"
                : "control-surface bg-white/75 dark:bg-black/25"
            }`}
          >
            Critical
          </button>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
          <button
            onClick={fetchNotifications}
            className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card-elevated rounded-xl px-3 py-2 text-xs flex items-center gap-2 flex-wrap">
        {socketConnected ? (
          <>
            <Wifi size={13} className="text-[var(--positive)]" />
            <span className="text-[var(--positive)]">Websocket connected</span>
          </>
        ) : (
          <>
            <WifiOff size={13} className="text-[var(--negative)]" />
            <span className="text-[var(--negative)]">Realtime socket inactive</span>
          </>
        )}
        <button
          onClick={addSimulationAlert}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-400/45 bg-amber-500/10 px-2.5 py-1 text-xs"
        >
          <ShieldAlert size={12} />
          Simulate Alert
        </button>
      </div>

      {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}

      <div className="space-y-2">
        {filteredNotifications.length === 0 && (
          <div className="card-elevated rounded-xl p-4 text-sm muted">
            No notifications for this filter yet.
          </div>
        )}

        {filteredNotifications.map((item, index) => {
          const id = `${item.symbol}-${item.time}-${item.message}`;
          const isRead = Boolean(readSet[id]);
          const severity = severityFor(item);

          return (
            <button
              key={`${id}-${index}`}
              onClick={() => setReadSet((current) => ({ ...current, [id]: true }))}
              className={`w-full text-left rounded-xl border p-3 transition ${
                isRead
                  ? "border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/25"
                  : severity === "critical"
                  ? "border-red-400/45 bg-red-500/10"
                  : "border-[var(--accent)]/45 bg-[var(--accent)]/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold inline-flex items-center gap-2">
                    {item.symbol}
                    <span className={`text-[10px] rounded-full px-2 py-0.5 ${severity === "critical" ? "badge-negative" : severity === "ops" ? "badge-positive" : "badge-neutral"}`}>
                      {severity}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{item.message}</div>
                </div>
                {!isRead && <span className="text-[10px] rounded-full badge-positive px-2 py-0.5">new</span>}
              </div>
              <div className="text-xs muted mt-2">
                {item.time ? new Date(item.time).toLocaleString() : "Unknown time"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
