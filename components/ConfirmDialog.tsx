"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

/* ── Types ── */
export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmCtx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const Ctx = createContext<ConfirmCtx>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(Ctx).confirm;
}

/* ── Provider ── */
export default function ConfirmDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [closing, setClosing] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setClosing(false);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setClosing(true);
    setTimeout(() => {
      resolveRef.current?.(result);
      resolveRef.current = null;
      setOptions(null);
      setClosing(false);
    }, 200);
  }, []);

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}

      {options && (
        <div
          className={`confirm-backdrop ${closing ? "confirm-fade-out" : "confirm-fade-in"}`}
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-label={options.title}
        >
          <div
            className={`confirm-panel ${closing ? "confirm-scale-out" : "confirm-scale-in"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {options.destructive && (
              <div className="confirm-icon-wrap destructive">
                <AlertTriangle size={22} />
              </div>
            )}

            <h2 className="confirm-title">{options.title}</h2>
            <p className="confirm-message">{options.message}</p>

            <div className="confirm-actions">
              <button
                className="confirm-btn cancel"
                onClick={() => close(false)}
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                className={`confirm-btn ${options.destructive ? "destructive" : "primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
