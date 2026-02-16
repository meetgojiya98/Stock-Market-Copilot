"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { BookOpen, RefreshCw, Pause, Play, ArrowUpDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrderLevel = {
  price: number;
  size: number;
  total: number;
};

type OrderBookData = {
  bids: OrderLevel[];
  asks: OrderLevel[];
  midPrice: number;
  spread: number;
  spreadPct: string;
};

/* ------------------------------------------------------------------ */
/*  Seeded RNG                                                        */
/* ------------------------------------------------------------------ */

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Generate order book                                               */
/* ------------------------------------------------------------------ */

function generateOrderBook(tick: number): OrderBookData {
  const rng = seededRng(42000 + tick * 7);
  const basePrice = 185.5 + (rng() - 0.5) * 2;
  const tickSize = 0.01;
  const levels = 15;

  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];

  let bidTotal = 0;
  for (let i = 0; i < levels; i++) {
    const price = +(basePrice - (i + 1) * tickSize * (5 + rng() * 10)).toFixed(2);
    const size = Math.round(100 + rng() * 5000 + (i > 10 ? rng() * 3000 : 0));
    bidTotal += size;
    bids.push({ price, size, total: bidTotal });
  }

  let askTotal = 0;
  for (let i = 0; i < levels; i++) {
    const price = +(basePrice + (i + 1) * tickSize * (5 + rng() * 10)).toFixed(2);
    const size = Math.round(100 + rng() * 5000 + (i > 10 ? rng() * 3000 : 0));
    askTotal += size;
    asks.push({ price, size, total: askTotal });
  }

  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const spread = +(bestAsk - bestBid).toFixed(2);
  const midPrice = +((bestAsk + bestBid) / 2).toFixed(2);
  const spreadPct = ((spread / midPrice) * 100).toFixed(3);

  return { bids, asks, midPrice, spread, spreadPct };
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                        */
/* ------------------------------------------------------------------ */

function formatPrice(n: number): string {
  return n.toFixed(2);
}

function formatSize(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEPTH_W = 860;
const DEPTH_H = 180;
const DEPTH_PAD = { top: 10, right: 20, bottom: 30, left: 20 };

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function OrderBookDepth() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Auto-refresh every 2 seconds */
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const data = useMemo(() => generateOrderBook(tick), [tick]);

  /* Max size for bar width scaling */
  const maxSize = useMemo(() => {
    const allSizes = [...data.bids.map((b) => b.size), ...data.asks.map((a) => a.size)];
    return Math.max(...allSizes);
  }, [data]);

  /* Max total for depth chart scaling */
  const maxTotal = useMemo(() => {
    return Math.max(
      data.bids[data.bids.length - 1]?.total ?? 0,
      data.asks[data.asks.length - 1]?.total ?? 0
    );
  }, [data]);

  /* Depth chart paths */
  const depthPaths = useMemo(() => {
    const plotW = DEPTH_W - DEPTH_PAD.left - DEPTH_PAD.right;
    const plotH = DEPTH_H - DEPTH_PAD.top - DEPTH_PAD.bottom;
    const halfW = plotW / 2;

    // Bids (left side, reversed so highest price is at center)
    const bidsReversed = [...data.bids].reverse();
    const allBidPrices = bidsReversed.map((b) => b.price);
    const bidPriceRange = allBidPrices.length > 1 ? allBidPrices[allBidPrices.length - 1] - allBidPrices[0] : 1;

    let bidLine = `M${DEPTH_PAD.left},${DEPTH_PAD.top + plotH}`;
    let bidFill = `M${DEPTH_PAD.left},${DEPTH_PAD.top + plotH}`;
    bidsReversed.forEach((b, i) => {
      const x = DEPTH_PAD.left + ((b.price - allBidPrices[0]) / bidPriceRange) * halfW;
      const y = DEPTH_PAD.top + plotH - (b.total / maxTotal) * plotH;
      bidLine += ` L${x},${y}`;
      bidFill += ` L${x},${y}`;
    });
    bidFill += ` L${DEPTH_PAD.left + halfW},${DEPTH_PAD.top + plotH} Z`;

    // Asks (right side)
    const allAskPrices = data.asks.map((a) => a.price);
    const askPriceRange = allAskPrices.length > 1 ? allAskPrices[allAskPrices.length - 1] - allAskPrices[0] : 1;

    const midX = DEPTH_PAD.left + halfW;
    let askLine = `M${midX},${DEPTH_PAD.top + plotH}`;
    let askFill = `M${midX},${DEPTH_PAD.top + plotH}`;
    data.asks.forEach((a, i) => {
      const x = midX + ((a.price - allAskPrices[0]) / askPriceRange) * halfW;
      const y = DEPTH_PAD.top + plotH - (a.total / maxTotal) * plotH;
      askLine += ` L${x},${y}`;
      askFill += ` L${x},${y}`;
    });
    askFill += ` L${midX + halfW},${DEPTH_PAD.top + plotH} Z`;

    // Price labels along x-axis
    const pLabels: { x: number; label: string }[] = [];
    if (bidsReversed.length > 0) {
      pLabels.push({ x: DEPTH_PAD.left, label: formatPrice(bidsReversed[0].price) });
      pLabels.push({
        x: DEPTH_PAD.left + halfW * 0.5,
        label: formatPrice(bidsReversed[Math.floor(bidsReversed.length / 2)]?.price ?? 0),
      });
    }
    pLabels.push({ x: midX, label: formatPrice(data.midPrice) });
    if (data.asks.length > 0) {
      pLabels.push({
        x: midX + halfW * 0.5,
        label: formatPrice(data.asks[Math.floor(data.asks.length / 2)]?.price ?? 0),
      });
      pLabels.push({
        x: midX + halfW,
        label: formatPrice(data.asks[data.asks.length - 1].price),
      });
    }

    // Y-axis labels
    const yLabels: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const val = (maxTotal / 4) * i;
      const y = DEPTH_PAD.top + plotH - (val / maxTotal) * plotH;
      yLabels.push({ y, label: formatSize(Math.round(val)) });
    }

    return { bidLine, bidFill, askLine, askFill, pLabels, yLabels, midX };
  }, [data, maxTotal]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className="orderbook-container"
      style={{
        background: "var(--card-bg, #1a1a2e)",
        borderRadius: 12,
        border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
        padding: "16px 20px",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 920,
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <BookOpen size={20} style={{ color: "#818cf8" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Order Book Depth</span>
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>AAPL</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              color: paused ? "#f59e0b" : "#22c55e",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: paused ? "#f59e0b" : "#22c55e",
                display: "inline-block",
              }}
            />
            {paused ? "Paused" : "Live"}
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            title={paused ? "Resume" : "Pause"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
            }}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            onClick={() => setTick((t) => t + 1)}
            title="Refresh"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Spread indicator */}
      <div
        className="orderbook-spread"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "8px 0",
          marginBottom: 8,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <span style={{ color: "#22c55e", fontWeight: 600 }}>
          Bid: {formatPrice(data.bids[0]?.price ?? 0)}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "#f59e0b",
            fontSize: 12,
          }}
        >
          <ArrowUpDown size={12} />
          Spread: ${data.spread} ({data.spreadPct}%)
        </span>
        <span style={{ color: "#ef4444", fontWeight: 600 }}>
          Ask: {formatPrice(data.asks[0]?.price ?? 0)}
        </span>
      </div>

      {/* Order book table */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {/* Bids side */}
        <div className="orderbook-side" style={{ flex: 1 }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              padding: "4px 8px",
              fontSize: 10,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <span>Total</span>
            <span style={{ textAlign: "center" }}>Size</span>
            <span style={{ textAlign: "right" }}>Bid Price</span>
          </div>
          {/* Rows */}
          {data.bids.map((level, i) => {
            const barPct = (level.size / maxSize) * 100;
            return (
              <div
                key={`bid-${i}`}
                className="orderbook-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "3px 8px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Background fill bar */}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${barPct}%`,
                    background: "rgba(34,197,94,0.08)",
                    transition: "width 0.3s ease",
                  }}
                />
                <span style={{ color: "#94a3b8", position: "relative" }}>
                  {formatSize(level.total)}
                </span>
                <span style={{ textAlign: "center", color: "#cbd5e1", position: "relative" }}>
                  {formatSize(level.size)}
                </span>
                <span style={{ textAlign: "right", color: "#22c55e", fontWeight: 500, position: "relative" }}>
                  {formatPrice(level.price)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Asks side */}
        <div className="orderbook-side" style={{ flex: 1 }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              padding: "4px 8px",
              fontSize: 10,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <span>Ask Price</span>
            <span style={{ textAlign: "center" }}>Size</span>
            <span style={{ textAlign: "right" }}>Total</span>
          </div>
          {/* Rows */}
          {data.asks.map((level, i) => {
            const barPct = (level.size / maxSize) * 100;
            return (
              <div
                key={`ask-${i}`}
                className="orderbook-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "3px 8px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Background fill bar */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${barPct}%`,
                    background: "rgba(239,68,68,0.08)",
                    transition: "width 0.3s ease",
                  }}
                />
                <span style={{ color: "#ef4444", fontWeight: 500, position: "relative" }}>
                  {formatPrice(level.price)}
                </span>
                <span style={{ textAlign: "center", color: "#cbd5e1", position: "relative" }}>
                  {formatSize(level.size)}
                </span>
                <span style={{ textAlign: "right", color: "#94a3b8", position: "relative" }}>
                  {formatSize(level.total)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Depth chart */}
      <div className="depth-chart-container" style={{ borderRadius: 8, overflow: "hidden" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>
          Cumulative Depth
        </div>
        <svg
          viewBox={`0 0 ${DEPTH_W} ${DEPTH_H}`}
          width="100%"
          style={{ display: "block", background: "#12122a", borderRadius: 8 }}
        >
          {/* Grid lines */}
          {depthPaths.yLabels.map((yl, i) => (
            <g key={`ygrid-${i}`}>
              <line
                x1={DEPTH_PAD.left}
                x2={DEPTH_W - DEPTH_PAD.right}
                y1={yl.y}
                y2={yl.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
              <text
                x={DEPTH_W - DEPTH_PAD.right + 4}
                y={yl.y + 4}
                fontSize={9}
                fill="#4a5568"
                fontFamily="monospace"
              >
                {yl.label}
              </text>
            </g>
          ))}

          {/* Center line */}
          <line
            x1={depthPaths.midX}
            x2={depthPaths.midX}
            y1={DEPTH_PAD.top}
            y2={DEPTH_H - DEPTH_PAD.bottom}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
            strokeWidth={0.5}
          />

          {/* Bid fill */}
          <path d={depthPaths.bidFill} fill="rgba(34,197,94,0.12)" />
          {/* Bid line */}
          <path d={depthPaths.bidLine} fill="none" stroke="#22c55e" strokeWidth={1.5} />

          {/* Ask fill */}
          <path d={depthPaths.askFill} fill="rgba(239,68,68,0.12)" />
          {/* Ask line */}
          <path d={depthPaths.askLine} fill="none" stroke="#ef4444" strokeWidth={1.5} />

          {/* Price labels */}
          {depthPaths.pLabels.map((pl, i) => (
            <text
              key={`plabel-${i}`}
              x={pl.x}
              y={DEPTH_H - 6}
              fontSize={9}
              fill="#4a5568"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {pl.label}
            </text>
          ))}

          {/* Mid-price label */}
          <text
            x={depthPaths.midX}
            y={DEPTH_PAD.top + 14}
            fontSize={10}
            fill="#f59e0b"
            textAnchor="middle"
            fontWeight={600}
            fontFamily="monospace"
          >
            Mid: ${formatPrice(data.midPrice)}
          </text>
        </svg>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginTop: 12,
          fontSize: 11,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b" }}>Best Bid</div>
          <div style={{ color: "#22c55e", fontWeight: 600, fontFamily: "monospace" }}>
            ${formatPrice(data.bids[0]?.price ?? 0)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b" }}>Best Ask</div>
          <div style={{ color: "#ef4444", fontWeight: 600, fontFamily: "monospace" }}>
            ${formatPrice(data.asks[0]?.price ?? 0)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b" }}>Bid Volume</div>
          <div style={{ color: "#cbd5e1", fontWeight: 600, fontFamily: "monospace" }}>
            {formatSize(data.bids[data.bids.length - 1]?.total ?? 0)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b" }}>Ask Volume</div>
          <div style={{ color: "#cbd5e1", fontWeight: 600, fontFamily: "monospace" }}>
            {formatSize(data.asks[data.asks.length - 1]?.total ?? 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
