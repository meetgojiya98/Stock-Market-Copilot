"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NAVIGATION_CHORDS } from "@/lib/keyboard-shortcuts";

/* ------------------------------------------------------------------ */
/*  Invisible component that handles global keyboard shortcuts         */
/* ------------------------------------------------------------------ */

/** Elements where we should NOT intercept single-key shortcuts */
function isEditableTarget(e: Event): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function KeyboardShortcuts() {
  const router = useRouter();

  /** Tracks whether "G" was pressed and we're awaiting the second key */
  const chordPending = useRef(false);
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearChord = useCallback(() => {
    chordPending.current = false;
    if (chordTimer.current) {
      clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      /* ---- Shift + / (i.e. "?") — always works, even in inputs ---- */
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("smc:show-shortcuts"));
        return;
      }

      /* Skip single-key shortcuts when focus is in an editable field */
      if (isEditableTarget(e)) return;

      /* Don't interfere with modifier combos (Cmd+K, Ctrl+C, etc.) */
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      /* ---- Second key of a G-chord ---- */
      if (chordPending.current) {
        clearChord();
        const route = NAVIGATION_CHORDS[key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        return;
      }

      /* ---- First key: G starts a chord ---- */
      if (key === "g" && !e.shiftKey) {
        chordPending.current = true;
        chordTimer.current = setTimeout(clearChord, 1000);
        return;
      }

      /* ---- Single-key actions ---- */
      if (key === "n" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("smc:new-chat"));
        return;
      }

      if (key === "r" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("smc:refresh"));
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearChord();
    };
  }, [router, clearChord]);

  return null;
}
