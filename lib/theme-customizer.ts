export type ThemeConfig = {
  accentColor: string;
  fontScale: "compact" | "default" | "large";
  density: "compact" | "comfortable" | "spacious";
  borderRadius: "none" | "small" | "medium" | "large";
};

export const PRESET_ACCENT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
];

const STORAGE_KEY = "zentrade_theme_config_v1";

const DEFAULT_CONFIG: ThemeConfig = {
  accentColor: "#6366f1",
  fontScale: "default",
  density: "comfortable",
  borderRadius: "medium",
};

export function getDefaultConfig(): ThemeConfig {
  return { ...DEFAULT_CONFIG };
}

export function getThemeConfig(): ThemeConfig {
  if (typeof window === "undefined") return getDefaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    return { ...getDefaultConfig(), ...JSON.parse(raw) };
  } catch {
    return getDefaultConfig();
  }
}

export function saveThemeConfig(config: ThemeConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage full or unavailable
  }
}

const FONT_SCALE_MAP: Record<ThemeConfig["fontScale"], string> = {
  compact: "0.875",
  default: "1",
  large: "1.125",
};

const DENSITY_MAP: Record<ThemeConfig["density"], string> = {
  compact: "0.5rem",
  comfortable: "1rem",
  spacious: "1.5rem",
};

const BORDER_RADIUS_MAP: Record<ThemeConfig["borderRadius"], string> = {
  none: "0px",
  small: "4px",
  medium: "8px",
  large: "16px",
};

export function applyTheme(config: ThemeConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent-2", config.accentColor);
  root.style.setProperty("--theme-font-scale", FONT_SCALE_MAP[config.fontScale]);
  root.style.setProperty("--theme-density", DENSITY_MAP[config.density]);
  root.style.setProperty("--theme-radius", BORDER_RADIUS_MAP[config.borderRadius]);
  root.style.fontSize = `${parseFloat(FONT_SCALE_MAP[config.fontScale]) * 16}px`;
}
