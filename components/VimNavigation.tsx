"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Command,
  Keyboard,
  Search,
  Type,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type VimMode = "normal" | "insert";

interface VimNavigationContextValue {
  mode: VimMode;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

interface VimNavigationProps {
  children: React.ReactNode;
  defaultEnabled?: boolean;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_vim_mode_v1";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const NAV_ROUTES: Record<string, string> = {
  p: "/portfolio",
  w: "/watchlist",
  r: "/research",
  a: "/alerts",
  e: "/execution",
};

const NAV_LABELS: Record<string, string> = {
  p: "Portfolio",
  w: "Watchlist",
  r: "Research",
  a: "Alerts",
  e: "Execution",
};

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const VimNavigationContext = createContext<VimNavigationContextValue>({
  mode: "normal",
  enabled: false,
  setEnabled: () => {},
});

export function useVimNavigation() {
  return useContext(VimNavigationContext);
}

/* ------------------------------------------------------------------ */
/* Helper: get all focusable elements                                  */
/* ------------------------------------------------------------------ */

function getFocusableElements(): HTMLElement[] {
  const els = document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(els).filter(
    (el) => el.offsetParent !== null && !el.closest(".vim-command-display") && !el.closest(".vim-mode-indicator"),
  );
}

function isInputElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function VimNavigation({
  children,
  defaultEnabled,
}: VimNavigationProps) {
  /* State */
  const [enabled, setEnabledRaw] = useState(false);
  const [mode, setMode] = useState<VimMode>("normal");
  const [pendingKeys, setPendingKeys] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Load enabled state from localStorage */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (defaultEnabled !== undefined) {
      setEnabledRaw(defaultEnabled);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabledRaw(stored === "true");
      }
    } catch {
      /* ignore */
    }
  }, [defaultEnabled]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledRaw(v);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, String(v));
      } catch {
        /* ignore */
      }
    }
    if (!v) {
      setMode("normal");
      setPendingKeys("");
      setShowSearch(false);
    }
  }, []);

  /* Flash a status message */
  const flashStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(""), 1500);
  }, []);

  /* Focus movement */
  const moveFocus = useCallback((direction: "next" | "prev") => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const current = document.activeElement as HTMLElement;
    const idx = elements.indexOf(current);

    let nextIdx: number;
    if (direction === "next") {
      nextIdx = idx === -1 ? 0 : (idx + 1) % elements.length;
    } else {
      nextIdx = idx === -1 ? elements.length - 1 : (idx - 1 + elements.length) % elements.length;
    }

    elements[nextIdx].focus();
    elements[nextIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  /* Search highlight */
  const executeSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    const elements = getFocusableElements();
    const lowerQ = query.toLowerCase();
    const match = elements.find((el) => {
      const text = el.textContent?.toLowerCase() || "";
      return text.includes(lowerQ);
    });
    if (match) {
      match.focus();
      match.scrollIntoView({ block: "center", behavior: "smooth" });
      flashStatus(`Found: "${query}"`);
    } else {
      flashStatus(`Not found: "${query}"`);
    }
    setShowSearch(false);
    setSearchQuery("");
  }, [flashStatus]);

  /* Navigate to route */
  const navigateTo = useCallback((routeKey: string) => {
    const route = NAV_ROUTES[routeKey];
    const label = NAV_LABELS[routeKey];
    if (route) {
      flashStatus(`Navigating to ${label}...`);
      /* Use Next.js router if available, otherwise window.location */
      if (typeof window !== "undefined") {
        window.location.href = route;
      }
    }
  }, [flashStatus]);

  /* Main keydown handler */
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as Element;

      /* Search mode input handling */
      if (showSearch) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSearch(false);
          setSearchQuery("");
        }
        /* Let the search input handle other keys */
        return;
      }

      /* If focus is on an input element and we're in insert mode, ignore */
      if (isInputElement(target) && mode === "insert") {
        if (e.key === "Escape") {
          e.preventDefault();
          setMode("normal");
          (target as HTMLElement).blur();
          setPendingKeys("");
          flashStatus("NORMAL mode");
        }
        return;
      }

      /* If focus is on an input element in normal mode, don't intercept
         unless it's Escape */
      if (isInputElement(target) && mode === "normal") {
        if (e.key === "Escape") {
          e.preventDefault();
          (target as HTMLElement).blur();
        }
        return;
      }

      /* Normal mode key handling */
      if (mode === "normal") {
        /* Handle pending "g" prefix */
        if (pendingKeys === "g") {
          e.preventDefault();
          setPendingKeys("");
          if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);

          if (NAV_ROUTES[e.key]) {
            navigateTo(e.key);
          } else if (e.key === "g") {
            /* gg = go to top */
            window.scrollTo({ top: 0, behavior: "smooth" });
            flashStatus("Top of page");
          } else {
            flashStatus(`Unknown: g${e.key}`);
          }
          return;
        }

        switch (e.key) {
          case "j": {
            e.preventDefault();
            moveFocus("next");
            break;
          }
          case "k": {
            e.preventDefault();
            moveFocus("prev");
            break;
          }
          case "i": {
            e.preventDefault();
            setMode("insert");
            flashStatus("INSERT mode");
            /* If current focus is on an input, stay on it */
            const active = document.activeElement;
            if (active && isInputElement(active)) {
              (active as HTMLElement).focus();
            }
            break;
          }
          case "Enter": {
            e.preventDefault();
            const focused = document.activeElement as HTMLElement;
            if (focused && focused !== document.body) {
              focused.click();
            }
            break;
          }
          case "/": {
            e.preventDefault();
            setShowSearch(true);
            setSearchQuery("");
            setTimeout(() => searchInputRef.current?.focus(), 50);
            break;
          }
          case "g": {
            e.preventDefault();
            setPendingKeys("g");
            if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = setTimeout(() => {
              setPendingKeys("");
            }, 1500);
            break;
          }
          case "G": {
            e.preventDefault();
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            flashStatus("Bottom of page");
            break;
          }
          case "Escape": {
            e.preventDefault();
            setPendingKeys("");
            setShowSearch(false);
            break;
          }
          default:
            break;
        }
      }

      /* Insert mode: only Escape exits */
      if (mode === "insert") {
        if (e.key === "Escape") {
          e.preventDefault();
          setMode("normal");
          setPendingKeys("");
          flashStatus("NORMAL mode");
          const active = document.activeElement as HTMLElement;
          if (active && isInputElement(active)) {
            active.blur();
          }
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, mode, pendingKeys, showSearch, moveFocus, navigateTo, flashStatus, executeSearch]);

  /* Context value */
  const contextValue = useMemo<VimNavigationContextValue>(
    () => ({ mode, enabled, setEnabled }),
    [mode, enabled, setEnabled],
  );

  return (
    <VimNavigationContext.Provider value={contextValue}>
      {children}

      {/* Vim mode indicator (bottom-right) */}
      {enabled && (
        <div
          className="vim-mode-indicator"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            background:
              mode === "normal"
                ? "rgba(59,130,246,0.9)"
                : "rgba(34,197,94,0.9)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "monospace",
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            letterSpacing: 1,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {mode === "normal" ? (
            <Keyboard size={13} />
          ) : (
            <Type size={13} />
          )}
          {mode === "normal" ? "NORMAL" : "INSERT"}
        </div>
      )}

      {/* Command display (bottom-center) - shows pending keys or status */}
      {enabled && (pendingKeys || statusMessage) && (
        <div
          className="vim-command-display"
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            borderRadius: 8,
            background: "rgba(30,30,40,0.95)",
            border: "1px solid rgba(148,163,184,0.2)",
            color: pendingKeys ? "#f59e0b" : "rgba(255,255,255,0.8)",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "monospace",
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          <Command size={12} />
          {pendingKeys ? `${pendingKeys}...` : statusMessage}
        </div>
      )}

      {/* Search overlay */}
      {enabled && showSearch && (
        <div
          style={{
            position: "fixed",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(30,30,40,0.98)",
            border: "1px solid rgba(59,130,246,0.3)",
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            minWidth: 300,
          }}
        >
          <Search size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                executeSearch(searchQuery);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setShowSearch(false);
                setSearchQuery("");
              }
            }}
            placeholder="Search text on page..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              fontFamily: "monospace",
              color: "inherit",
            }}
          />
          <span style={{ fontSize: 10, opacity: 0.3 }}>Enter to search, Esc to cancel</span>
        </div>
      )}

      {/* Focus ring style injection */}
      {enabled && mode === "normal" && (
        <style>{`
          *:focus {
            outline: 2px solid rgba(139, 92, 246, 0.6) !important;
            outline-offset: 2px !important;
          }
          .vim-focus-ring {
            outline: 2px solid rgba(139, 92, 246, 0.6);
            outline-offset: 2px;
          }
        `}</style>
      )}
    </VimNavigationContext.Provider>
  );
}
