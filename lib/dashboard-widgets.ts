export type WidgetType =
  | "market-pulse"
  | "portfolio-summary"
  | "agent-status"
  | "signal-feed"
  | "watchlist"
  | "performance-chart"
  | "sector-heatmap"
  | "news-headlines";

export type Widget = {
  id: string;
  type: WidgetType;
  position: number;
  visible: boolean;
  size: "small" | "medium" | "large";
};

const STORAGE_KEY = "zentrade_widget_layout_v1";

export const WIDGET_LABELS: Record<WidgetType, string> = {
  "market-pulse": "Market Pulse",
  "portfolio-summary": "Portfolio Summary",
  "agent-status": "Agent Status",
  "signal-feed": "Signal Feed",
  watchlist: "Watchlist",
  "performance-chart": "Performance Chart",
  "sector-heatmap": "Sector Heatmap",
  "news-headlines": "News Headlines",
};

const DEFAULT_LAYOUT: Widget[] = [
  { id: "w1", type: "market-pulse", position: 0, visible: true, size: "large" },
  { id: "w2", type: "portfolio-summary", position: 1, visible: true, size: "medium" },
  { id: "w3", type: "agent-status", position: 2, visible: true, size: "medium" },
  { id: "w4", type: "signal-feed", position: 3, visible: true, size: "medium" },
  { id: "w5", type: "watchlist", position: 4, visible: true, size: "medium" },
  { id: "w6", type: "performance-chart", position: 5, visible: true, size: "medium" },
  { id: "w7", type: "sector-heatmap", position: 6, visible: true, size: "medium" },
  { id: "w8", type: "news-headlines", position: 7, visible: true, size: "medium" },
];

export function getDefaultLayout(): Widget[] {
  return DEFAULT_LAYOUT.map((w) => ({ ...w }));
}

export function getWidgetLayout(): Widget[] {
  if (typeof window === "undefined") return getDefaultLayout();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultLayout();
    const parsed = JSON.parse(raw) as Widget[];
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultLayout();
    return parsed;
  } catch {
    return getDefaultLayout();
  }
}

export function saveWidgetLayout(widgets: Widget[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // storage full
  }
}

export function reorderWidgets(
  widgets: Widget[],
  fromIndex: number,
  toIndex: number
): Widget[] {
  const next = [...widgets];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((w, i) => ({ ...w, position: i }));
}

export function toggleWidget(widgets: Widget[], id: string): Widget[] {
  return widgets.map((w) =>
    w.id === id ? { ...w, visible: !w.visible } : w
  );
}
