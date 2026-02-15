export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODE_KEY = "smc_theme_mode_v1";
export const THEME_MODE_LEGACY_KEY = "theme";
export const THEME_MODE_CHANGE_EVENT = "smc-theme-mode-change";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function systemPrefersDark() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveThemeMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }

  return mode;
}

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = localStorage.getItem(THEME_MODE_KEY);
  if (isThemeMode(stored)) {
    return stored;
  }

  const legacy = localStorage.getItem(THEME_MODE_LEGACY_KEY);
  if (legacy === "light" || legacy === "dark") {
    return legacy;
  }

  return "system";
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.themeMode = mode;

  localStorage.setItem(THEME_MODE_KEY, mode);
  localStorage.setItem(THEME_MODE_LEGACY_KEY, resolved);
}
