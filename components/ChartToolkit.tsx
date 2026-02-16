"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Crosshair,
  TrendingUp,
  Minus,
  Square,
  Type,
  Ruler,
  Copy,
  Download,
  FileText,
  Image,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToolId =
  | "crosshair"
  | "trendline"
  | "hline"
  | "rectangle"
  | "text"
  | "measure";

type ToolDef = {
  id: ToolId;
  label: string;
  icon: typeof Crosshair;
  group: number;
};

type ChartToolbarProps = {
  activeTool?: ToolId | null;
  onToolChange?: (tool: ToolId | null) => void;
};

type BrushDataPoint = {
  date: string;
  close: number;
};

type TimeRangeBrushProps = {
  data: BrushDataPoint[];
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
  width?: number;
  height?: number;
};

type LogScaleToggleProps = {
  active: boolean;
  onToggle: (active: boolean) => void;
};

type ChartExportMenuProps = {
  chartRef: RefObject<SVGSVGElement | null>;
};

type OverlayStock = {
  symbol: string;
  color: string;
};

type ChartOverlayLegendProps = {
  stocks: OverlayStock[];
  onRemove?: (symbol: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                   */
/* ------------------------------------------------------------------ */

const TOOLS: ToolDef[] = [
  { id: "crosshair", label: "Crosshair", icon: Crosshair, group: 0 },
  { id: "trendline", label: "Trend Line", icon: TrendingUp, group: 0 },
  { id: "hline", label: "Horizontal Line", icon: Minus, group: 0 },
  { id: "rectangle", label: "Rectangle", icon: Square, group: 1 },
  { id: "text", label: "Text Note", icon: Type, group: 1 },
  { id: "measure", label: "Measure", icon: Ruler, group: 1 },
];

const LS_TOOL_KEY = "smc_chart_toolkit_active_tool";

/* ------------------------------------------------------------------ */
/*  ChartToolbar                                                       */
/* ------------------------------------------------------------------ */

export function ChartToolbar({ activeTool, onToolChange }: ChartToolbarProps) {
  const [internalTool, setInternalTool] = useState<ToolId | null>(() => {
    if (typeof activeTool !== "undefined") return activeTool;
    try {
      const saved = localStorage.getItem(LS_TOOL_KEY);
      if (saved && TOOLS.some((t) => t.id === saved)) return saved as ToolId;
    } catch {
      /* noop */
    }
    return null;
  });

  const selected = activeTool !== undefined ? activeTool : internalTool;

  const handleSelect = useCallback(
    (id: ToolId) => {
      const next = selected === id ? null : id;
      setInternalTool(next);
      try {
        if (next) localStorage.setItem(LS_TOOL_KEY, next);
        else localStorage.removeItem(LS_TOOL_KEY);
      } catch {
        /* noop */
      }
      onToolChange?.(next);
    },
    [selected, onToolChange]
  );

  const grouped = useMemo(() => {
    const groups: ToolDef[][] = [];
    for (const tool of TOOLS) {
      if (!groups[tool.group]) groups[tool.group] = [];
      groups[tool.group].push(tool);
    }
    return groups;
  }, []);

  return (
    <div className="chart-tools-bar" role="toolbar" aria-label="Chart tools">
      {grouped.map((group, gi) => (
        <div key={gi} style={{ display: "contents" }}>
          {gi > 0 && <span className="chart-tool-separator" />}
          {group.map((tool) => {
            const Icon = tool.icon;
            const isActive = selected === tool.id;
            return (
              <button
                key={tool.id}
                className={`chart-tool${isActive ? " active" : ""}`}
                onClick={() => handleSelect(tool.id)}
                title={tool.label}
                aria-pressed={isActive}
                aria-label={tool.label}
              >
                <Icon size={15} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TimeRangeBrush                                                     */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function generateBrushData(count: number): BrushDataPoint[] {
  const data: BrushDataPoint[] = [];
  let price = 150;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.48) * 3;
    price = Math.max(50, price);
    const d = new Date(now - (count - i) * 86400000);
    data.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }
  return data;
}

export function TimeRangeBrush({
  data: dataProp,
  range,
  onRangeChange,
  width = 600,
  height = 40,
}: TimeRangeBrushProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: "left" | "right" | "body";
    startX: number;
    startRange: [number, number];
  } | null>(null);

  const data = useMemo(
    () => (dataProp && dataProp.length > 0 ? dataProp : generateBrushData(60)),
    [dataProp]
  );

  const svgPadding = 2;
  const prices = data.map((d) => d.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const rangeP = maxP - minP || 1;

  const polylinePoints = useMemo(() => {
    return data
      .map((d, i) => {
        const x =
          svgPadding +
          (i / Math.max(data.length - 1, 1)) * (width - svgPadding * 2);
        const y =
          svgPadding +
          (1 - (d.close - minP) / rangeP) * (height - svgPadding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, width, height, minP, rangeP]);

  const leftPx = range[0] * width;
  const rightPx = range[1] * width;
  const selectionWidth = rightPx - leftPx;

  const getXRatio = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    },
    []
  );

  const handlePointerDown = useCallback(
    (type: "left" | "right" | "body") =>
      (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragRef.current = {
          type,
          startX: e.clientX,
          startRange: [...range] as [number, number],
        };
      },
    [range]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const { type, startX, startRange } = dragRef.current;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - startX) / rect.width;

      let newRange: [number, number] = [...startRange];
      const minSpan = 0.02;

      if (type === "left") {
        newRange[0] = clamp(startRange[0] + dx, 0, newRange[1] - minSpan);
      } else if (type === "right") {
        newRange[1] = clamp(startRange[1] + dx, newRange[0] + minSpan, 1);
      } else {
        const span = startRange[1] - startRange[0];
        let newLeft = startRange[0] + dx;
        if (newLeft < 0) newLeft = 0;
        if (newLeft + span > 1) newLeft = 1 - span;
        newRange = [newLeft, newLeft + span];
      }

      onRangeChange(newRange);
    },
    [onRangeChange]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) return;
      const ratio = getXRatio(e.clientX);
      const span = range[1] - range[0];
      const halfSpan = span / 2;
      let newLeft = ratio - halfSpan;
      if (newLeft < 0) newLeft = 0;
      if (newLeft + span > 1) newLeft = 1 - span;
      onRangeChange([newLeft, newLeft + span]);
    },
    [range, onRangeChange, getXRatio]
  );

  return (
    <div
      ref={containerRef}
      className="time-brush"
      style={{ width, height, position: "relative" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerDown={handleBackgroundClick}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth={1.2}
          opacity={0.4}
        />
      </svg>

      {/* Selection */}
      <div
        className="time-brush-selection"
        style={{
          left: leftPx,
          width: Math.max(selectionWidth, 4),
        }}
        onPointerDown={handlePointerDown("body")}
      />

      {/* Left handle */}
      <div
        className="time-brush-handle"
        style={{ left: leftPx - 3 }}
        onPointerDown={handlePointerDown("left")}
      />

      {/* Right handle */}
      <div
        className="time-brush-handle"
        style={{ left: rightPx - 3 }}
        onPointerDown={handlePointerDown("right")}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LogScaleToggle                                                     */
/* ------------------------------------------------------------------ */

const LS_LOG_SCALE_KEY = "smc_log_scale_active";

export function LogScaleToggle({ active, onToggle }: LogScaleToggleProps) {
  useEffect(() => {
    try {
      localStorage.setItem(LS_LOG_SCALE_KEY, JSON.stringify(active));
    } catch {
      /* noop */
    }
  }, [active]);

  return (
    <button
      className={`log-scale-toggle${active ? " active" : ""}`}
      onClick={() => onToggle(!active)}
      aria-pressed={active}
      title={active ? "Switch to linear scale" : "Switch to logarithmic scale"}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M2 12 C 4 12, 5 2, 12 2"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      Log
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ChartExportMenu                                                    */
/* ------------------------------------------------------------------ */

function serializeSvgToString(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const styles = getComputedStyle(svgEl);
  const bgColor =
    styles.getPropertyValue("background-color") || "transparent";
  if (bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)") {
    clone.style.backgroundColor = bgColor;
  }

  return new XMLSerializer().serializeToString(clone);
}

function svgToPngBlob(
  svgString: string,
  width: number,
  height: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.onerror = () => resolve(null);

    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    img.src = URL.createObjectURL(blob);
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

type ExportOption = {
  id: string;
  label: string;
  icon: typeof Copy;
};

const EXPORT_OPTIONS: ExportOption[] = [
  { id: "copy-png", label: "Copy as PNG", icon: Copy },
  { id: "download-svg", label: "Download SVG", icon: FileText },
  { id: "download-png", label: "Download PNG", icon: Image },
  { id: "download-csv", label: "Download CSV", icon: Download },
];

export function ChartExportMenu({ chartRef }: ChartExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  const handleExport = useCallback(
    async (optionId: string) => {
      const svg = chartRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const w = rect.width || 800;
      const h = rect.height || 400;
      const svgString = serializeSvgToString(svg);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

      switch (optionId) {
        case "copy-png": {
          const blob = await svgToPngBlob(svgString, w, h);
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
            } catch {
              /* Clipboard API may not be available */
            }
          }
          break;
        }

        case "download-svg": {
          const blob = new Blob([svgString], {
            type: "image/svg+xml;charset=utf-8",
          });
          triggerDownload(blob, `chart-${timestamp}.svg`);
          break;
        }

        case "download-png": {
          const blob = await svgToPngBlob(svgString, w, h);
          if (blob) {
            triggerDownload(blob, `chart-${timestamp}.png`);
          }
          break;
        }

        case "download-csv": {
          const textEls = svg.querySelectorAll("text");
          const rows: string[] = ["Label,Value"];
          textEls.forEach((el) => {
            const text = el.textContent?.trim();
            if (text) {
              rows.push(`"${text.replace(/"/g, '""')}",""`);
            }
          });

          const polylines = svg.querySelectorAll("polyline");
          polylines.forEach((pl, idx) => {
            const pts = pl.getAttribute("points");
            if (pts) {
              rows.push(`"Series ${idx + 1} Points","${pts.trim()}"`);
            }
          });

          const csvBlob = new Blob([rows.join("\n")], {
            type: "text/csv;charset=utf-8",
          });
          triggerDownload(csvBlob, `chart-data-${timestamp}.csv`);
          break;
        }
      }

      setOpen(false);
    },
    [chartRef]
  );

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        className="chart-tool"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Export chart"
      >
        <Download size={15} strokeWidth={2} />
        <ChevronDown size={10} strokeWidth={2.5} style={{ marginLeft: 1 }} />
      </button>

      {open && (
        <div className="chart-export-menu" role="menu">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                className="chart-export-item"
                role="menuitem"
                onClick={() => handleExport(opt.id)}
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  color: "var(--ink)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={13} strokeWidth={2} />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChartOverlayLegend                                                 */
/* ------------------------------------------------------------------ */

export function ChartOverlayLegend({
  stocks,
  onRemove,
}: ChartOverlayLegendProps) {
  if (!stocks || stocks.length === 0) return null;

  return (
    <div className="chart-overlay-legend" role="list" aria-label="Overlay legend">
      {stocks.map((s) => (
        <div
          key={s.symbol}
          role="listitem"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            cursor: onRemove ? "pointer" : "default",
          }}
          onClick={() => onRemove?.(s.symbol)}
          title={onRemove ? `Remove ${s.symbol} overlay` : s.symbol}
        >
          <span
            className="chart-overlay-swatch"
            style={{ backgroundColor: s.color }}
          />
          <span
            style={{
              fontWeight: 600,
              color: "var(--ink)",
              fontSize: "0.72rem",
            }}
          >
            {s.symbol}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo / default export                                              */
/* ------------------------------------------------------------------ */

function generateDemoData(count: number): BrushDataPoint[] {
  const data: BrushDataPoint[] = [];
  let price = 175;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.48) * 2.5;
    price = Math.max(80, price);
    const d = new Date(now - (count - i) * 86400000);
    data.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }
  return data;
}

export default function ChartToolkitDemo() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [logScale, setLogScale] = useState(false);
  const [range, setRange] = useState<[number, number]>([0.2, 0.8]);

  const demoData = useMemo(() => generateDemoData(60), []);

  const overlayStocks: OverlayStock[] = useMemo(
    () => [
      { symbol: "AAPL", color: "#3b82f6" },
      { symbol: "MSFT", color: "#f59e0b" },
      { symbol: "GOOGL", color: "#10b981" },
    ],
    []
  );

  const prices = demoData.map((d) => d.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const rangeP = maxP - minP || 1;
  const chartW = 600;
  const chartH = 260;
  const pad = 40;

  const startIdx = Math.floor(range[0] * (demoData.length - 1));
  const endIdx = Math.ceil(range[1] * (demoData.length - 1));
  const visibleData = demoData.slice(startIdx, endIdx + 1);
  const visPrices = visibleData.map((d) => d.close);
  const visMin = Math.min(...visPrices);
  const visMax = Math.max(...visPrices);
  const visRange = visMax - visMin || 1;

  const mainPolyline = useMemo(() => {
    if (visibleData.length === 0) return "";
    return visibleData
      .map((d, i) => {
        const x =
          pad +
          (i / Math.max(visibleData.length - 1, 1)) * (chartW - pad * 2);
        const rawY = logScale
          ? (Math.log(d.close) - Math.log(visMin)) /
            (Math.log(visMax) - Math.log(visMin) || 1)
          : (d.close - visMin) / visRange;
        const y = pad + (1 - rawY) * (chartH - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [visibleData, chartW, chartH, pad, logScale, visMin, visMax, visRange]);

  const gradientPoints = useMemo(() => {
    if (visibleData.length === 0) return "";
    const first = `${pad},${chartH - pad}`;
    const last = `${pad + ((visibleData.length - 1) / Math.max(visibleData.length - 1, 1)) * (chartW - pad * 2)},${chartH - pad}`;
    return `${first} ${mainPolyline} ${last}`;
  }, [mainPolyline, visibleData, chartW, chartH, pad]);

  const yLabels = useMemo(() => {
    const count = 5;
    const labels: { y: number; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const val = visMin + ratio * visRange;
      const y = pad + (1 - ratio) * (chartH - pad * 2);
      labels.push({ y, label: `$${val.toFixed(0)}` });
    }
    return labels;
  }, [visMin, visRange, chartH, pad]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "1rem",
        maxWidth: chartW + 40,
      }}
    >
      {/* Toolbar row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <ChartToolbar activeTool={activeTool} onToolChange={setActiveTool} />
        <span className="chart-tool-separator" />
        <LogScaleToggle active={logScale} onToggle={setLogScale} />
        <ChartExportMenu chartRef={svgRef} />
      </div>

      {/* Overlay legend */}
      <ChartOverlayLegend stocks={overlayStocks} />

      {/* Main chart */}
      <svg
        ref={svgRef}
        width={chartW}
        height={chartH}
        viewBox={`0 0 ${chartW} ${chartH}`}
        style={{
          borderRadius: "0.5rem",
          background: "var(--bg-canvas)",
          border: "1px solid var(--surface-border)",
        }}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line
              x1={pad}
              x2={chartW - pad}
              y1={yl.y}
              y2={yl.y}
              stroke="var(--surface-border)"
              strokeWidth={0.5}
            />
            <text
              x={pad - 6}
              y={yl.y + 3}
              textAnchor="end"
              fill="var(--ink-muted)"
              fontSize={9}
              fontWeight={500}
            >
              {yl.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {gradientPoints && (
          <polygon points={gradientPoints} fill="url(#chartFill)" />
        )}

        {/* Price line */}
        {mainPolyline && (
          <polyline
            points={mainPolyline}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Time range brush */}
      <TimeRangeBrush
        data={demoData}
        range={range}
        onRangeChange={setRange}
        width={chartW}
        height={40}
      />

      <div
        style={{
          fontSize: "0.68rem",
          color: "var(--ink-muted)",
          textAlign: "center",
        }}
      >
        Active tool: {activeTool ?? "none"} | Scale:{" "}
        {logScale ? "logarithmic" : "linear"} | Range:{" "}
        {(range[0] * 100).toFixed(0)}% - {(range[1] * 100).toFixed(0)}%
      </div>
    </div>
  );
}
