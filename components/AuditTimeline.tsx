"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNotificationsData } from "../lib/data-client";

type AuditEvent = {
  type: string;
  symbol?: string;
  detail?: string;
  time: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

export default function AuditTimeline() {
  const [timeline, setTimeline] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return timeline;

    return timeline.filter((entry) => {
      const haystack = `${entry.type} ${entry.symbol ?? ""} ${entry.detail ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [timeline, filter]);

  useEffect(() => {
    const token = localStorage.getItem("access_token") || undefined;

    const load = async () => {
      if (API_BASE) {
        try {
          const response = await fetch(`${API_BASE}/audit`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await response.json();
          if (Array.isArray(data)) {
            setTimeline(data);
            return;
          }
        } catch {
          // Fall through to local mode.
        }
      }

      const notifications = await fetchNotificationsData(token);
      const fallback = notifications.data.map((item) => ({
        type: item.type || "Local Event",
        symbol: item.symbol,
        detail: item.message,
        time: item.time,
      }));
      setTimeline(fallback);
      if (notifications.mode === "local") {
        setError("Showing local event history.");
      }
    };

    load().catch(() => setError("Unable to load audit history."));
  }, []);

  return (
    <div className="space-y-4">
      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter by type, symbol, or detail"
        className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[220px]"
      />

      {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}

      <ul className="space-y-2">
        {filtered.map((entry, index) => (
          <li
            key={`${entry.type}-${entry.time}-${index}`}
            className="card-elevated rounded-xl p-3"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="font-semibold">{entry.type}</div>
              <div className="text-xs muted">{entry.time ? new Date(entry.time).toLocaleString() : "Unknown time"}</div>
            </div>
            <div className="text-sm mt-1 muted">
              {entry.symbol ? `${entry.symbol} • ` : ""}
              {entry.detail ?? "No detail"}
            </div>
          </li>
        ))}

        {!filtered.length && (
          <li className="card-elevated rounded-xl p-4 text-sm muted">
            No audit events found.
          </li>
        )}
      </ul>
    </div>
  );
}
