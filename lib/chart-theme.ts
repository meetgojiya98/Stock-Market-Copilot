/**
 * Consistent chart theme using CSS custom properties.
 * All charts should use these values instead of hardcoded colors.
 */

export const CHART_COLORS = {
  primary: "var(--accent)",
  primaryFill: "color-mix(in srgb, var(--accent) 15%, transparent)",
  positive: "var(--positive)",
  positiveFill: "color-mix(in srgb, var(--positive) 12%, transparent)",
  negative: "var(--negative)",
  negativeFill: "color-mix(in srgb, var(--negative) 12%, transparent)",
  warning: "var(--warning)",
  warningFill: "color-mix(in srgb, var(--warning) 12%, transparent)",
  grid: "var(--surface-border)",
  text: "var(--ink-muted)",
  background: "var(--surface-card)",
};

/**
 * Resolve CSS variable to a computed color (for Chart.js which needs actual values).
 * Call this in a useEffect or after mount when the DOM is available.
 */
export function resolveChartColors(): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      primary: "#4f6bed",
      primaryFill: "rgba(79,107,237,0.15)",
      positive: "#22c55e",
      positiveFill: "rgba(34,197,94,0.12)",
      negative: "#ef4444",
      negativeFill: "rgba(239,68,68,0.12)",
      warning: "#f59e0b",
      warningFill: "rgba(245,158,11,0.12)",
      grid: "#e5e7eb",
      text: "#6b7280",
      background: "#ffffff",
    };
  }

  const style = getComputedStyle(document.documentElement);
  const get = (prop: string) => style.getPropertyValue(prop).trim() || "#888";

  const accent = get("--accent");
  const positive = get("--positive");
  const negative = get("--negative");
  const warning = get("--warning");

  return {
    primary: accent,
    primaryFill: `${accent}26`,
    positive,
    positiveFill: `${positive}1F`,
    negative,
    negativeFill: `${negative}1F`,
    warning,
    warningFill: `${warning}1F`,
    grid: get("--surface-border"),
    text: get("--ink-muted"),
    background: get("--surface-card"),
  };
}

/** Standard Chart.js font config */
export const CHART_FONT = {
  family: "inherit",
  size: 11,
  weight: 500 as number,
};

/** Standard Chart.js grid config */
export function chartGridConfig(colors: Record<string, string>) {
  return {
    color: colors.grid,
    drawBorder: false,
    tickLength: 0,
  };
}
