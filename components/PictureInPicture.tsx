"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { X, Minimize2, Maximize2, TrendingUp, TrendingDown } from "lucide-react";

/* ────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────── */

/** Simple seeded random walk for a given symbol so it looks deterministic on mount */
function seedPrice(symbol: string): number {
  const SEED_PRICES: Record<string, number> = {
    AAPL: 189.5,
    TSLA: 248.2,
    NVDA: 875.3,
    GOOGL: 152.8,
    AMZN: 186.4,
    MSFT: 415.6,
    META: 505.1,
    NFLX: 628.7,
    AMD: 164.3,
    SPY: 512.9,
  };
  return SEED_PRICES[symbol.toUpperCase()] ?? 100 + Math.random() * 200;
}

function randomWalk(prev: number): number {
  const delta = (Math.random() - 0.48) * prev * 0.004; // slight upward bias
  return Math.max(1, prev + delta);
}

function formatPrice(n: number): string {
  return n.toFixed(2);
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/* ────────────────────────────────────────────────────────
 * Mini SVG sparkline (8-point)
 * ──────────────────────────────────────────────────────── */

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;

  const width = 160;
  const height = 36;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const color = positive ? "var(--positive)" : "var(--negative)";
  const gradientId = `pip-grad-${Math.random().toString(36).slice(2, 8)}`;

  const firstX = pad;
  const lastX = pad + (width - pad * 2);
  const polygonPts = `${firstX},${height} ${pts.join(" ")} ${lastX},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", width: "100%" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={polygonPts} fill={`url(#${gradientId})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────
 * PictureInPicture Component
 * ──────────────────────────────────────────────────────── */

interface PictureInPictureProps {
  symbol: string;
  onClose: () => void;
}

export default function PictureInPicture({
  symbol,
  onClose,
}: PictureInPictureProps) {
  const basePrice = useMemo(() => seedPrice(symbol), [symbol]);
  const [prices, setPrices] = useState<number[]>(() => {
    // Generate 8 historic points
    const hist: number[] = [basePrice];
    for (let i = 1; i < 8; i++) {
      hist.push(randomWalk(hist[i - 1]));
    }
    return hist;
  });
  const [minimized, setMinimized] = useState(false);

  // Drag state
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );

  // Price updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) => {
        const last = prev[prev.length - 1];
        const next = [...prev.slice(-7), randomWalk(last)]; // keep 8 points
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentPrice = prices[prices.length - 1];
  const changePct = ((currentPrice - basePrice) / basePrice) * 100;
  const positive = changePct >= 0;

  // ── Drag handlers ──

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const widget = widgetRef.current;
      if (!widget) return;

      const rect = widget.getBoundingClientRect();
      dragState.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: rect.left,
        originY: rect.top,
      };

      function onMouseMove(ev: MouseEvent) {
        if (!dragState.current.isDragging) return;
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        const newX = dragState.current.originX + dx;
        const newY = dragState.current.originY + dy;

        // Clamp within viewport
        const maxX = window.innerWidth - (widget?.offsetWidth ?? 200);
        const maxY = window.innerHeight - (widget?.offsetHeight ?? 100);
        setPosition({
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY)),
        });
      }

      function onMouseUp() {
        dragState.current.isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const widget = widgetRef.current;
      if (!widget) return;

      const rect = widget.getBoundingClientRect();
      dragState.current = {
        isDragging: true,
        startX: touch.clientX,
        startY: touch.clientY,
        originX: rect.left,
        originY: rect.top,
      };

      function onTouchMove(ev: TouchEvent) {
        if (!dragState.current.isDragging) return;
        const t = ev.touches[0];
        const dx = t.clientX - dragState.current.startX;
        const dy = t.clientY - dragState.current.startY;
        const newX = dragState.current.originX + dx;
        const newY = dragState.current.originY + dy;

        const maxX = window.innerWidth - (widget?.offsetWidth ?? 200);
        const maxY = window.innerHeight - (widget?.offsetHeight ?? 100);
        setPosition({
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY)),
        });
      }

      function onTouchEnd() {
        dragState.current.isDragging = false;
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
      }

      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    },
    []
  );

  // Style: use positioned coords or fall back to CSS defaults
  const widgetStyle: React.CSSProperties = position
    ? {
        left: position.x,
        top: position.y,
        right: "auto",
        bottom: "auto",
      }
    : {};

  return (
    <div
      ref={widgetRef}
      className="pip-widget"
      style={widgetStyle}
      role="complementary"
      aria-label={`${symbol} price widget`}
    >
      {/* Header - draggable */}
      <div
        className="pip-header"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ color: "var(--ink)", userSelect: "none" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          {positive ? (
            <TrendingUp size={12} style={{ color: "var(--positive)" }} />
          ) : (
            <TrendingDown size={12} style={{ color: "var(--negative)" }} />
          )}
          {symbol.toUpperCase()}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <button
            onClick={() => setMinimized((m) => !m)}
            className="pip-close"
            aria-label={minimized ? "Expand widget" : "Minimize widget"}
            style={{ background: "none", border: "none", display: "flex" }}
          >
            {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button
            onClick={onClose}
            className="pip-close"
            aria-label="Close price widget"
            style={{ background: "none", border: "none", display: "flex" }}
          >
            <X size={12} />
          </button>
        </span>
      </div>

      {/* Body */}
      <div className="pip-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: minimized ? 0 : "0.25rem",
          }}
        >
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${formatPrice(currentPrice)}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: positive ? "var(--positive)" : "var(--negative)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatPct(changePct)}
          </span>
        </div>

        {!minimized && <MiniSparkline data={prices} positive={positive} />}
      </div>
    </div>
  );
}
