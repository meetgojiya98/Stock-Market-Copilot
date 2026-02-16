"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import {
  LayoutGrid,
  Columns2,
  Columns3,
  PanelLeftClose,
  Save,
  FolderOpen,
  Trash2,
  X,
  TrendingUp,
  BarChart3,
  List,
  Search,
  Newspaper,
  Bell,
  GripVertical,
  ChevronDown,
  Plus,
  RotateCcw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewType = "Portfolio" | "Watchlist" | "Chart" | "Research" | "News" | "Alerts";

type PanelConfig = {
  id: string;
  view: ViewType;
  widthPercent: number;
};

type LayoutPreset = {
  name: string;
  icon: ReactNode;
  panels: PanelConfig[];
};

type SavedLayout = {
  name: string;
  panels: PanelConfig[];
  savedAt: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = "smc_workspace_layouts_v1";

const VIEW_ICONS: Record<ViewType, ReactNode> = {
  Portfolio: <BarChart3 size={14} />,
  Watchlist: <List size={14} />,
  Chart: <TrendingUp size={14} />,
  Research: <Search size={14} />,
  News: <Newspaper size={14} />,
  Alerts: <Bell size={14} />,
};

const ALL_VIEWS: ViewType[] = ["Portfolio", "Watchlist", "Chart", "Research", "News", "Alerts"];

const uid = () => Math.random().toString(36).slice(2, 9);

const PRESETS: LayoutPreset[] = [
  {
    name: "2-col",
    icon: <Columns2 size={15} />,
    panels: [
      { id: uid(), view: "Chart", widthPercent: 50 },
      { id: uid(), view: "Watchlist", widthPercent: 50 },
    ],
  },
  {
    name: "3-col",
    icon: <Columns3 size={15} />,
    panels: [
      { id: uid(), view: "Watchlist", widthPercent: 33.33 },
      { id: uid(), view: "Chart", widthPercent: 33.34 },
      { id: uid(), view: "News", widthPercent: 33.33 },
    ],
  },
  {
    name: "Chart+List",
    icon: <PanelLeftClose size={15} />,
    panels: [
      { id: uid(), view: "Chart", widthPercent: 65 },
      { id: uid(), view: "Portfolio", widthPercent: 35 },
    ],
  },
  {
    name: "Research",
    icon: <LayoutGrid size={15} />,
    panels: [
      { id: uid(), view: "Research", widthPercent: 25 },
      { id: uid(), view: "Chart", widthPercent: 25 },
      { id: uid(), view: "News", widthPercent: 25 },
      { id: uid(), view: "Alerts", widthPercent: 25 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

const MOCK_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", price: 198.45, change: 2.31, pct: 1.18 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 425.12, change: -3.67, pct: -0.86 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 178.93, change: 1.54, pct: 0.87 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 192.78, change: 4.21, pct: 2.23 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 875.32, change: 12.45, pct: 1.44 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.56, change: -5.89, pct: -2.31 },
  { symbol: "META", name: "Meta Platforms", price: 512.87, change: 7.63, pct: 1.51 },
  { symbol: "JPM", name: "JPMorgan Chase", price: 198.34, change: 0.56, pct: 0.28 },
];

const MOCK_NEWS = [
  { title: "Fed signals possible rate cut in March meeting", time: "2h ago", source: "Reuters" },
  { title: "NVIDIA beats Q4 earnings estimates by 22%", time: "4h ago", source: "Bloomberg" },
  { title: "Apple announces new AI features for iPhone", time: "6h ago", source: "CNBC" },
  { title: "Oil prices rise amid Middle East tensions", time: "8h ago", source: "WSJ" },
  { title: "Tesla expands Gigafactory production capacity", time: "12h ago", source: "TechCrunch" },
];

const MOCK_ALERTS = [
  { symbol: "AAPL", msg: "Price crossed $200 resistance", type: "price" as const, time: "10m ago" },
  { symbol: "TSLA", msg: "Volume spike detected (3x avg)", type: "volume" as const, time: "25m ago" },
  { symbol: "NVDA", msg: "RSI entered overbought territory", type: "indicator" as const, time: "1h ago" },
  { symbol: "MSFT", msg: "Earnings report in 2 days", type: "event" as const, time: "2h ago" },
  { symbol: "AMZN", msg: "52-week high reached", type: "price" as const, time: "3h ago" },
];

// ---------------------------------------------------------------------------
// Placeholder view renderers
// ---------------------------------------------------------------------------

function PortfolioView() {
  const total = MOCK_STOCKS.reduce((s, st) => s + st.price * 10, 0);
  return (
    <div style={{ padding: "12px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Portfolio Overview</div>
      <div style={{ color: "var(--ink-muted)", marginBottom: 12, fontSize: 12 }}>
        Total Value: <span style={{ color: "var(--positive)", fontWeight: 600 }}>${total.toLocaleString()}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--surface-border)", color: "var(--ink-muted)" }}>
            <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: 600 }}>Symbol</th>
            <th style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600 }}>Shares</th>
            <th style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600 }}>Price</th>
            <th style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600 }}>P&L</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_STOCKS.map((s) => (
            <tr key={s.symbol} style={{ borderBottom: "1px solid var(--surface-border)" }}>
              <td style={{ padding: "5px 6px", fontWeight: 600 }}>{s.symbol}</td>
              <td style={{ textAlign: "right", padding: "5px 6px" }}>10</td>
              <td style={{ textAlign: "right", padding: "5px 6px" }}>${s.price.toFixed(2)}</td>
              <td style={{ textAlign: "right", padding: "5px 6px", color: s.change >= 0 ? "var(--positive)" : "var(--negative)" }}>
                {s.change >= 0 ? "+" : ""}{(s.change * 10).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WatchlistView() {
  return (
    <div style={{ padding: "12px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Watchlist</div>
      {MOCK_STOCKS.map((s) => (
        <div
          key={s.symbol}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "7px 6px",
            borderBottom: "1px solid var(--surface-border)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.symbol}</div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{s.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>${s.price.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: s.change >= 0 ? "var(--positive)" : "var(--negative)" }}>
              {s.change >= 0 ? "+" : ""}{s.pct.toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartView() {
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let v = 180;
    for (let i = 0; i < 60; i++) {
      v += (Math.random() - 0.48) * 4;
      pts.push({ x: i, y: v });
    }
    return pts;
  }, []);

  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const rangeY = maxY - minY || 1;

  const polyline = points
    .map((p) => {
      const x = (p.x / 59) * 100;
      const y = 100 - ((p.y - minY) / rangeY) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  const isPositive = points[points.length - 1].y >= points[0].y;

  return (
    <div style={{ padding: "12px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>AAPL</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>$198.45</div>
      <div style={{ fontSize: 12, color: isPositive ? "var(--positive)" : "var(--negative)", marginBottom: 10 }}>
        {isPositive ? "+" : ""}2.31 (1.18%)
      </div>
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: 160 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chart-grad-ws" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? "var(--positive)" : "var(--negative)"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? "var(--positive)" : "var(--negative)"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${polyline} 100,100`} fill="url(#chart-grad-ws)" />
        <polyline points={polyline} fill="none" stroke={isPositive ? "var(--positive)" : "var(--negative)"} strokeWidth="0.8" />
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 11, color: "var(--ink-muted)" }}>
        {["1D", "1W", "1M", "3M", "1Y", "ALL"].map((t) => (
          <span
            key={t}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              background: t === "1M" ? "var(--accent)" : "transparent",
              color: t === "1M" ? "#fff" : "inherit",
              cursor: "pointer",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResearchView() {
  return (
    <div style={{ padding: "12px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Research Notes</div>
      {[
        { title: "NVDA Thesis Update", date: "Feb 14, 2026", summary: "AI data center demand remains strong. Raising PT to $950." },
        { title: "AAPL Valuation Review", date: "Feb 12, 2026", summary: "Services revenue growth accelerating. Multiple expansion justified." },
        { title: "Market Outlook Q1", date: "Feb 10, 2026", summary: "Expecting sideways consolidation. Favor quality large-cap tech." },
      ].map((note, i) => (
        <div
          key={i}
          style={{
            padding: "10px 8px",
            borderBottom: "1px solid var(--surface-border)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{note.title}</div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 4 }}>{note.date}</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{note.summary}</div>
        </div>
      ))}
    </div>
  );
}

function NewsView() {
  return (
    <div style={{ padding: "12px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Market News</div>
      {MOCK_NEWS.map((n, i) => (
        <div
          key={i}
          style={{
            padding: "8px 6px",
            borderBottom: "1px solid var(--surface-border)",
            cursor: "pointer",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, lineHeight: 1.35 }}>{n.title}</div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
            {n.source} &middot; {n.time}
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsView() {
  const typeColors: Record<string, string> = {
    price: "var(--accent)",
    volume: "var(--warning)",
    indicator: "var(--accent-3)",
    event: "var(--accent-2)",
  };
  return (
    <div style={{ padding: "12px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Active Alerts</div>
      {MOCK_ALERTS.map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            padding: "8px 6px",
            borderBottom: "1px solid var(--surface-border)",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: typeColors[a.type] || "var(--accent)",
              marginTop: 4,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {a.symbol} &mdash; <span style={{ fontWeight: 400 }}>{a.msg}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{a.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const VIEW_RENDERERS: Record<ViewType, () => ReactNode> = {
  Portfolio: () => <PortfolioView />,
  Watchlist: () => <WatchlistView />,
  Chart: () => <ChartView />,
  Research: () => <ResearchView />,
  News: () => <NewsView />,
  Alerts: () => <AlertsView />,
};

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function loadSavedLayouts(): SavedLayout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

function persistLayouts(layouts: SavedLayout[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(layouts));
}

// ---------------------------------------------------------------------------
// Divider component
// ---------------------------------------------------------------------------

function Divider({
  onDrag,
}: {
  onDrag: (deltaXPercent: number) => void;
}) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const containerWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      const container = (e.target as HTMLElement).closest(".workspace-container");
      if (container) {
        containerWidth.current = container.getBoundingClientRect().width;
      }

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        startX.current = ev.clientX;
        if (containerWidth.current > 0) {
          onDrag((delta / containerWidth.current) * 100);
        }
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onDrag]
  );

  return (
    <div
      className="workspace-divider"
      onMouseDown={onMouseDown}
      style={{
        width: 6,
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-border)",
        flexShrink: 0,
        transition: "background 0.15s",
        zIndex: 2,
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.background = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.background = "var(--surface-border)";
      }}
    >
      <GripVertical size={12} style={{ opacity: 0.5, pointerEvents: "none" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel header with view selector
// ---------------------------------------------------------------------------

function PanelHeader({
  view,
  onChangeView,
  onRemove,
  canRemove,
}: {
  view: ViewType;
  onChangeView: (v: ViewType) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      className="workspace-panel-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 10px",
        borderBottom: "1px solid var(--surface-border)",
        fontSize: 12,
        fontWeight: 600,
        background: "var(--surface)",
        position: "relative",
      }}
    >
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            color: "var(--ink)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
            padding: "2px 4px",
            borderRadius: 4,
          }}
        >
          {VIEW_ICONS[view]}
          {view}
          <ChevronDown size={12} />
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "var(--surface-strong)",
              border: "1px solid var(--surface-border)",
              borderRadius: 6,
              boxShadow: "var(--shadow-sm)",
              zIndex: 100,
              minWidth: 140,
              padding: 4,
            }}
          >
            {ALL_VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  onChangeView(v);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "6px 8px",
                  background: v === view ? "var(--bg-deep)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: v === view ? 600 : 400,
                }}
              >
                {VIEW_ICONS[v]}
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      {canRemove && (
        <button
          onClick={onRemove}
          title="Remove panel"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-muted)",
            padding: 2,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SplitScreenWorkspace() {
  const [panels, setPanels] = useState<PanelConfig[]>(PRESETS[0].panels.map((p) => ({ ...p, id: uid() })));
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const loadMenuRef = useRef<HTMLDivElement>(null);

  // Load saved layouts on mount
  useEffect(() => {
    setSavedLayouts(loadSavedLayouts());
  }, []);

  // Close load menu on outside click
  useEffect(() => {
    if (!showLoadMenu) return;
    const handler = (e: MouseEvent) => {
      if (loadMenuRef.current && !loadMenuRef.current.contains(e.target as Node)) {
        setShowLoadMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLoadMenu]);

  const applyPreset = useCallback((preset: LayoutPreset) => {
    setPanels(preset.panels.map((p) => ({ ...p, id: uid() })));
  }, []);

  const changeView = useCallback((panelId: string, view: ViewType) => {
    setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, view } : p)));
  }, []);

  const removePanel = useCallback((panelId: string) => {
    setPanels((prev) => {
      if (prev.length <= 2) return prev;
      const removed = prev.find((p) => p.id === panelId);
      if (!removed) return prev;
      const remaining = prev.filter((p) => p.id !== panelId);
      const redistributed = removed.widthPercent / remaining.length;
      return remaining.map((p) => ({ ...p, widthPercent: p.widthPercent + redistributed }));
    });
  }, []);

  const addPanel = useCallback(() => {
    setPanels((prev) => {
      if (prev.length >= 4) return prev;
      const shrinkBy = 25 / prev.length;
      const updated = prev.map((p) => ({ ...p, widthPercent: p.widthPercent - shrinkBy }));
      return [...updated, { id: uid(), view: "News" as ViewType, widthPercent: 25 }];
    });
  }, []);

  const handleDividerDrag = useCallback((dividerIndex: number, deltaPercent: number) => {
    setPanels((prev) => {
      const next = [...prev.map((p) => ({ ...p }))];
      const left = next[dividerIndex];
      const right = next[dividerIndex + 1];
      if (!left || !right) return prev;

      const newLeftW = left.widthPercent + deltaPercent;
      const newRightW = right.widthPercent - deltaPercent;

      if (newLeftW < 15 || newRightW < 15) return prev;

      left.widthPercent = newLeftW;
      right.widthPercent = newRightW;
      return next;
    });
  }, []);

  const saveLayout = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    const layout: SavedLayout = { name, panels: panels.map((p) => ({ ...p })), savedAt: Date.now() };
    const updated = [...savedLayouts.filter((l) => l.name !== name), layout];
    setSavedLayouts(updated);
    persistLayouts(updated);
    setSaveName("");
    setShowSaveInput(false);
  }, [saveName, panels, savedLayouts]);

  const loadLayout = useCallback(
    (layout: SavedLayout) => {
      setPanels(layout.panels.map((p) => ({ ...p, id: uid() })));
      setShowLoadMenu(false);
    },
    []
  );

  const deleteLayout = useCallback(
    (name: string) => {
      const updated = savedLayouts.filter((l) => l.name !== name);
      setSavedLayouts(updated);
      persistLayouts(updated);
    },
    [savedLayouts]
  );

  const resetLayout = useCallback(() => {
    setPanels(PRESETS[0].panels.map((p) => ({ ...p, id: uid() })));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      {/* Toolbar */}
      <div
        className="workspace-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderBottom: "1px solid var(--surface-border)",
          background: "var(--surface)",
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, marginRight: 8 }}>Layout:</span>

        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            className="workspace-layout-btn"
            onClick={() => applyPreset(preset)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              border: "1px solid var(--surface-border)",
              borderRadius: 6,
              background: "var(--bg-soft)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {preset.icon}
            {preset.name}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: "var(--surface-border)", margin: "0 4px" }} />

        {panels.length < 4 && (
          <button
            onClick={addPanel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              padding: "4px 8px",
              border: "1px solid var(--surface-border)",
              borderRadius: 6,
              background: "var(--bg-soft)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <Plus size={13} />
            Panel
          </button>
        )}

        <button
          onClick={resetLayout}
          title="Reset layout"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            padding: "4px 8px",
            border: "1px solid var(--surface-border)",
            borderRadius: 6,
            background: "var(--bg-soft)",
            color: "var(--ink)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <RotateCcw size={13} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Save */}
        {showSaveInput ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Layout name..."
              onKeyDown={(e) => e.key === "Enter" && saveLayout()}
              style={{
                padding: "3px 8px",
                border: "1px solid var(--surface-border)",
                borderRadius: 4,
                background: "var(--bg-soft)",
                color: "var(--ink)",
                fontSize: 12,
                width: 130,
                outline: "none",
              }}
              autoFocus
            />
            <button
              onClick={saveLayout}
              style={{
                padding: "3px 8px",
                border: "none",
                borderRadius: 4,
                background: "var(--accent)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveInput(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)" }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              border: "1px solid var(--surface-border)",
              borderRadius: 6,
              background: "var(--bg-soft)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <Save size={13} />
            Save
          </button>
        )}

        {/* Load */}
        <div ref={loadMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowLoadMenu(!showLoadMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              border: "1px solid var(--surface-border)",
              borderRadius: 6,
              background: "var(--bg-soft)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <FolderOpen size={13} />
            Load
            {savedLayouts.length > 0 && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "0 5px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {savedLayouts.length}
              </span>
            )}
          </button>
          {showLoadMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "var(--surface-strong)",
                border: "1px solid var(--surface-border)",
                borderRadius: 8,
                boxShadow: "var(--shadow-sm)",
                zIndex: 100,
                minWidth: 200,
                padding: 6,
              }}
            >
              {savedLayouts.length === 0 ? (
                <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--ink-muted)", textAlign: "center" }}>
                  No saved layouts yet
                </div>
              ) : (
                savedLayouts.map((layout) => (
                  <div
                    key={layout.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-deep)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div onClick={() => loadLayout(layout)} style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{layout.name}</div>
                      <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                        {layout.panels.length} panels &middot; {new Date(layout.savedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayout(layout.name);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--negative)",
                        padding: 2,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panels */}
      <div
        className="workspace-container flex flex-col md:flex-row"
        style={{
          flex: 1,
          overflow: "hidden",
        }}
      >
        {panels.map((panel, i) => (
          <div key={panel.id} style={{ display: "contents" }}>
            <div
              className="workspace-panel"
              style={{
                width: `${panel.widthPercent}%`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRight: i < panels.length - 1 ? "none" : undefined,
              }}
            >
              <PanelHeader
                view={panel.view}
                onChangeView={(v) => changeView(panel.id, v)}
                onRemove={() => removePanel(panel.id)}
                canRemove={panels.length > 2}
              />
              <div style={{ flex: 1, overflow: "auto" }}>{VIEW_RENDERERS[panel.view]()}</div>
            </div>
            {i < panels.length - 1 && (
              <Divider onDrag={(delta) => handleDividerDrag(i, delta)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
