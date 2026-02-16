"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";
import {
  createWebSocketStream,
  type WsConnectionStatus,
  type WsPriceUpdate,
} from "../lib/websocket-client";

type TickerEntry = WsPriceUpdate & { flash: boolean };

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM"];

export default function WebSocketTicker() {
  const [entries, setEntries] = useState<Map<string, TickerEntry>>(new Map());
  const [status, setStatus] = useState<WsConnectionStatus>("offline");
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef(createWebSocketStream());

  const handleUpdate = useCallback((update: WsPriceUpdate) => {
    setEntries((prev) => {
      const next = new Map(prev);
      next.set(update.symbol, { ...update, flash: true });
      return next;
    });

    // Clear flash after animation
    const existing = flashTimers.current.get(update.symbol);
    if (existing) clearTimeout(existing);
    flashTimers.current.set(
      update.symbol,
      setTimeout(() => {
        setEntries((prev) => {
          const entry = prev.get(update.symbol);
          if (!entry) return prev;
          const next = new Map(prev);
          next.set(update.symbol, { ...entry, flash: false });
          return next;
        });
      }, 400)
    );
  }, []);

  useEffect(() => {
    const stream = streamRef.current;

    // Load portfolio symbols first, then subscribe to defaults as fallback
    stream.loadPortfolioSymbols();

    const subscribed = stream.getSubscribedSymbols();
    if (subscribed.length === 0) {
      DEFAULT_SYMBOLS.forEach((sym) => stream.subscribe(sym));
    }

    const cleanupPrice = stream.onPrice(handleUpdate);
    const cleanupStatus = stream.onStatus(setStatus);

    stream.start();

    // Populate initial snapshots
    stream.getSubscribedSymbols().forEach((sym) => {
      const snapshot = stream.getSnapshot(sym);
      if (snapshot) {
        setEntries((prev) => {
          const next = new Map(prev);
          next.set(sym, { ...snapshot, flash: false });
          return next;
        });
      }
    });

    return () => {
      cleanupPrice();
      cleanupStatus();
      flashTimers.current.forEach((timer) => clearTimeout(timer));
      flashTimers.current.clear();
    };
  }, [handleUpdate]);

  // Auto-scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animFrame: number;
    let scrollSpeed = 0.5;

    const animate = () => {
      if (!el) return;
      el.scrollLeft += scrollSpeed;

      // Reset scroll when we've scrolled through half the content (for seamless loop feel)
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0;
      }

      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);

    const handleMouseEnter = () => {
      scrollSpeed = 0;
    };
    const handleMouseLeave = () => {
      scrollSpeed = 0.5;
    };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [entries.size]);

  const sortedEntries = Array.from(entries.values()).sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );

  return (
    <div className="rounded-2xl surface-glass dynamic-surface p-3 sm:p-4 fade-up">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: "var(--accent)" }} />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Live Price Stream
          </span>
        </div>
        <div
          className={`ws-status-badge ${status === "live" ? "live" : "offline"}`}
        >
          {status === "live" ? (
            <>
              <Wifi size={11} />
              <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              Live
            </>
          ) : (
            <>
              <WifiOff size={11} />
              Offline
            </>
          )}
        </div>
      </div>

      {/* Scrolling ticker */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide"
        style={{ scrollBehavior: "auto" }}
      >
        {sortedEntries.length === 0 && (
          <div className="text-xs muted py-2">
            Connecting to price stream...
          </div>
        )}

        {sortedEntries.map((entry) => {
          const isPositive = entry.changePercent >= 0;
          const color = isPositive ? "var(--positive)" : "var(--negative)";
          const sign = isPositive ? "+" : "";

          return (
            <div
              key={entry.symbol}
              className={`flex-shrink-0 rounded-xl control-surface bg-white/75 dark:bg-black/25 px-3 py-2 min-w-[140px] ${
                entry.flash ? "ws-price-flash" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold section-title">
                  {entry.symbol}
                </span>
                <span
                  className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                  style={{
                    color: "white",
                    backgroundColor: color,
                  }}
                >
                  {sign}{entry.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-sm font-bold metric-value">
                ${entry.price.toFixed(2)}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] muted">
                  {sign}${Math.abs(entry.change).toFixed(2)}
                </span>
                <span className="text-[10px] muted">
                  Vol: {(entry.volume / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          );
        })}

        {/* Duplicate entries for seamless scroll effect */}
        {sortedEntries.length > 4 &&
          sortedEntries.map((entry) => {
            const isPositive = entry.changePercent >= 0;
            const color = isPositive ? "var(--positive)" : "var(--negative)";
            const sign = isPositive ? "+" : "";

            return (
              <div
                key={`dup-${entry.symbol}`}
                className="flex-shrink-0 rounded-xl control-surface bg-white/75 dark:bg-black/25 px-3 py-2 min-w-[140px]"
                aria-hidden
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold section-title">
                    {entry.symbol}
                  </span>
                  <span
                    className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                    style={{
                      color: "white",
                      backgroundColor: color,
                    }}
                  >
                    {sign}{entry.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-sm font-bold metric-value">
                  ${entry.price.toFixed(2)}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] muted">
                    {sign}${Math.abs(entry.change).toFixed(2)}
                  </span>
                  <span className="text-[10px] muted">
                    Vol: {(entry.volume / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
