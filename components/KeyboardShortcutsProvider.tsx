"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const CHORD_TIMEOUT = 1000;

const GO_TO_SHORTCUTS: Record<string, { path: string; label: string }> = {
  p: { path: "/portfolio", label: "Portfolio" },
  w: { path: "/watchlist", label: "Watchlist" },
  r: { path: "/research", label: "Research" },
  e: { path: "/execution", label: "Execution" },
  a: { path: "/notifications", label: "Alerts" },
};

const ALL_SHORTCUTS = [
  { keys: ["?"], description: "Toggle shortcuts help" },
  { keys: ["/"], description: "Open command palette" },
  { keys: ["S"], description: "Open command palette" },
  { keys: ["G", "P"], description: "Go to Portfolio" },
  { keys: ["G", "W"], description: "Go to Watchlist" },
  { keys: ["G", "R"], description: "Go to Research" },
  { keys: ["G", "E"], description: "Go to Execution" },
  { keys: ["G", "A"], description: "Go to Alerts" },
];

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export default function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();
  const chordRef = useRef<{ pending: boolean; timer: ReturnType<typeof setTimeout> | null }>({
    pending: false,
    timer: null,
  });

  const clearChord = useCallback(() => {
    if (chordRef.current.timer) {
      clearTimeout(chordRef.current.timer);
      chordRef.current.timer = null;
    }
    chordRef.current.pending = false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (isInputFocused()) return;
      // Don't trigger on modifier combos (except the ones we handle)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Handle second key in G chord
      if (chordRef.current.pending) {
        clearChord();
        const target = GO_TO_SHORTCUTS[key];
        if (target) {
          e.preventDefault();
          router.push(target.path);
        }
        return;
      }

      // ? — toggle help modal
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      // / or S — open command palette via Cmd+K dispatch
      if (key === "/" || key === "s") {
        e.preventDefault();
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
        return;
      }

      // G — start chord
      if (key === "g") {
        e.preventDefault();
        chordRef.current.pending = true;
        chordRef.current.timer = setTimeout(() => {
          chordRef.current.pending = false;
          chordRef.current.timer = null;
        }, CHORD_TIMEOUT);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearChord();
    };
  }, [router, clearChord]);

  // Close help modal on Escape
  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [helpOpen]);

  return (
    <>
      {children}

      {helpOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center fade-in"
          onClick={() => setHelpOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl surface-glass dynamic-surface overflow-hidden shadow-2xl fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--surface-border)" }}
            >
              <h2 className="text-sm font-bold section-title">Keyboard Shortcuts</h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1 rounded-lg muted hover:opacity-70 transition-opacity"
                aria-label="Close shortcuts help"
              >
                <X size={16} />
              </button>
            </div>

            {/* Shortcuts grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-5">
              {ALL_SHORTCUTS.map(({ keys, description }, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {keys.map((k, j) => (
                      <span key={j}>
                        <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded px-1.5 text-[11px] font-semibold control-surface section-title">
                          {k}
                        </kbd>
                        {j < keys.length - 1 && (
                          <span className="text-[10px] muted mx-0.5">then</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs muted truncate">{description}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t text-[10px] muted text-center"
              style={{ borderColor: "var(--surface-border)" }}
            >
              Press <kbd className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-semibold control-surface">?</kbd> to toggle this panel
            </div>
          </div>
        </div>
      )}
    </>
  );
}
