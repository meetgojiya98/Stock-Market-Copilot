"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

type TickerItem = {
  symbol: string;
  price: number | null;
  change: number | null;
};

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];
const WATCHLIST_KEY = "zentrade_watchlist_v1";
const HIDDEN_PATHS = ["/", "/login", "/signup", "/pricing"];
const REFRESH_INTERVAL = 30_000;

function getWatchlistSymbols(): string[] {
  if (typeof window === "undefined") return DEFAULT_SYMBOLS;
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Support both string[] and { symbol: string }[] shapes
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === "string") return parsed;
        if (typeof parsed[0] === "object" && parsed[0].symbol) {
          return parsed.map((s: { symbol: string }) => s.symbol);
        }
      }
    }
  } catch {}
  return DEFAULT_SYMBOLS;
}

async function fetchPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const res = await fetch(`/api/stocks/price?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      price: data.price ?? data.c ?? 0,
      change: data.changePercent ?? data.dp ?? 0,
    };
  } catch {
    return null;
  }
}

export default function TickerTape() {
  const pathname = usePathname();
  const [items, setItems] = useState<TickerItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHidden = HIDDEN_PATHS.includes(pathname);

  useEffect(() => {
    if (isHidden) return;

    async function loadPrices() {
      const symbols = getWatchlistSymbols();
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          const data = await fetchPrice(symbol);
          return {
            symbol,
            price: data?.price ?? null,
            change: data?.change ?? null,
          };
        })
      );
      setItems(results);
    }

    loadPrices();
    const interval = setInterval(loadPrices, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [isHidden]);

  if (isHidden || items.length === 0) return null;

  // Duplicate items for seamless loop
  const tape = [...items, ...items];

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 32,
        overflow: "hidden",
        background: "var(--surface)",
        borderBottom: "1px solid var(--surface-border)",
        position: "relative",
      }}
    >
      <div
        className="ticker-tape-scroll"
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          whiteSpace: "nowrap",
          width: "max-content",
        }}
      >
        {tape.map((item, idx) => {
          const isPositive = (item.change ?? 0) >= 0;
          const changeColor = isPositive ? "var(--positive)" : "var(--negative)";
          const changeSign = isPositive ? "+" : "";
          return (
            <span
              key={`${item.symbol}-${idx}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0 16px",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ color: "var(--ink)" }}>{item.symbol}</span>
              {item.price !== null && (
                <span style={{ color: "var(--ink-muted)" }}>
                  ${item.price.toFixed(2)}
                </span>
              )}
              {item.change !== null && (
                <span style={{ color: changeColor }}>
                  ({changeSign}{item.change.toFixed(2)}%)
                </span>
              )}
            </span>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes tickerScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-tape-scroll {
          animation: tickerScroll 30s linear infinite;
        }
        .ticker-tape-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
