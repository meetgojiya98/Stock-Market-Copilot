"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Zap, Shield, Newspaper, X } from "lucide-react";

type ToastType = "alert" | "signal" | "risk" | "news";

type ToastItem = {
  id: string;
  title: string;
  body: string;
  type: ToastType;
  createdAt: number;
};

const ICON_MAP: Record<ToastType, React.ElementType> = {
  alert: Bell,
  signal: Zap,
  risk: Shield,
  news: Newspaper,
};

const COLOR_MAP: Record<ToastType, string> = {
  alert: "var(--warning)",
  signal: "var(--accent-2)",
  risk: "var(--negative)",
  news: "var(--positive)",
};

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    function handleNotify(e: Event) {
      const detail = (e as CustomEvent).detail as {
        title: string;
        body: string;
        type: ToastType;
      };
      if (!detail) return;

      const newToast: ToastItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: detail.title,
        body: detail.body,
        type: detail.type || "alert",
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const next = [newToast, ...prev];
        return next.slice(0, MAX_TOASTS);
      });
    }

    window.addEventListener("zentrade:notify", handleNotify);
    return () => window.removeEventListener("zentrade:notify", handleNotify);
  }, []);

  // Auto-dismiss timers
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => {
      const remaining = AUTO_DISMISS_MS - (Date.now() - t.createdAt);
      if (remaining <= 0) {
        removeToast(t.id);
        return null;
      }
      return setTimeout(() => removeToast(t.id), remaining);
    });
    return () => {
      timers.forEach((timer) => timer && clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 360,
        width: "100%",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type];
        const color = COLOR_MAP[toast.type];
        return (
          <div
            key={toast.id}
            className="glass-card"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              borderLeft: `3px solid ${color}`,
              animation: "toastSlideIn 0.3s ease-out",
              pointerEvents: "auto",
            }}
          >
            <Icon size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  lineHeight: 1.3,
                }}
              >
                {toast.title}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.76rem",
                  color: "var(--ink-muted)",
                  lineHeight: 1.4,
                }}
              >
                {toast.body}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: "var(--ink-muted)",
                flexShrink: 0,
              }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
