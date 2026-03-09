"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { SHORTCUTS } from "@/lib/keyboard-shortcuts";

/* ------------------------------------------------------------------ */
/*  Shortcuts Help Modal                                               */
/* ------------------------------------------------------------------ */

export default function ShortcutsHelpModal() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  /* Listen for the custom event dispatched by KeyboardShortcuts */
  useEffect(() => {
    function onShow() {
      setOpen(true);
    }
    window.addEventListener("smc:show-shortcuts", onShow);
    return () => window.removeEventListener("smc:show-shortcuts", onShow);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const navigation = SHORTCUTS.filter((s) => s.category === "navigation");
  const actions = SHORTCUTS.filter((s) => s.category === "actions");

  return (
    <div className="skm-overlay" onClick={close}>
      <div
        className="glass-card skm-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="skm-header">
          <h2 className="skm-title">Keyboard Shortcuts</h2>
          <button className="skm-close" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="skm-body">
          <ShortcutGroup title="Navigation" items={navigation} />
          <ShortcutGroup title="Actions" items={actions} />
        </div>

        {/* Footer hint */}
        <div className="skm-footer">
          Press <kbd className="skm-kbd">Esc</kbd> or{" "}
          <kbd className="skm-kbd">Shift</kbd> + <kbd className="skm-kbd">/</kbd>{" "}
          to close
        </div>
      </div>

      <style>{`
        /* ---- overlay ---- */
        .skm-overlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: skmFadeIn 0.15s ease;
        }

        @keyframes skmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ---- panel ---- */
        .skm-panel {
          position: relative;
          width: min(640px, 92vw);
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid var(--surface-border, rgba(255,255,255,0.08));
          background: var(--surface, #1a1a2e);
          color: var(--ink, #e0e0e0);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
          animation: skmSlideIn 0.18s ease;
        }

        @keyframes skmSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ---- header ---- */
        .skm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--surface-border, rgba(255,255,255,0.08));
        }

        .skm-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--ink, #e0e0e0);
        }

        .skm-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--ink-muted, #999);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .skm-close:hover {
          background: rgba(255,255,255,0.08);
          color: var(--ink, #e0e0e0);
        }

        /* ---- body ---- */
        .skm-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px 8px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .skm-body::-webkit-scrollbar {
          width: 6px;
        }
        .skm-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .skm-body::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }

        /* ---- group ---- */
        .skm-group-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--accent-2, #7c3aed);
          margin: 0 0 10px;
        }

        .skm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 6px;
        }

        /* ---- row ---- */
        .skm-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.12s;
        }
        .skm-row:hover {
          background: rgba(255,255,255,0.04);
        }

        .skm-row-desc {
          font-size: 13px;
          color: var(--ink-muted, #999);
        }

        .skm-row-keys {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          margin-left: 12px;
        }

        /* ---- kbd ---- */
        .skm-kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 5px;
          border: 1px solid var(--surface-border, rgba(255,255,255,0.12));
          background: rgba(255,255,255,0.06);
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          line-height: 1;
          color: var(--ink, #e0e0e0);
        }

        .skm-kbd-sep {
          font-size: 10px;
          color: var(--ink-muted, #666);
          margin: 0 1px;
        }

        /* ---- footer ---- */
        .skm-footer {
          padding: 12px 24px;
          border-top: 1px solid var(--surface-border, rgba(255,255,255,0.08));
          font-size: 12px;
          color: var(--ink-muted, #666);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ShortcutGroup({
  title,
  items,
}: {
  title: string;
  items: { keys: string; description: string }[];
}) {
  return (
    <div>
      <h3 className="skm-group-title">{title}</h3>
      <div className="skm-grid">
        {items.map((item) => (
          <div key={item.keys} className="skm-row">
            <span className="skm-row-desc">{item.description}</span>
            <span className="skm-row-keys">
              <KeysDisplay keys={item.keys} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders a shortcut key string like "G then D" into styled kbd elements */
function KeysDisplay({ keys }: { keys: string }) {
  /* Split on " + " for combos and " then " for chords */
  const parts = keys.split(/\s+(then|\+)\s+/);

  return (
    <>
      {parts.map((part, i) => {
        if (part === "then") {
          return (
            <span key={i} className="skm-kbd-sep">
              then
            </span>
          );
        }
        if (part === "+") {
          return (
            <span key={i} className="skm-kbd-sep">
              +
            </span>
          );
        }
        return (
          <kbd key={i} className="skm-kbd">
            {part}
          </kbd>
        );
      })}
    </>
  );
}
