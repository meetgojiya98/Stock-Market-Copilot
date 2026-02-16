"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CrosshairPosition = {
  /** Normalized X position (0 to 1) across the chart width */
  xRatio: number;
  /** Source chart ID that initiated the crosshair move */
  sourceId: string;
} | null;

type CrosshairSyncContextValue = {
  position: CrosshairPosition;
  setPosition: (pos: CrosshairPosition) => void;
};

type CrosshairSyncProviderProps = {
  children: ReactNode;
};

type DataPoint = {
  date: string;
  close: number;
};

type SyncedMiniChartProps = {
  id: string;
  symbol: string;
  data?: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LS_DEMO_SEED_KEY = "smc_crosshair_sync_demo_seed";

const DEFAULT_COLORS: Record<string, string> = {
  AAPL: "#3b82f6",
  MSFT: "#f59e0b",
  GOOGL: "#10b981",
  AMZN: "#ef4444",
  TSLA: "#8b5cf6",
  NVDA: "#ec4899",
  META: "#06b6d4",
};

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const CrosshairSyncContext = createContext<CrosshairSyncContextValue | null>(
  null
);

export function CrosshairSyncProvider({ children }: CrosshairSyncProviderProps) {
  const [position, setPosition] = useState<CrosshairPosition>(null);

  const value = useMemo<CrosshairSyncContextValue>(
    () => ({ position, setPosition }),
    [position]
  );

  return (
    <CrosshairSyncContext.Provider value={value}>
      {children}
    </CrosshairSyncContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCrosshairSync(): CrosshairSyncContextValue {
  const ctx = useContext(CrosshairSyncContext);
  if (!ctx) {
    throw new Error(
      "useCrosshairSync must be used within a CrosshairSyncProvider"
    );
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Seeded RNG helper                                                  */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str: string) {
  return str.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 137);
}

function generateChartData(
  symbol: string,
  count: number = 30
): DataPoint[] {
  const basePrices: Record<string, number> = {
    AAPL: 189.84,
    MSFT: 420.55,
    GOOGL: 174.13,
    AMZN: 185.07,
    TSLA: 248.42,
    NVDA: 875.28,
    META: 502.3,
  };
  const base = basePrices[symbol.toUpperCase()] ?? 150 + (hashStr(symbol) % 200);
  const rng = seeded(hashStr(symbol));
  const data: DataPoint[] = [];
  let price = base;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    price += (rng() - 0.48) * (base * 0.015);
    price = Math.max(base * 0.7, Math.min(base * 1.3, price));
    const d = new Date(now - (count - i) * 86400000);
    data.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  SyncedMiniChart                                                    */
/* ------------------------------------------------------------------ */

export function SyncedMiniChart({
  id,
  symbol,
  data: dataProp,
  width = 200,
  height = 100,
  color: colorProp,
}: SyncedMiniChartProps) {
  const { position, setPosition } = useCrosshairSync();
  const svgRef = useRef<SVGSVGElement>(null);

  const color = colorProp ?? DEFAULT_COLORS[symbol.toUpperCase()] ?? "var(--accent)";

  const data = useMemo(
    () =>
      dataProp && dataProp.length > 0 ? dataProp : generateChartData(symbol, 30),
    [dataProp, symbol]
  );

  const padX = 4;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const prices = data.map((d) => d.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const rangeP = maxP - minP || 1;

  const polylinePoints = useMemo(() => {
    return data
      .map((d, i) => {
        const x = padX + (i / Math.max(data.length - 1, 1)) * innerW;
        const y = padY + (1 - (d.close - minP) / rangeP) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, padX, padY, innerW, innerH, minP, rangeP]);

  const areaPoints = useMemo(() => {
    if (data.length === 0) return "";
    const firstX = padX;
    const lastX = padX + innerW;
    const bottom = padY + innerH;
    return `${firstX},${bottom} ${polylinePoints} ${lastX},${bottom}`;
  }, [polylinePoints, data.length, padX, innerW, padY, innerH]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const xRatio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left - padX) / innerW)
      );
      setPosition({ xRatio, sourceId: id });
    },
    [id, setPosition, padX, innerW]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition(null);
  }, [setPosition]);

  // Compute crosshair X and price at crosshair
  const crosshairX =
    position !== null ? padX + position.xRatio * innerW : null;

  const crosshairDataIndex =
    position !== null
      ? Math.round(position.xRatio * (data.length - 1))
      : null;

  const crosshairPrice =
    crosshairDataIndex !== null && crosshairDataIndex >= 0 && crosshairDataIndex < data.length
      ? data[crosshairDataIndex].close
      : null;

  const crosshairY =
    crosshairPrice !== null
      ? padY + (1 - (crosshairPrice - minP) / rangeP) * innerH
      : null;

  const crosshairDate =
    crosshairDataIndex !== null && crosshairDataIndex >= 0 && crosshairDataIndex < data.length
      ? data[crosshairDataIndex].date
      : null;

  // Determine price change color
  const lastPrice = data[data.length - 1]?.close ?? 0;
  const firstPrice = data[0]?.close ?? 0;
  const changePercent =
    firstPrice > 0
      ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)
      : "0.00";
  const isPositive = lastPrice >= firstPrice;

  const gradientId = `crosshair-fill-${id}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        minWidth: width,
      }}
    >
      {/* Symbol header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.4rem",
          padding: "0 0.15rem",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          {symbol}
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: isPositive ? "var(--positive)" : "var(--negative)",
          }}
        >
          {isPositive ? "+" : ""}
          {changePercent}%
        </span>
        {crosshairPrice !== null && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "var(--accent)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${crosshairPrice.toFixed(2)}
          </span>
        )}
      </div>

      {/* SVG chart */}
      <svg
        ref={svgRef}
        className="crosshair-sync"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          borderRadius: "0.4rem",
          background: "var(--bg-canvas)",
          border: "1px solid var(--surface-border)",
          cursor: "crosshair",
          display: "block",
          strokeDasharray: "none",
          stroke: "none",
          opacity: 1,
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {areaPoints && (
          <polygon
            points={areaPoints}
            fill={`url(#${gradientId})`}
          />
        )}

        {/* Price line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Crosshair vertical line */}
        {crosshairX !== null && (
          <line
            x1={crosshairX}
            x2={crosshairX}
            y1={padY - 2}
            y2={padY + innerH + 2}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.6}
          />
        )}

        {/* Crosshair dot */}
        {crosshairX !== null && crosshairY !== null && (
          <circle
            cx={crosshairX}
            cy={crosshairY}
            r={3}
            fill={color}
            stroke="var(--bg-canvas)"
            strokeWidth={1.5}
          />
        )}

        {/* Crosshair price label */}
        {crosshairX !== null && crosshairPrice !== null && (
          <g>
            <rect
              x={Math.min(crosshairX + 6, width - 52)}
              y={Math.max((crosshairY ?? padY) - 8, padY - 4)}
              width={48}
              height={16}
              rx={3}
              fill="var(--accent)"
              opacity={0.9}
            />
            <text
              className="crosshair-label"
              x={Math.min(crosshairX + 6, width - 52) + 24}
              y={Math.max((crosshairY ?? padY) - 8, padY - 4) + 11}
              textAnchor="middle"
              fill="#fff"
              fontSize={9}
              fontWeight={600}
              fontFamily="inherit"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              ${crosshairPrice.toFixed(2)}
            </text>
          </g>
        )}

        {/* Crosshair date label at bottom */}
        {crosshairX !== null && crosshairDate !== null && (
          <text
            x={crosshairX}
            y={height - 2}
            textAnchor="middle"
            fill="var(--ink-muted)"
            fontSize={7.5}
            fontWeight={500}
            fontFamily="inherit"
          >
            {crosshairDate.slice(5)}
          </text>
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo: three synced charts side-by-side                             */
/* ------------------------------------------------------------------ */

const DEMO_SYMBOLS = ["AAPL", "MSFT", "GOOGL"] as const;

export default function CrosshairSyncDemo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist a demo seed so the random data is stable across hot reloads
  const seed = useMemo(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = localStorage.getItem(LS_DEMO_SEED_KEY);
      if (stored) return parseInt(stored, 10);
      const s = Date.now();
      localStorage.setItem(LS_DEMO_SEED_KEY, String(s));
      return s;
    } catch {
      return Date.now();
    }
  }, []);

  const charts = useMemo(
    () =>
      DEMO_SYMBOLS.map((sym) => ({
        id: `demo-${sym.toLowerCase()}`,
        symbol: sym,
        data: generateChartData(sym, 30),
        color: DEFAULT_COLORS[sym],
      })),
    [seed]
  );

  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          padding: "1rem",
        }}
      >
        {DEMO_SYMBOLS.map((sym) => (
          <div
            key={sym}
            style={{
              width: 200,
              height: 120,
              borderRadius: "0.5rem",
              background: "var(--surface-emphasis)",
              border: "1px solid var(--surface-border)",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <CrosshairSyncProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Crosshair Sync
          <span
            style={{
              marginLeft: "0.5rem",
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--ink-muted)",
            }}
          >
            Hover any chart to sync crosshair across all
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {charts.map((c) => (
            <SyncedMiniChart
              key={c.id}
              id={c.id}
              symbol={c.symbol}
              data={c.data}
              color={c.color}
              width={200}
              height={100}
            />
          ))}
        </div>
      </div>
    </CrosshairSyncProvider>
  );
}
