"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Bookmark,
  ChevronDown,
  ChevronUp,
  DollarSign,
  GripVertical,
  Layout,
  Lock,
  Newspaper,
  PieChart,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Unlock,
  X,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type WidgetId =
  | "market_overview"
  | "watchlist_mini"
  | "portfolio_summary"
  | "recent_alerts"
  | "top_movers"
  | "sector_heatmap"
  | "quick_trade"
  | "news_headlines";

interface Widget {
  id: WidgetId;
  label: string;
  visible: boolean;
}

type PresetName = "Trading" | "Research" | "Monitoring";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_dashboard_grid_v1";

const ALL_WIDGETS: Widget[] = [
  { id: "market_overview", label: "Market Overview", visible: true },
  { id: "watchlist_mini", label: "Watchlist Mini", visible: true },
  { id: "portfolio_summary", label: "Portfolio Summary", visible: true },
  { id: "recent_alerts", label: "Recent Alerts", visible: true },
  { id: "top_movers", label: "Top Movers", visible: true },
  { id: "sector_heatmap", label: "Sector Heatmap", visible: true },
  { id: "quick_trade", label: "Quick Trade", visible: true },
  { id: "news_headlines", label: "News Headlines", visible: true },
];

const PRESETS: Record<PresetName, WidgetId[]> = {
  Trading: [
    "quick_trade",
    "market_overview",
    "top_movers",
    "watchlist_mini",
    "recent_alerts",
    "portfolio_summary",
  ],
  Research: [
    "market_overview",
    "sector_heatmap",
    "news_headlines",
    "top_movers",
    "watchlist_mini",
    "portfolio_summary",
  ],
  Monitoring: [
    "recent_alerts",
    "watchlist_mini",
    "market_overview",
    "portfolio_summary",
    "top_movers",
    "sector_heatmap",
    "news_headlines",
    "quick_trade",
  ],
};

/* ------------------------------------------------------------------ */
/* Mock data helpers                                                    */
/* ------------------------------------------------------------------ */

const MOCK_INDICES = [
  { name: "S&P 500", value: 5824.1, change: 0.42 },
  { name: "Nasdaq", value: 18392.5, change: 0.68 },
  { name: "Dow Jones", value: 43125.3, change: -0.11 },
  { name: "Russell 2000", value: 2142.7, change: 0.95 },
];

const MOCK_WATCHLIST = [
  { symbol: "AAPL", price: 234.56, change: 1.23 },
  { symbol: "MSFT", price: 445.12, change: -0.34 },
  { symbol: "TSLA", price: 312.88, change: 2.78 },
  { symbol: "NVDA", price: 892.45, change: 3.12 },
  { symbol: "GOOG", price: 178.92, change: -0.56 },
];

const MOCK_PORTFOLIO = {
  totalValue: 284530.12,
  dayChange: 1245.67,
  dayChangePct: 0.44,
  positions: 12,
  cashBalance: 34200.0,
};

const MOCK_ALERTS = [
  { symbol: "AAPL", message: "Price crossed $230 resistance", time: "2m ago", type: "price" as const },
  { symbol: "TSLA", message: "Volume spike detected +340%", time: "15m ago", type: "volume" as const },
  { symbol: "NVDA", message: "RSI entered overbought (78)", time: "32m ago", type: "indicator" as const },
  { symbol: "META", message: "Earnings report in 2 days", time: "1h ago", type: "event" as const },
];

const MOCK_MOVERS = [
  { symbol: "SMCI", change: 12.4, price: 45.67 },
  { symbol: "RIVN", change: 8.9, price: 18.23 },
  { symbol: "PLTR", change: 6.7, price: 82.14 },
  { symbol: "INTC", change: -7.2, price: 22.45 },
  { symbol: "NKE", change: -5.1, price: 74.12 },
];

const MOCK_SECTORS = [
  { name: "Technology", change: 1.8 },
  { name: "Healthcare", change: -0.4 },
  { name: "Financials", change: 0.9 },
  { name: "Energy", change: -1.2 },
  { name: "Consumer", change: 0.3 },
  { name: "Industrial", change: 0.6 },
  { name: "Utilities", change: -0.1 },
  { name: "Real Estate", change: -0.8 },
];

const MOCK_NEWS = [
  { headline: "Fed signals rate decision ahead of March meeting", source: "Reuters", time: "12m" },
  { headline: "NVIDIA announces next-gen AI chip architecture", source: "Bloomberg", time: "34m" },
  { headline: "Tesla recalls 200K vehicles over software glitch", source: "CNBC", time: "1h" },
  { headline: "Apple expands AI features to all iPhone models", source: "TechCrunch", time: "2h" },
  { headline: "Oil prices surge on Middle East supply concerns", source: "WSJ", time: "3h" },
];

/* ------------------------------------------------------------------ */
/* Widget content renderers                                            */
/* ------------------------------------------------------------------ */

function MarketOverviewContent() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {MOCK_INDICES.map((idx) => (
        <div
          key={idx.name}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            background: idx.change >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${idx.change >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{idx.name}</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{idx.value.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: idx.change >= 0 ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", gap: 2 }}>
            {idx.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {idx.change >= 0 ? "+" : ""}{idx.change}%
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchlistMiniContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {MOCK_WATCHLIST.map((s) => (
        <div
          key={s.symbol}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 8px",
            borderRadius: 4,
            background: "rgba(148,163,184,0.06)",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>{s.symbol}</span>
          <span style={{ fontSize: 13 }}>${s.price.toFixed(2)}</span>
          <span
            style={{
              fontSize: 12,
              color: s.change >= 0 ? "#22c55e" : "#ef4444",
              fontWeight: 500,
              minWidth: 50,
              textAlign: "right",
            }}
          >
            {s.change >= 0 ? "+" : ""}{s.change}%
          </span>
        </div>
      ))}
    </div>
  );
}

function PortfolioSummaryContent() {
  const p = MOCK_PORTFOLIO;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>Total Value</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>${p.totalValue.toLocaleString()}</div>
        <div style={{ fontSize: 13, color: p.dayChange >= 0 ? "#22c55e" : "#ef4444" }}>
          {p.dayChange >= 0 ? "+" : ""}${p.dayChange.toLocaleString()} ({p.dayChangePct}%)
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Positions</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{p.positions}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Cash</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>${p.cashBalance.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(148,163,184,0.15)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${((p.totalValue - p.cashBalance) / p.totalValue) * 100}%`,
            background: "linear-gradient(90deg, #8b5cf6, #6366f1)",
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>
        {(((p.totalValue - p.cashBalance) / p.totalValue) * 100).toFixed(1)}% invested
      </div>
    </div>
  );
}

function RecentAlertsContent() {
  const iconFor = (type: string) => {
    switch (type) {
      case "price": return <TrendingUp size={14} />;
      case "volume": return <BarChart3 size={14} />;
      case "indicator": return <Activity size={14} />;
      case "event": return <AlertTriangle size={14} />;
      default: return <Zap size={14} />;
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {MOCK_ALERTS.map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            padding: "6px 8px",
            borderRadius: 4,
            background: "rgba(148,163,184,0.06)",
          }}
        >
          <div style={{ marginTop: 2, color: "#f59e0b" }}>{iconFor(a.type)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {a.symbol} <span style={{ fontWeight: 400, opacity: 0.6 }}>- {a.time}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>{a.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopMoversContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {MOCK_MOVERS.map((m) => (
        <div
          key={m.symbol}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 8px",
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {m.change >= 0 ? (
              <ChevronUp size={14} style={{ color: "#22c55e" }} />
            ) : (
              <ChevronDown size={14} style={{ color: "#ef4444" }} />
            )}
            <span style={{ fontWeight: 600, fontSize: 13 }}>{m.symbol}</span>
          </div>
          <span style={{ fontSize: 12 }}>${m.price.toFixed(2)}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: m.change >= 0 ? "#22c55e" : "#ef4444",
              minWidth: 55,
              textAlign: "right",
            }}
          >
            {m.change >= 0 ? "+" : ""}{m.change}%
          </span>
        </div>
      ))}
    </div>
  );
}

function SectorHeatmapContent() {
  const maxAbs = Math.max(...MOCK_SECTORS.map((s) => Math.abs(s.change)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {MOCK_SECTORS.map((s) => {
        const intensity = Math.abs(s.change) / maxAbs;
        const bg =
          s.change >= 0
            ? `rgba(34,197,94,${0.1 + intensity * 0.3})`
            : `rgba(239,68,68,${0.1 + intensity * 0.3})`;
        return (
          <div
            key={s.name}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: bg,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: s.change >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {s.change >= 0 ? "+" : ""}{s.change}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuickTradeContent() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState("10");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => setSide("buy")}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
            background: side === "buy" ? "#22c55e" : "rgba(148,163,184,0.12)",
            color: side === "buy" ? "#fff" : "inherit",
          }}
        >
          BUY
        </button>
        <button
          onClick={() => setSide("sell")}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
            background: side === "sell" ? "#ef4444" : "rgba(148,163,184,0.12)",
            color: side === "sell" ? "#fff" : "inherit",
          }}
        >
          SELL
        </button>
      </div>
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        placeholder="Symbol"
        style={{
          padding: "6px 10px",
          borderRadius: 4,
          border: "1px solid rgba(148,163,184,0.2)",
          background: "rgba(148,163,184,0.06)",
          fontSize: 13,
          fontWeight: 600,
          outline: "none",
        }}
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        type="number"
        placeholder="Quantity"
        style={{
          padding: "6px 10px",
          borderRadius: 4,
          border: "1px solid rgba(148,163,184,0.2)",
          background: "rgba(148,163,184,0.06)",
          fontSize: 13,
          outline: "none",
        }}
      />
      <div style={{ fontSize: 11, opacity: 0.6 }}>
        Est. total: ${(parseFloat(qty || "0") * 234.56).toLocaleString()}
      </div>
      <button
        style={{
          padding: "8px 0",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13,
          background: side === "buy" ? "#22c55e" : "#ef4444",
          color: "#fff",
        }}
      >
        <ShoppingCart size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
        {side === "buy" ? "Buy" : "Sell"} {symbol}
      </button>
    </div>
  );
}

function NewsHeadlinesContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {MOCK_NEWS.map((n, i) => (
        <div
          key={i}
          style={{
            padding: "6px 8px",
            borderRadius: 4,
            background: "rgba(148,163,184,0.06)",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{n.headline}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
            {n.source} &middot; {n.time}
          </div>
        </div>
      ))}
    </div>
  );
}

const WIDGET_CONTENT: Record<WidgetId, () => React.ReactNode> = {
  market_overview: () => <MarketOverviewContent />,
  watchlist_mini: () => <WatchlistMiniContent />,
  portfolio_summary: () => <PortfolioSummaryContent />,
  recent_alerts: () => <RecentAlertsContent />,
  top_movers: () => <TopMoversContent />,
  sector_heatmap: () => <SectorHeatmapContent />,
  quick_trade: () => <QuickTradeContent />,
  news_headlines: () => <NewsHeadlinesContent />,
};

const WIDGET_ICONS: Record<WidgetId, React.ReactNode> = {
  market_overview: <BarChart3 size={14} />,
  watchlist_mini: <Bookmark size={14} />,
  portfolio_summary: <PieChart size={14} />,
  recent_alerts: <AlertTriangle size={14} />,
  top_movers: <ArrowUpDown size={14} />,
  sector_heatmap: <Layout size={14} />,
  quick_trade: <DollarSign size={14} />,
  news_headlines: <Newspaper size={14} />,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function loadLayout(): Widget[] {
  if (typeof window === "undefined") return ALL_WIDGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_WIDGETS;
    const parsed = JSON.parse(raw) as Widget[];
    if (!Array.isArray(parsed) || parsed.length === 0) return ALL_WIDGETS;
    return parsed;
  } catch {
    return ALL_WIDGETS;
  }
}

function saveLayout(widgets: Widget[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DashboardGridLayout() {
  const [widgets, setWidgets] = useState<Widget[]>(ALL_WIDGETS);
  const [locked, setLocked] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Hydrate from localStorage after mount */
  useEffect(() => {
    setWidgets(loadLayout());
    setMounted(true);
  }, []);

  /* Persist whenever widgets change after mount */
  useEffect(() => {
    if (mounted) saveLayout(widgets);
  }, [widgets, mounted]);

  /* Drag handlers */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, idx: number) => {
      if (locked) {
        e.preventDefault();
        return;
      }
      setDraggedIdx(idx);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    },
    [locked],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, idx: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIdx(idx);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIdx: number) => {
      e.preventDefault();
      if (draggedIdx === null || draggedIdx === dropIdx) {
        setDraggedIdx(null);
        setDragOverIdx(null);
        return;
      }
      setWidgets((prev) => {
        const next = [...prev];
        const [moved] = next.splice(draggedIdx, 1);
        next.splice(dropIdx, 0, moved);
        return next;
      });
      setDraggedIdx(null);
      setDragOverIdx(null);
    },
    [draggedIdx],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, []);

  /* Close widget */
  const closeWidget = useCallback((id: WidgetId) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)));
  }, []);

  /* Restore all */
  const restoreAll = useCallback(() => {
    setWidgets((prev) => prev.map((w) => ({ ...w, visible: true })));
  }, []);

  /* Apply preset */
  const applyPreset = useCallback((preset: PresetName) => {
    const order = PRESETS[preset];
    const widgetMap = new Map(ALL_WIDGETS.map((w) => [w.id, w]));
    const ordered: Widget[] = order.map((id) => ({ ...widgetMap.get(id)!, visible: true }));
    const remaining = ALL_WIDGETS.filter((w) => !order.includes(w.id)).map((w) => ({
      ...w,
      visible: false,
    }));
    setWidgets([...ordered, ...remaining]);
  }, []);

  const visibleWidgets = widgets.filter((w) => w.visible);
  const hiddenCount = widgets.filter((w) => !w.visible).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Preset bar */}
      <div
        className="dash-preset-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Presets:</span>
        {(Object.keys(PRESETS) as PresetName[]).map((name) => (
          <button
            key={name}
            className="dash-preset-btn"
            onClick={() => applyPreset(name)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(148,163,184,0.06)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {name}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {hiddenCount > 0 && (
          <button
            onClick={restoreAll}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid rgba(139,92,246,0.3)",
              background: "rgba(139,92,246,0.08)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: "#8b5cf6",
            }}
          >
            Restore {hiddenCount} hidden
          </button>
        )}

        <button
          onClick={() => setLocked((p) => !p)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 12px",
            borderRadius: 6,
            border: `1px solid ${locked ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.2)"}`,
            background: locked ? "rgba(239,68,68,0.08)" : "rgba(148,163,184,0.06)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            color: locked ? "#ef4444" : "inherit",
          }}
        >
          {locked ? <Lock size={13} /> : <Unlock size={13} />}
          {locked ? "Locked" : "Unlocked"}
        </button>
      </div>

      {/* Widget grid */}
      <div
        className="dash-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {visibleWidgets.map((widget, visIdx) => {
          const realIdx = widgets.indexOf(widget);
          const isDragging = draggedIdx === realIdx;
          const isDragOver = dragOverIdx === realIdx && draggedIdx !== null && draggedIdx !== realIdx;

          return (
            <div
              key={widget.id}
              className="dash-widget"
              draggable={!locked}
              onDragStart={(e) => handleDragStart(e, realIdx)}
              onDragOver={(e) => handleDragOver(e, realIdx)}
              onDrop={(e) => handleDrop(e, realIdx)}
              onDragEnd={handleDragEnd}
              style={{
                borderRadius: 10,
                border: `1px solid ${isDragOver ? "rgba(139,92,246,0.5)" : "rgba(148,163,184,0.15)"}`,
                background: isDragOver
                  ? "rgba(139,92,246,0.04)"
                  : "rgba(148,163,184,0.03)",
                opacity: isDragging ? 0.5 : 1,
                transition: "border-color 0.15s, background 0.15s, opacity 0.15s",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                className="dash-widget-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(148,163,184,0.1)",
                  background: "rgba(148,163,184,0.03)",
                }}
              >
                <div
                  className="dash-widget-handle"
                  style={{
                    cursor: locked ? "default" : "grab",
                    display: "flex",
                    alignItems: "center",
                    opacity: locked ? 0.3 : 0.5,
                  }}
                >
                  <GripVertical size={14} />
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.7 }}>
                  {WIDGET_ICONS[widget.id]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{widget.label}</span>
                <button
                  onClick={() => closeWidget(widget.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: 0.4,
                    display: "flex",
                    alignItems: "center",
                    padding: 2,
                  }}
                  title="Close widget"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div
                className="dash-widget-body"
                style={{ padding: 12 }}
              >
                {WIDGET_CONTENT[widget.id]()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
