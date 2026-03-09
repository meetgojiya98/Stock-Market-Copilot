"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  X,
  Sparkles,
  ScanLine,
  TrendingUp,
  Eye,
  StickyNote,
} from "lucide-react";

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
};

const HIDDEN_PATHS = ["/", "/login", "/signup"];

export default function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const fabRef = useRef<HTMLDivElement>(null);

  const actions: QuickAction[] = [
    {
      label: "New Research",
      icon: <Sparkles size={18} />,
      action: () => {
        router.push("/research");
        setOpen(false);
      },
    },
    {
      label: "Scan Watchlist",
      icon: <ScanLine size={18} />,
      action: () => {
        router.push("/agents");
        setOpen(false);
      },
    },
    {
      label: "Quick Trade",
      icon: <TrendingUp size={18} />,
      action: () => {
        router.push("/paper-trading");
        setOpen(false);
      },
    },
    {
      label: "Add to Watchlist",
      icon: <Eye size={18} />,
      action: () => {
        const symbol = prompt("Enter stock symbol to add to watchlist:");
        if (symbol && symbol.trim()) {
          try {
            const existing = JSON.parse(
              localStorage.getItem("zentrade_quick_watchlist") || "[]"
            );
            existing.push(symbol.trim().toUpperCase());
            localStorage.setItem(
              "zentrade_quick_watchlist",
              JSON.stringify(existing)
            );
          } catch {
            // ignore
          }
        }
        setOpen(false);
      },
    },
    {
      label: "Take Note",
      icon: <StickyNote size={18} />,
      action: () => {
        const note = prompt("Quick note:");
        if (note && note.trim()) {
          try {
            const existing = JSON.parse(
              localStorage.getItem("zentrade_quick_notes") || "[]"
            );
            existing.push({
              text: note.trim(),
              timestamp: new Date().toISOString(),
            });
            localStorage.setItem(
              "zentrade_quick_notes",
              JSON.stringify(existing)
            );
          } catch {
            // ignore
          }
        }
        setOpen(false);
      },
    },
  ];

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // Hide on certain pages
  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[90] transition-opacity duration-200"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={fabRef}
        className="fixed z-[95] right-5 bottom-20 sm:bottom-6 flex flex-col-reverse items-end gap-2"
      >
        {/* Action items */}
        {actions.map((action, i) => (
          <div
            key={action.label}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              opacity: open ? 1 : 0,
              transform: open
                ? "translateY(0) scale(1)"
                : `translateY(${(i + 1) * 8}px) scale(0.8)`,
              pointerEvents: open ? "auto" : "none",
              transitionDelay: open ? `${i * 40}ms` : "0ms",
            }}
          >
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg"
              style={{
                backgroundColor: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--surface-border)",
              }}
            >
              {action.label}
            </span>
            <button
              onClick={action.action}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--ink)",
                border: "1px solid var(--surface-border)",
              }}
            >
              {action.icon}
            </button>
          </div>
        ))}

        {/* Main FAB */}
        <button
          onClick={() => setOpen((p) => !p)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: "var(--accent-2)",
            color: "#fff",
          }}
        >
          <div
            className="transition-transform duration-200"
            style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            {open ? <X size={22} /> : <Plus size={22} />}
          </div>
        </button>
      </div>
    </>
  );
}
