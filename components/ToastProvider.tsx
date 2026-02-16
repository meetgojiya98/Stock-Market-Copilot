"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/* ── Types ── */
type ToastType = "success" | "error" | "info" | "warning";

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  type?: ToastType;
  message: string;
  action?: ToastAction;
  duration?: number;
};

type ToastEntry = ToastOptions & {
  id: string;
  type: ToastType;
  removing?: boolean;
};

type ToastCtx = {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const Ctx = createContext<ToastCtx>({
  toast: () => "",
  dismiss: () => {},
});

export function useToast() {
  return useContext(Ctx);
}

/* ── Icons ── */
const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
};

const TYPE_CLASSES: Record<ToastType, string> = {
  success: "toast-success",
  error: "toast-error",
  info: "toast-info",
  warning: "toast-warning",
};

/* ── Provider ── */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const toast = useCallback(
    (opts: ToastOptions): string => {
      const id = `toast-${++counterRef.current}`;
      const entry: ToastEntry = {
        ...opts,
        id,
        type: opts.type || "info",
      };
      setToasts((prev) => [...prev, entry]);

      const duration = opts.duration ?? (opts.action ? 8000 : 3500);
      setTimeout(() => dismiss(id), duration);

      return id;
    },
    [dismiss]
  );

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container */}
      <div
        className="toast-container"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item ${TYPE_CLASSES[t.type]} ${t.removing ? "toast-exit" : "toast-enter"}`}
            role="alert"
          >
            <span className="toast-icon">{ICONS[t.type]}</span>
            <span className="toast-message">{t.message}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
