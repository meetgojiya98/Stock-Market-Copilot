"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Eye, EyeOff, Minus, MousePointer, PenLine, StickyNote, TrendingUp, Type, Undo2 } from "lucide-react";

type Tool = "select" | "trendline" | "hline" | "rect" | "text" | "fib";

type Point = { xPct: number; yPct: number };

type Annotation = {
  id: string;
  tool: Tool;
  points: Point[];
  text?: string;
  color: string;
};

type ChartAnnotationLayerProps = {
  symbol: string;
  width: number;
  height: number;
};

const LS_PREFIX = "smc_chart_annotations_v1_";
const COLORS = ["#3b6de7", "#e74c3c", "#27ae60", "#f39c12", "#9b59b6", "#1abc9c"];

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 1];

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadAnnotations(symbol: string): Annotation[] {
  try {
    const raw = localStorage.getItem(LS_PREFIX + symbol);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch { /* */ }
  return [];
}

function saveAnnotations(symbol: string, annotations: Annotation[]) {
  localStorage.setItem(LS_PREFIX + symbol, JSON.stringify(annotations));
}

export default function ChartAnnotationLayer({ symbol, width, height }: ChartAnnotationLayerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [visible, setVisible] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<Point | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setAnnotations(loadAnnotations(symbol));
  }, [symbol]);

  useEffect(() => {
    if (annotations.length > 0 || localStorage.getItem(LS_PREFIX + symbol)) {
      saveAnnotations(symbol, annotations);
    }
  }, [annotations, symbol]);

  const getRelativePoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { xPct: 0, yPct: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      xPct: ((clientX - rect.left) / rect.width) * 100,
      yPct: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === "select") return;
    const pt = getRelativePoint(e);

    if (activeTool === "text") {
      setTextPos(pt);
      return;
    }

    setDrawing(true);
    setStartPoint(pt);
    setCurrentPoint(pt);
  }, [activeTool, getRelativePoint]);

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return;
    setCurrentPoint(getRelativePoint(e));
  }, [drawing, getRelativePoint]);

  const handlePointerUp = useCallback(() => {
    if (!drawing || !startPoint || !currentPoint) { setDrawing(false); return; }

    const annotation: Annotation = {
      id: uid(),
      tool: activeTool,
      points: activeTool === "hline"
        ? [{ xPct: 0, yPct: startPoint.yPct }, { xPct: 100, yPct: startPoint.yPct }]
        : [startPoint, currentPoint],
      color: activeColor,
    };

    setAnnotations((prev) => [...prev, annotation]);
    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [drawing, startPoint, currentPoint, activeTool, activeColor]);

  const handleTextSubmit = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); setTextInput(""); return; }
    const annotation: Annotation = {
      id: uid(),
      tool: "text",
      points: [textPos],
      text: textInput.trim(),
      color: activeColor,
    };
    setAnnotations((prev) => [...prev, annotation]);
    setTextPos(null);
    setTextInput("");
  };

  const undo = () => setAnnotations((prev) => prev.slice(0, -1));
  const clearAll = () => { setAnnotations([]); localStorage.removeItem(LS_PREFIX + symbol); };

  const tools: { id: Tool; icon: typeof PenLine; label: string }[] = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "trendline", icon: TrendingUp, label: "Trendline" },
    { id: "hline", icon: Minus, label: "H-Line" },
    { id: "rect", icon: PenLine, label: "Rectangle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "fib", icon: StickyNote, label: "Fibonacci" },
  ];

  if (!width || !height) return null;

  return (
    <div className="relative" style={{ width, height: "auto" }}>
      {/* Toolbar */}
      <div className="annotation-toolbar mb-2 flex-wrap">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={activeTool === t.id ? "active" : ""}
              title={t.label}
            >
              <Icon size={13} />
            </button>
          );
        })}
        <div className="w-px bg-[var(--surface-border)] mx-1" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setActiveColor(c)}
            className="!p-1"
            title={c}
          >
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ background: c, outline: activeColor === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
            />
          </button>
        ))}
        <div className="w-px bg-[var(--surface-border)] mx-1" />
        <button onClick={undo} title="Undo" disabled={!annotations.length}>
          <Undo2 size={13} />
        </button>
        <button onClick={clearAll} title="Clear All" disabled={!annotations.length}>
          <Eraser size={13} />
        </button>
        <button onClick={() => setVisible(!visible)} title={visible ? "Hide" : "Show"}>
          {visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>

      {/* SVG overlay */}
      <svg
        ref={svgRef}
        className="annotation-layer absolute inset-0 w-full h-full"
        style={{ cursor: activeTool !== "select" ? "crosshair" : "default", pointerEvents: activeTool === "select" ? "none" : "all" }}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => { if (drawing) handlePointerUp(); }}
      >
        {visible && annotations.map((a) => {
          const x1 = (a.points[0].xPct / 100) * width;
          const y1 = (a.points[0].yPct / 100) * height;
          const x2 = a.points[1] ? (a.points[1].xPct / 100) * width : x1;
          const y2 = a.points[1] ? (a.points[1].yPct / 100) * height : y1;

          switch (a.tool) {
            case "trendline":
            case "hline":
              return <line key={a.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.color} strokeWidth={2} strokeDasharray={a.tool === "hline" ? "6 3" : undefined} />;
            case "rect":
              return <rect key={a.id} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill={`${a.color}15`} stroke={a.color} strokeWidth={1.5} rx={3} />;
            case "text":
              return <text key={a.id} x={x1} y={y1} fill={a.color} fontSize={12} fontWeight={600}>{a.text}</text>;
            case "fib":
              return (
                <g key={a.id}>
                  {FIB_LEVELS.map((level) => {
                    const fibY = y1 + (y2 - y1) * level;
                    return (
                      <g key={level}>
                        <line x1={0} y1={fibY} x2={width} y2={fibY} stroke={a.color} strokeWidth={1} strokeDasharray="4 2" opacity={0.6} />
                        <text x={4} y={fibY - 3} fill={a.color} fontSize={9} opacity={0.8}>{(level * 100).toFixed(1)}%</text>
                      </g>
                    );
                  })}
                </g>
              );
            default:
              return null;
          }
        })}

        {/* Preview while drawing */}
        {drawing && startPoint && currentPoint && (
          <>
            {(activeTool === "trendline" || activeTool === "fib") && (
              <line
                x1={(startPoint.xPct / 100) * width} y1={(startPoint.yPct / 100) * height}
                x2={(currentPoint.xPct / 100) * width} y2={(currentPoint.yPct / 100) * height}
                stroke={activeColor} strokeWidth={2} strokeDasharray="4 2" opacity={0.6}
              />
            )}
            {activeTool === "hline" && (
              <line
                x1={0} y1={(startPoint.yPct / 100) * height}
                x2={width} y2={(startPoint.yPct / 100) * height}
                stroke={activeColor} strokeWidth={2} strokeDasharray="6 3" opacity={0.6}
              />
            )}
            {activeTool === "rect" && (
              <rect
                x={Math.min((startPoint.xPct / 100) * width, (currentPoint.xPct / 100) * width)}
                y={Math.min((startPoint.yPct / 100) * height, (currentPoint.yPct / 100) * height)}
                width={Math.abs((currentPoint.xPct - startPoint.xPct) / 100 * width)}
                height={Math.abs((currentPoint.yPct - startPoint.yPct) / 100 * height)}
                fill={`${activeColor}10`} stroke={activeColor} strokeWidth={1.5} strokeDasharray="4 2" rx={3}
              />
            )}
          </>
        )}
      </svg>

      {/* Text input modal */}
      {textPos && (
        <div
          className="absolute z-10 bg-[var(--surface-emphasis)] border border-[var(--surface-border)] rounded-lg p-2 shadow-sm"
          style={{ left: `${textPos.xPct}%`, top: `${textPos.yPct}%` }}
        >
          <input
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") { setTextPos(null); setTextInput(""); } }}
            placeholder="Type note..."
            className="rounded bg-black/5 dark:bg-white/5 px-2 py-1 text-xs w-32"
          />
          <button onClick={handleTextSubmit} className="ml-1 text-xs text-[var(--accent)]">Add</button>
        </div>
      )}
    </div>
  );
}
