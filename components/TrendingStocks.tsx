"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

type TrendingItem = {
  symbol: string;
  count: number;
};

export default function TrendingStocks() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  useEffect(() => {
    if (!API_BASE) {
      setTrending([
        { symbol: "AAPL", count: 41 },
        { symbol: "NVDA", count: 38 },
        { symbol: "MSFT", count: 33 },
        { symbol: "TSLA", count: 29 },
      ]);
      return;
    }

    fetch(`${API_BASE}/trending`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTrending(data.slice(0, 15));
        }
      })
      .catch(() => {
        setTrending([
          { symbol: "AAPL", count: 41 },
          { symbol: "NVDA", count: 38 },
          { symbol: "MSFT", count: 33 },
        ]);
      });
  }, []);

  return (
    <div className="space-y-3">
      {trending.map((item, index) => (
        <div
          key={`${item.symbol}-${index}`}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/25 px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs rounded-full badge-neutral px-2 py-0.5">#{index + 1}</span>
            <span className="font-semibold">{item.symbol}</span>
          </div>
          <span className="text-xs muted inline-flex items-center gap-1">
            <Flame size={12} />
            {item.count} users
          </span>
        </div>
      ))}

      {!trending.length && <div className="text-sm muted">No trending data available.</div>}
    </div>
  );
}
