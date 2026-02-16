"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Keyboard } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Shortcut data
   ──────────────────────────────────────────────────────────────────────────── */

type Shortcut = {
  keys: string[];
  description: string;
};

type ShortcutGroup = {
  title: string;
  shortcuts: Shortcut[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["G", "P"], description: "Go to Portfolio" },
      { keys: ["G", "W"], description: "Go to Watchlist" },
      { keys: ["G", "R"], description: "Go to Research" },
      { keys: ["G", "E"], description: "Go to Execution" },
      { keys: ["G", "A"], description: "Go to Alerts" },
      { keys: ["Tab"], description: "Move to next section" },
      { keys: ["Shift", "Tab"], description: "Move to previous section" },
      { keys: ["H"], description: "Go to Home / Dashboard" },
    ],
  },
  {
    title: "Trading",
    shortcuts: [
      { keys: ["T"], description: "Open quick trade modal" },
      { keys: ["B"], description: "Quick buy current symbol" },
      { keys: ["S"], description: "Quick sell current symbol" },
      { keys: ["Ctrl", "Enter"], description: "Submit order" },
      { keys: ["Ctrl", "Shift", "C"], description: "Cancel all open orders" },
      { keys: ["L"], description: "Toggle limit / market order" },
      { keys: ["+"], description: "Increase quantity by 1" },
      { keys: ["-"], description: "Decrease quantity by 1" },
    ],
  },
  {
    title: "Research",
    shortcuts: [
      { keys: ["/"], description: "Focus search / command palette" },
      { keys: ["Ctrl", "Shift", "F"], description: "Open smart search" },
      { keys: ["F"], description: "Toggle fundamentals panel" },
      { keys: ["C"], description: "Toggle chart view" },
      { keys: ["N"], description: "Toggle news feed" },
      { keys: ["I"], description: "Toggle AI insights" },
      { keys: ["Ctrl", "K"], description: "Open command palette" },
    ],
  },
  {
    title: "Tables",
    shortcuts: [
      { keys: ["\u2191"], description: "Move up one row" },
      { keys: ["\u2193"], description: "Move down one row" },
      { keys: ["\u2190"], description: "Move to previous column" },
      { keys: ["\u2192"], description: "Move to next column" },
      { keys: ["Enter"], description: "Open selected row" },
      { keys: ["Space"], description: "Select / deselect row" },
      { keys: ["Ctrl", "A"], description: "Select all rows" },
      { keys: ["Delete"], description: "Remove selected items" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "Toggle this help overlay" },
      { keys: ["Escape"], description: "Close modal / cancel action" },
      { keys: ["Ctrl", "Z"], description: "Undo last action" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo last action" },
      { keys: ["Ctrl", "S"], description: "Save current view" },
      { keys: ["D"], description: "Toggle dark mode" },
      { keys: ["Ctrl", ","], description: "Open settings" },
      { keys: ["Ctrl", "."], description: "Toggle sidebar" },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   Helper: detect if input is focused
   ──────────────────────────────────────────────────────────────────────────── */

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/* ────────────────────────────────────────────────────────────────────────────
   ShortcutOverlay Component
   ──────────────────────────────────────────────────────────────────────────── */

export default function ShortcutOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Toggle via ? key */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setQuery("");
        return;
      }

      // ? to toggle (only when not in an input)
      if (e.key === "?" && !isInputFocused()) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) setQuery("");
          return !prev;
        });
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  /* Focus search input when overlay opens */
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  /* Close on backdrop click */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    },
    []
  );

  /* Filter shortcuts based on search query */
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return SHORTCUT_GROUPS;

    const q = query.toLowerCase().trim();
    const result: ShortcutGroup[] = [];

    for (const group of SHORTCUT_GROUPS) {
      const matchingShortcuts = group.shortcuts.filter(
        (s) =>
          s.description.toLowerCase().includes(q) ||
          s.keys.some((k) => k.toLowerCase().includes(q))
      );

      if (matchingShortcuts.length > 0) {
        result.push({ ...group, shortcuts: matchingShortcuts });
      }
    }

    return result;
  }, [query]);

  const totalShortcuts = useMemo(
    () => SHORTCUT_GROUPS.reduce((sum, g) => sum + g.shortcuts.length, 0),
    []
  );

  const filteredCount = useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.shortcuts.length, 0),
    [filteredGroups]
  );

  if (!open) return null;

  return (
    <div
      className="shortcut-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="shortcut-panel" ref={panelRef}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Keyboard size={18} style={{ color: "var(--accent)" }} />
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-muted)",
              padding: "0.25rem",
              borderRadius: "0.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            position: "relative",
            marginBottom: "0.75rem",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "0.65rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter shortcuts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.45rem 0.65rem 0.45rem 2rem",
              fontSize: "0.82rem",
              background: "var(--surface-emphasis)",
              border: "1px solid var(--surface-border)",
              borderRadius: "0.4rem",
              color: "var(--ink)",
              outline: "none",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--surface-border)"}
          />
        </div>

        {/* Count */}
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--ink-muted)",
            marginBottom: "0.75rem",
          }}
        >
          {query.trim()
            ? `${filteredCount} of ${totalShortcuts} shortcuts`
            : `${totalShortcuts} shortcuts`}
        </div>

        {/* Groups */}
        {filteredGroups.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem 1rem",
              color: "var(--ink-muted)",
              fontSize: "0.82rem",
            }}
          >
            No shortcuts match &ldquo;{query}&rdquo;
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.title} className="shortcut-group">
              <div className="shortcut-group-title">{group.title}</div>
              {group.shortcuts.map((shortcut, idx) => (
                <div key={`${group.title}-${idx}`} className="shortcut-row">
                  <span style={{ color: "var(--ink)" }}>
                    {shortcut.description}
                  </span>
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, ki) => (
                      <kbd key={ki} className="shortcut-key">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Footer hint */}
        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--surface-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            fontSize: "0.7rem",
            color: "var(--ink-muted)",
          }}
        >
          <span>Press</span>
          <kbd className="shortcut-key">?</kbd>
          <span>to toggle</span>
          <span style={{ margin: "0 0.25rem" }}>&middot;</span>
          <kbd className="shortcut-key">Esc</kbd>
          <span>to close</span>
        </div>
      </div>
    </div>
  );
}
