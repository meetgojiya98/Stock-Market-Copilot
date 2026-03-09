"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "../lib/use-theme-mode";

export default function DarkModeToggle() {
  const { resolvedMode, setThemeMode, mode } = useThemeMode();

  const toggle = () => {
    setThemeMode(resolvedMode === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
      aria-label={`Theme: ${mode}`}
    >
      {resolvedMode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
