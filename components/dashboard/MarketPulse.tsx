"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

type IndexData = {
  symbol: string;
  name: string;
  price: number;
  change: string;
  changePercent: number;
};

const INDICES = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "Nasdaq" },
  { symbol: "DIA", name: "Dow Jones" },
  { symbol: "IWM", name: "Russell 2000" },
];

/* Skeleton placeholder while loading */
function SkeletonCard() {
  return (
    <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-2.5 w-14 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
        <div className="h-3 w-3 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
      </div>
      <div className="h-5 w-20 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] mb-1.5" />
      <div className="h-3 w-24 rounded bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]" />
    </div>
  );
}

/* Trend dots: 4 small dots showing recent direction */
function TrendDots({ positive }: { positive: boolean }) {
  // Simulated micro-trend (visual indicator only)
  const pattern = positive ? [false, true, true, true] : [true, false, false, false];
  const activeColor = positive ? "var(--positive)" : "var(--negative)";
  const mutedColor = "color-mix(in srgb, var(--ink) 12%, transparent)";

  return (
    <div className="flex items-center gap-[3px] mt-1">
      {pattern.map((active, i) => (
        <span
          key={i}
          className="block w-[5px] h-[5px] rounded-full transition-colors duration-300"
          style={{ background: active ? activeColor : mutedColor }}
        />
      ))}
    </div>
  );
}

export default function MarketPulse() {
  const [data, setData] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down" | null>>({});
  const prevPrices = useRef<Record<string, number>>({});

  const fetchAll = useCallback(async () => {
    const results = await Promise.all(
      INDICES.map(async (idx) => {
        try {
          const res = await fetch(`/api/stocks/price?symbol=${idx.symbol}`);
          if (!res.ok) throw new Error();
          const json = await res.json();
          return {
            symbol: idx.symbol,
            name: idx.name,
            price: json.price ?? 0,
            change: json.change ?? "0.00",
            changePercent: parseFloat(json.changePercent ?? "0"),
          };
        } catch {
          return { symbol: idx.symbol, name: idx.name, price: 0, change: "—", changePercent: 0 };
        }
      })
    );

    // Determine flash direction per symbol
    const flashes: Record<string, "up" | "down" | null> = {};
    results.forEach((r) => {
      const prev = prevPrices.current[r.symbol];
      if (prev !== undefined && r.price !== prev && r.price > 0) {
        flashes[r.symbol] = r.price > prev ? "up" : "down";
      }
      if (r.price > 0) prevPrices.current[r.symbol] = r.price;
    });

    setFlashMap(flashes);
    setData(results);
    setLoading(false);

    // Clear flashes after animation
    if (Object.keys(flashes).length) {
      setTimeout(() => setFlashMap({}), 700);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <div className="glass-card p-4">
      {/* Header with LIVE badge */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Market Pulse</h3>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] text-[var(--positive)]">
          <span className="pulse-dot" style={{ width: 6, height: 6, background: "var(--positive)" }} />
          Live
        </span>
      </div>

      {/* Loading skeleton state */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {INDICES.map((idx) => (
            <SkeletonCard key={idx.symbol} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.map((item) => {
            const isPositive = item.changePercent >= 0;
            const flash = flashMap[item.symbol];

            return (
              <div
                key={item.symbol}
                className="relative p-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                style={{
                  background: item.price > 0
                    ? isPositive
                      ? "linear-gradient(135deg, color-mix(in srgb, var(--positive) 6%, transparent), color-mix(in srgb, var(--positive) 2%, transparent))"
                      : "linear-gradient(135deg, color-mix(in srgb, var(--negative) 6%, transparent), color-mix(in srgb, var(--negative) 2%, transparent))"
                    : "color-mix(in srgb, var(--ink) 3%, transparent)",
                }}
              >
                {/* Subtle accent bar on the left */}
                {item.price > 0 && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                    style={{ background: isPositive ? "var(--positive)" : "var(--negative)", opacity: 0.5 }}
                  />
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-[var(--ink-muted)] uppercase tracking-wide">
                    {item.name}
                  </span>
                  {item.price > 0 &&
                    (isPositive ? (
                      <TrendingUp size={12} className="text-[var(--positive)]" />
                    ) : (
                      <TrendingDown size={12} className="text-[var(--negative)]" />
                    ))}
                </div>

                {/* Price with flash animation */}
                <div
                  className="text-lg font-bold text-[var(--ink)] transition-colors duration-500"
                  style={{
                    color: flash === "up"
                      ? "var(--positive)"
                      : flash === "down"
                      ? "var(--negative)"
                      : undefined,
                  }}
                >
                  {item.price > 0 ? `$${item.price.toFixed(2)}` : "—"}
                </div>

                <div
                  className="text-xs font-semibold"
                  style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
                >
                  {item.change} ({item.changePercent > 0 ? "+" : ""}
                  {item.changePercent.toFixed(2)}%)
                </div>

                {/* Mini trend dots */}
                {item.price > 0 && <TrendDots positive={isPositive} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state (all failed) */}
      {!loading && data.every((d) => d.price === 0) && (
        <div className="flex flex-col items-center py-6 text-center">
          <Activity size={28} className="text-[var(--ink-muted)] mb-2 opacity-40" />
          <p className="text-sm text-[var(--ink-muted)]">Market data unavailable</p>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">Prices will refresh automatically every 30s</p>
        </div>
      )}
    </div>
  );
}
