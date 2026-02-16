"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Eye,
  Bell,
  Activity,
  Link2,
  Flag,
  Flame,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Square,
  CheckSquare,
  Grid3X3,
} from "lucide-react";

type Widget = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  content: string;
};

const ALL_WIDGETS: Widget[] = [
  { id: "portfolio_summary", label: "Portfolio Summary", icon: BriefcaseBusiness, content: "Your portfolio at a glance. Total value, today's change, and top movers." },
  { id: "watchlist_preview", label: "Watchlist Preview", icon: Eye, content: "Quick view of your watchlist with latest prices and daily changes." },
  { id: "recent_alerts", label: "Recent Alerts", icon: Bell, content: "Your latest price alerts and notifications. Stay on top of what matters." },
  { id: "market_status", label: "Market Status", icon: Activity, content: "Is the market open or closed? See current S&P 500, Dow, and Nasdaq levels." },
  { id: "quick_links", label: "Quick Links", icon: Link2, content: "Jump to your most-used pages: Portfolio, Research, Execution, and more." },
  { id: "goal_progress", label: "Goal Progress", icon: Flag, content: "Track your investment goals. See how close you are to each target." },
  { id: "sector_heatmap", label: "Sector Heatmap", icon: Flame, content: "Visual overview of sector performance. Green means up, red means down." },
  { id: "daily_tip", label: "Daily Tip", icon: Lightbulb, content: "A new investing tip every day. Small lessons that add up over time." },
];

const DEFAULT_LAYOUT = ["portfolio_summary", "watchlist_preview", "market_status", "quick_links", "daily_tip"];

const STORAGE_KEY = "smc_dashboard_layout_v1";

type LayoutItem = { id: string; enabled: boolean };

function loadLayout(): LayoutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return ALL_WIDGETS.map((w) => ({
    id: w.id,
    enabled: DEFAULT_LAYOUT.includes(w.id),
  }));
}

function saveLayout(layout: LayoutItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export default function DashboardBuilder() {
  const [layout, setLayout] = useState<LayoutItem[]>([]);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const enabledCount = useMemo(() => layout.filter((l) => l.enabled).length, [layout]);

  const widgetMap = useMemo(() => {
    const map: Record<string, Widget> = {};
    for (const w of ALL_WIDGETS) map[w.id] = w;
    return map;
  }, []);

  const update = (next: LayoutItem[]) => {
    setLayout(next);
    saveLayout(next);
  };

  const toggleWidget = (id: string) => {
    const next = layout.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l));
    update(next);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...layout];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    update(next);
  };

  const moveDown = (index: number) => {
    if (index >= layout.length - 1) return;
    const next = [...layout];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    update(next);
  };

  const resetLayout = () => {
    const def = ALL_WIDGETS.map((w) => ({
      id: w.id,
      enabled: DEFAULT_LAYOUT.includes(w.id),
    }));
    update(def);
  };

  const enabledWidgets = layout.filter((l) => l.enabled);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Grid3X3 size={13} /> Available
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{ALL_WIDGETS.length} widgets</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Check size={13} /> Enabled
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{enabledCount} active</div>
        </div>
        <div className="rounded-xl control-surface p-3 flex items-center">
          <button
            onClick={resetLayout}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold w-full justify-center"
          >
            <RotateCcw size={13} /> Reset to Default
          </button>
        </div>
      </div>

      {/* Widget config list */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="text-sm font-semibold section-title mb-3">Configure Widgets</div>
        <div className="space-y-1">
          {layout.map((item, index) => {
            const widget = widgetMap[item.id];
            if (!widget) return null;
            const Icon = widget.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  item.enabled ? "control-surface" : "opacity-50"
                }`}
              >
                <button onClick={() => toggleWidget(item.id)} className="flex-shrink-0">
                  {item.enabled ? (
                    <CheckSquare size={16} style={{ color: "var(--accent)" }} />
                  ) : (
                    <Square size={16} className="muted" />
                  )}
                </button>
                <Icon size={14} className={item.enabled ? "" : "muted"} style={item.enabled ? { color: "var(--accent)" } : undefined} />
                <span className="flex-1 text-sm font-semibold section-title truncate">{widget.label}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded muted hover:opacity-80 disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === layout.length - 1}
                    className="p-1 rounded muted hover:opacity-80 disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Widget preview grid */}
      {enabledWidgets.length === 0 ? (
        <div className="rounded-xl control-surface p-4 text-sm muted">
          No widgets enabled. Toggle some widgets above to build your dashboard.
        </div>
      ) : (
        <div>
          <div className="text-sm font-semibold section-title mb-3">Preview</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {enabledWidgets.map((item) => {
              const widget = widgetMap[item.id];
              if (!widget) return null;
              const Icon = widget.icon;
              return (
                <div key={item.id} className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg"
                      style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                      <Icon size={14} style={{ color: "var(--accent)" }} />
                    </div>
                    <span className="text-sm font-semibold section-title">{widget.label}</span>
                  </div>
                  <div className="rounded-xl control-surface p-3">
                    <p className="text-sm muted leading-relaxed">{widget.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
