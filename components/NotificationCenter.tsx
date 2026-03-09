"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Trash2, X, AlertTriangle, Info, TrendingUp, BriefcaseBusiness } from "lucide-react";
import { fetchNotificationsData } from "../lib/data-client";

type Notification = {
  id?: string;
  symbol: string;
  message: string;
  time: string;
  type?: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - Date.parse(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getTypeIcon(type?: string) {
  switch (type) {
    case "price-alert": return <TrendingUp size={12} />;
    case "agent-alert": return <AlertTriangle size={12} />;
    case "portfolio": return <BriefcaseBusiness size={12} />;
    default: return <Info size={12} />;
  }
}

function getTypeColor(type?: string) {
  switch (type) {
    case "price-alert": return "var(--accent-2)";
    case "agent-alert": return "var(--negative)";
    case "portfolio": return "var(--positive)";
    default: return "var(--ink-muted)";
  }
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    const result = await fetchNotificationsData();
    setNotifications(result.data);
  }, []);

  useEffect(() => {
    loadNotifications();
    // Load read IDs
    try {
      const raw = localStorage.getItem("zentrade_notif_read_v1");
      if (raw) setReadIds(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, [loadNotifications]);

  // Refresh when panel opens
  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => n.id && !readIds.has(n.id)).length;

  const markAllRead = () => {
    const ids = new Set(notifications.map((n) => n.id).filter(Boolean) as string[]);
    setReadIds(ids);
    try { localStorage.setItem("zentrade_notif_read_v1", JSON.stringify([...ids])); } catch { /* ignore */ }
  };

  const clearAll = () => {
    try { localStorage.removeItem("smc_local_notifications_v2"); } catch { /* ignore */ }
    setNotifications([]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="topbar-icon-btn relative"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: "var(--negative)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card overflow-hidden"
          style={{
            boxShadow: "0 12px 40px color-mix(in srgb, var(--ink) 15%, transparent)",
            maxHeight: "70vh",
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--ink)]">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: "var(--accent-2)" }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] transition-colors"
                    title="Mark all read"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_8%,transparent)] transition-colors"
                    title="Clear all"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 52px)" }}>
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={24} className="mx-auto mb-2 text-[var(--ink-muted)] opacity-40" />
                <p className="text-sm text-[var(--ink-muted)]">No notifications yet</p>
                <p className="text-xs text-[var(--ink-muted)] opacity-60 mt-1">
                  Agent alerts and price triggers will appear here
                </p>
              </div>
            ) : (
              notifications.slice(0, 50).map((notif, i) => {
                const isUnread = notif.id ? !readIds.has(notif.id) : false;
                const color = getTypeColor(notif.type);
                return (
                  <div
                    key={notif.id || i}
                    className="px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                        style={{
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                          color,
                        }}
                      >
                        {getTypeIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--accent-2)]">{notif.symbol}</span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)]" />
                          )}
                          <span className="text-[10px] text-[var(--ink-muted)] ml-auto shrink-0">
                            {timeAgo(notif.time)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ink)] mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
