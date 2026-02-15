"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyThemeMode,
  isThemeMode,
  readThemeMode,
  resolveThemeMode,
  THEME_MODE_CHANGE_EVENT,
  THEME_MODE_KEY,
  type ThemeMode,
} from "./theme-mode";

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncFromStorage = () => {
      const next = readThemeMode();
      setMode(next);
      applyThemeMode(next);
    };

    syncFromStorage();

    const onMedia = () => {
      const current = readThemeMode();
      if (current === "system") {
        applyThemeMode("system");
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_MODE_KEY || event.key === "theme") {
        syncFromStorage();
      }
    };

    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      if (isThemeMode(detail)) {
        setMode(detail);
        applyThemeMode(detail);
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onMedia);
    } else {
      media.addListener(onMedia);
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, onThemeChange as EventListener);

    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", onMedia);
      } else {
        media.removeListener(onMedia);
      }

      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, onThemeChange as EventListener);
    };
  }, []);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
    applyThemeMode(next);
    window.dispatchEvent(new CustomEvent(THEME_MODE_CHANGE_EVENT, { detail: next }));
  }, []);

  const resolvedMode = useMemo(() => resolveThemeMode(mode), [mode]);

  return {
    mode,
    resolvedMode,
    setThemeMode,
  };
}
