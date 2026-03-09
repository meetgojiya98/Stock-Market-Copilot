"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  GripVertical,
  EyeOff,
  Eye,
  Settings2,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Briefcase,
  Bot,
  Zap,
  BarChart3,
  Newspaper,
  Grid3X3,
} from "lucide-react";
import {
  type Widget,
  type WidgetType,
  WIDGET_LABELS,
  getWidgetLayout,
  saveWidgetLayout,
  reorderWidgets,
  toggleWidget,
  getDefaultLayout,
} from "../../lib/dashboard-widgets";

/* ── Mock Widget Content ── */

function MarketPulseContent() {
  const indices = [
    { name: "S&P 500", price: "5,234.18", change: "+0.82%", up: true },
    { name: "NASDAQ", price: "16,428.82", change: "+1.14%", up: true },
    { name: "DOW", price: "39,512.84", change: "-0.12%", up: false },
    { name: "RUSSELL", price: "2,084.15", change: "+0.45%", up: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {indices.map((idx) => (
        <div
          key={idx.name}
          className="rounded-lg p-2.5"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--surface-border)",
          }}
        >
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            {idx.name}
          </div>
          <div
            className="text-sm font-bold mt-0.5"
            style={{ color: "var(--ink)" }}
          >
            {idx.price}
          </div>
          <div
            className="text-[10px] font-medium flex items-center gap-0.5 mt-0.5"
            style={{ color: idx.up ? "var(--positive)" : "var(--negative)" }}
          >
            {idx.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {idx.change}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioSummaryContent() {
  const segments = [
    { label: "Tech", pct: 42, color: "#6366f1" },
    { label: "Health", pct: 22, color: "#22c55e" },
    { label: "Finance", pct: 18, color: "#f97316" },
    { label: "Energy", pct: 12, color: "#06b6d4" },
    { label: "Other", pct: 6, color: "#8b5cf6" },
  ];
  return (
    <div className="space-y-3">
      <div>
        <div
          className="text-[10px]"
          style={{ color: "var(--ink-muted)" }}
        >
          Total Value
        </div>
        <div
          className="text-lg font-bold"
          style={{ color: "var(--ink)" }}
        >
          $128,432.50
        </div>
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--positive)" }}
        >
          +$2,841.20 (+2.26%) today
        </div>
      </div>
      <div className="flex rounded-full overflow-hidden h-3">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span
              className="text-[10px]"
              style={{ color: "var(--ink-muted)" }}
            >
              {s.label} {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentStatusContent() {
  const agents = [
    { name: "Momentum", status: "active" },
    { name: "Value", status: "active" },
    { name: "Sentiment", status: "paused" },
    { name: "Macro", status: "active" },
    { name: "Technical", status: "error" },
    { name: "Arbitrage", status: "active" },
  ];
  const statusColors: Record<string, string> = {
    active: "var(--positive)",
    paused: "var(--warning)",
    error: "var(--negative)",
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {agents.map((a) => (
        <div key={a.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColors[a.status] }}
          />
          <span className="text-xs" style={{ color: "var(--ink)" }}>
            {a.name}
          </span>
          <span
            className="text-[10px] ml-auto"
            style={{ color: "var(--ink-muted)" }}
          >
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function SignalFeedContent() {
  const signals = [
    { symbol: "NVDA", signal: "BUY", strength: "Strong", time: "2m ago" },
    { symbol: "AAPL", signal: "HOLD", strength: "Moderate", time: "15m ago" },
    { symbol: "TSLA", signal: "SELL", strength: "Weak", time: "1h ago" },
  ];
  const signalColors: Record<string, string> = {
    BUY: "var(--positive)",
    SELL: "var(--negative)",
    HOLD: "var(--warning)",
  };
  return (
    <div className="space-y-2">
      {signals.map((s) => (
        <div
          key={s.symbol}
          className="flex items-center justify-between rounded-lg p-2"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--ink)" }}
            >
              {s.symbol}
            </span>
            <span
              className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                color: signalColors[s.signal],
                backgroundColor: "var(--surface-2)",
              }}
            >
              {s.signal}
            </span>
          </div>
          <div className="text-right">
            <div
              className="text-[10px]"
              style={{ color: "var(--ink-muted)" }}
            >
              {s.strength}
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--ink-muted)" }}
            >
              {s.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchlistContent() {
  const stocks = [
    { symbol: "AAPL", price: "$198.11", change: "+1.24%", up: true },
    { symbol: "MSFT", price: "$425.52", change: "+0.68%", up: true },
    { symbol: "GOOGL", price: "$176.38", change: "-0.32%", up: false },
    { symbol: "AMZN", price: "$186.21", change: "+2.15%", up: true },
    { symbol: "META", price: "$502.30", change: "-0.87%", up: false },
  ];
  return (
    <div className="space-y-1">
      {stocks.map((s) => (
        <div
          key={s.symbol}
          className="flex items-center justify-between py-1.5 px-1"
          style={{ borderBottom: "1px solid var(--surface-border)" }}
        >
          <span
            className="text-xs font-bold"
            style={{ color: "var(--ink)" }}
          >
            {s.symbol}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--ink)" }}>
              {s.price}
            </span>
            <span
              className="text-[10px] font-medium w-14 text-right"
              style={{
                color: s.up ? "var(--positive)" : "var(--negative)",
              }}
            >
              {s.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PerformanceChartContent() {
  const points = [20, 35, 28, 42, 38, 55, 50, 62, 58, 70, 65, 78];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 280;
  const h = 80;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ maxHeight: 100 }}
      >
        <path
          d={path}
          fill="none"
          stroke="var(--accent-2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`${path} L${w},${h} L0,${h} Z`}
          fill="var(--accent-2)"
          opacity="0.1"
        />
      </svg>
      <div className="flex justify-between w-full mt-1">
        <span
          className="text-[10px]"
          style={{ color: "var(--ink-muted)" }}
        >
          30d ago
        </span>
        <span
          className="text-[10px] font-medium"
          style={{ color: "var(--positive)" }}
        >
          +12.4%
        </span>
        <span
          className="text-[10px]"
          style={{ color: "var(--ink-muted)" }}
        >
          Today
        </span>
      </div>
    </div>
  );
}

function SectorHeatmapContent() {
  const sectors = [
    { name: "Tech", change: 2.1 },
    { name: "Health", change: 0.8 },
    { name: "Finance", change: -0.4 },
    { name: "Energy", change: -1.2 },
    { name: "Consumer", change: 1.5 },
    { name: "Utilities", change: 0.3 },
    { name: "Real Estate", change: -0.6 },
    { name: "Materials", change: 0.9 },
    { name: "Industrial", change: -0.2 },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {sectors.map((s) => (
        <div
          key={s.name}
          className="rounded p-2 text-center"
          style={{
            backgroundColor:
              s.change > 0
                ? `rgba(34,197,94,${Math.min(s.change / 3, 0.7)})`
                : `rgba(239,68,68,${Math.min(Math.abs(s.change) / 3, 0.7)})`,
          }}
        >
          <div
            className="text-[10px] font-medium truncate"
            style={{ color: "var(--ink)" }}
          >
            {s.name}
          </div>
          <div
            className="text-[10px] font-bold"
            style={{
              color: s.change > 0 ? "var(--positive)" : "var(--negative)",
            }}
          >
            {s.change > 0 ? "+" : ""}
            {s.change}%
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsHeadlinesContent() {
  const headlines = [
    { title: "Fed signals potential rate cut in Q2", time: "12m", src: "Reuters" },
    { title: "NVIDIA beats earnings estimates by 18%", time: "1h", src: "Bloomberg" },
    { title: "Oil prices surge amid Middle East tensions", time: "2h", src: "CNBC" },
    { title: "Apple announces $100B buyback program", time: "4h", src: "WSJ" },
  ];
  return (
    <div className="space-y-2">
      {headlines.map((h, i) => (
        <div
          key={i}
          className="py-1.5"
          style={{
            borderBottom:
              i < headlines.length - 1
                ? "1px solid var(--surface-border)"
                : "none",
          }}
        >
          <div
            className="text-xs leading-snug"
            style={{ color: "var(--ink)" }}
          >
            {h.title}
          </div>
          <div
            className="text-[10px] mt-0.5"
            style={{ color: "var(--ink-muted)" }}
          >
            {h.src} · {h.time} ago
          </div>
        </div>
      ))}
    </div>
  );
}

const WIDGET_CONTENT: Record<WidgetType, () => React.ReactNode> = {
  "market-pulse": MarketPulseContent,
  "portfolio-summary": PortfolioSummaryContent,
  "agent-status": AgentStatusContent,
  "signal-feed": SignalFeedContent,
  watchlist: WatchlistContent,
  "performance-chart": PerformanceChartContent,
  "sector-heatmap": SectorHeatmapContent,
  "news-headlines": NewsHeadlinesContent,
};

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  "market-pulse": <Activity size={14} />,
  "portfolio-summary": <Briefcase size={14} />,
  "agent-status": <Bot size={14} />,
  "signal-feed": <Zap size={14} />,
  watchlist: <Eye size={14} />,
  "performance-chart": <BarChart3 size={14} />,
  "sector-heatmap": <Grid3X3 size={14} />,
  "news-headlines": <Newspaper size={14} />,
};

/* ── Main Component ── */

export default function WidgetGrid() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setWidgets(getWidgetLayout());
  }, []);

  const persist = useCallback((next: Widget[]) => {
    setWidgets(next);
    saveWidgetLayout(next);
  }, []);

  const handleToggle = (id: string) => {
    persist(toggleWidget(widgets, id));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    persist(reorderWidgets(widgets, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    if (index >= widgets.length - 1) return;
    persist(reorderWidgets(widgets, index, index + 1));
  };

  const handleResetLayout = () => {
    persist(getDefaultLayout());
  };

  const visibleWidgets = widgets.filter((w) => w.visible);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setEditMode((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: editMode ? "var(--accent-2)" : "var(--surface-2)",
            color: editMode ? "#fff" : "var(--ink)",
            border: editMode ? "none" : "1px solid var(--surface-border)",
          }}
        >
          {editMode ? <X size={14} /> : <Settings2 size={14} />}
          {editMode ? "Done" : "Customize"}
        </button>

        {editMode && (
          <button
            onClick={handleResetLayout}
            className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--ink-muted)" }}
          >
            Reset Layout
          </button>
        )}
      </div>

      {/* Edit Mode: All widgets list */}
      {editMode && (
        <div
          className="glass-card p-4 space-y-1"
          style={{ border: "1px solid var(--accent-2)" }}
        >
          <div
            className="text-xs font-medium mb-2"
            style={{ color: "var(--ink-muted)" }}
          >
            Toggle widgets visibility and reorder
          </div>
          {widgets.map((w, i) => (
            <div
              key={w.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors"
              style={{
                backgroundColor:
                  dragIndex === i ? "var(--surface-2)" : "transparent",
              }}
            >
              <div className="flex gap-0.5">
                <button
                  onClick={() => handleMoveUp(i)}
                  disabled={i === 0}
                  className="p-0.5 rounded disabled:opacity-20"
                  style={{ color: "var(--ink-muted)" }}
                  title="Move up"
                >
                  <TrendingUp size={12} />
                </button>
                <button
                  onClick={() => handleMoveDown(i)}
                  disabled={i === widgets.length - 1}
                  className="p-0.5 rounded disabled:opacity-20"
                  style={{ color: "var(--ink-muted)" }}
                  title="Move down"
                >
                  <TrendingDown size={12} />
                </button>
              </div>
              <GripVertical
                size={14}
                style={{ color: "var(--ink-muted)", opacity: 0.4 }}
              />
              <span
                className="text-xs font-medium flex-1"
                style={{
                  color: w.visible ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                {WIDGET_LABELS[w.type]}
              </span>
              <button
                onClick={() => handleToggle(w.id)}
                className="p-1 rounded transition-colors"
                style={{
                  color: w.visible ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                {w.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleWidgets.map((w) => {
          const ContentComponent = WIDGET_CONTENT[w.type];
          return (
            <div
              key={w.id}
              className={`glass-card p-4 ${
                w.size === "large" ? "md:col-span-2 lg:col-span-3" : ""
              }`}
            >
              {/* Widget title bar */}
              <div
                className="flex items-center justify-between mb-3 pb-2"
                style={{ borderBottom: "1px solid var(--surface-border)" }}
              >
                <div className="flex items-center gap-2">
                  {editMode && (
                    <GripVertical
                      size={14}
                      style={{
                        color: "var(--ink-muted)",
                        cursor: "grab",
                      }}
                    />
                  )}
                  <span style={{ color: "var(--accent-2)" }}>
                    {WIDGET_ICONS[w.type]}
                  </span>
                  <h3
                    className="text-xs font-semibold"
                    style={{ color: "var(--ink)" }}
                  >
                    {WIDGET_LABELS[w.type]}
                  </h3>
                </div>
                {editMode && (
                  <button
                    onClick={() => handleToggle(w.id)}
                    className="p-1 rounded transition-colors hover:opacity-70"
                    style={{ color: "var(--ink-muted)" }}
                    title="Hide widget"
                  >
                    <EyeOff size={14} />
                  </button>
                )}
              </div>

              {/* Widget content */}
              <ContentComponent />
            </div>
          );
        })}
      </div>

      {visibleWidgets.length === 0 && (
        <div
          className="glass-card p-8 text-center"
          style={{ color: "var(--ink-muted)" }}
        >
          <Settings2
            size={32}
            className="mx-auto mb-2"
            style={{ opacity: 0.3 }}
          />
          <p className="text-sm">No widgets visible.</p>
          <p className="text-xs mt-1">
            Click &quot;Customize&quot; to show widgets.
          </p>
        </div>
      )}
    </div>
  );
}
