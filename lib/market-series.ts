"use client";

export type MarketSeriesPoint = {
  date: string;
  close: number;
};

export type MarketSeriesResult = {
  series: MarketSeriesPoint[];
  source: "local" | "remote" | "synthetic";
  detail?: string;
};

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function hashSymbol(symbol: string) {
  return symbol
    .split("")
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 7), 97);
}

function seededRng(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function syntheticMarketSeries(symbol: string, bars: number): MarketSeriesPoint[] {
  const normalized = normalizeSymbol(symbol || "AAPL");
  const seed = hashSymbol(normalized);
  const random = seededRng(seed);
  const count = Math.max(80, bars);
  const start = Date.now() - count * 24 * 60 * 60 * 1000;
  let price = 40 + (seed % 240);

  return Array.from({ length: count }).map((_, index) => {
    const drift = (random() - 0.48) * 0.012;
    const wave = Math.sin(index / (6 + (seed % 5))) * 0.004;
    price = Math.max(2, price * (1 + drift + wave));
    return {
      date: new Date(start + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      close: Number(price.toFixed(2)),
    };
  });
}

export function normalizeSeries(raw: unknown): MarketSeriesPoint[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const date = String(row.date ?? row.time ?? "").slice(0, 10);
      const close = Number(row.price ?? row.close ?? row.y ?? 0);
      if (!date || !Number.isFinite(close) || close <= 0) return null;
      return { date, close };
    })
    .filter((row): row is MarketSeriesPoint => Boolean(row))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

export async function fetchMarketSeries(
  symbol: string,
  limit: number,
  apiBase?: string
): Promise<MarketSeriesResult> {
  const normalized = normalizeSymbol(symbol || "AAPL");
  const cappedLimit = Math.min(600, Math.max(80, Math.floor(limit || 220)));

  try {
    const local = await fetchJson(
      `/api/stocks/chart?symbol=${encodeURIComponent(normalized)}&limit=${cappedLimit}`
    );
    const parsed = normalizeSeries(local?.data ?? local?.history ?? []);
    if (parsed.length >= 60) {
      return {
        series: parsed.slice(-cappedLimit),
        source: "local",
      };
    }
  } catch {
    // Continue to remote fallback.
  }

  if (apiBase) {
    const range =
      cappedLimit >= 500 ? "5y" : cappedLimit >= 252 ? "1y" : cappedLimit >= 126 ? "6mo" : "3mo";

    try {
      const remote = await fetchJson(
        `${apiBase.replace(/\/$/, "")}/chart/${encodeURIComponent(normalized)}?range=${range}`
      );
      const parsed = normalizeSeries(remote?.data ?? remote?.history ?? []);
      if (parsed.length >= 60) {
        return {
          series: parsed.slice(-cappedLimit),
          source: "remote",
        };
      }
    } catch {
      // Continue to synthetic fallback.
    }
  }

  return {
    series: syntheticMarketSeries(normalized, cappedLimit),
    source: "synthetic",
    detail: `${normalized}: synthetic market series fallback active.`,
  };
}
