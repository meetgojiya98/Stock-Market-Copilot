"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellPlus,
  Bot,
  ChartCandlestick,
  Gauge,
  LayoutGrid,
  NotebookText,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import sp500 from "./data/sp500.json";

type StockItem = {
  symbol: string;
  name: string;
};

type RangeKey = "1D" | "1W" | "1M" | "3M" | "1Y";

type ChartPoint = {
  ts: number;
  label: string;
  price: number;
};

type QuoteSnapshot = {
  symbol: string;
  price: number;
  changePct: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;
  asOf: string;
  source: "local-api" | "backend-api" | "synthetic";
};

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: number;
};

type AlertRule = {
  id: string;
  symbol: string;
  direction: "above" | "below";
  target: number;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
};

type JournalEntryStatus = "Draft" | "Planned" | "Active" | "Exited";

type JournalEntry = {
  id: string;
  symbol: string;
  title: string;
  plan: string;
  conviction: number;
  status: JournalEntryStatus;
  createdAt: string;
};

type ScreenerSort = "composite" | "momentum" | "volatility" | "change";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const PRESETS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"];
const RANGE_OPTIONS: RangeKey[] = ["1D", "1W", "1M", "3M", "1Y"];
const DEFAULT_COMPARE = ["AAPL", "MSFT", "NVDA", "TSLA"];
const ALERT_STORAGE_KEY = "smc_alert_rules_v2";
const JOURNAL_STORAGE_KEY = "smc_strategy_journal_v1";

const POSITIVE_WORDS = [
  "beat",
  "growth",
  "surge",
  "upside",
  "outperform",
  "momentum",
  "record",
  "optimism",
  "upgrade",
  "strong",
];

const NEGATIVE_WORDS = [
  "miss",
  "downgrade",
  "drop",
  "risk",
  "weak",
  "lawsuit",
  "cuts",
  "loss",
  "slowdown",
  "warning",
];

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hashSymbol(symbol: string): number {
  return symbol
    .toUpperCase()
    .split("")
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 17), 97);
}

function createSeededRng(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pointsForRange(range: RangeKey) {
  switch (range) {
    case "1D":
      return 44;
    case "1W":
      return 64;
    case "1M":
      return 92;
    case "3M":
      return 160;
    default:
      return 260;
  }
}

function intervalMsForRange(range: RangeKey) {
  switch (range) {
    case "1D":
      return 30 * 60 * 1000;
    case "1W":
      return 4 * 60 * 60 * 1000;
    case "1M":
      return 24 * 60 * 60 * 1000;
    case "3M":
      return 2 * 24 * 60 * 60 * 1000;
    default:
      return 5 * 24 * 60 * 60 * 1000;
  }
}

function formatLabel(ts: number, range: RangeKey) {
  const date = new Date(ts);

  if (range === "1D") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (range === "1W" || range === "1M") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function computeSMA(points: ChartPoint[], period: number) {
  if (points.length < period) return null;
  const slice = points.slice(-period).map((point) => point.price);
  return average(slice);
}

function computeReturns(points: ChartPoint[]) {
  if (points.length < 2) return [];
  const returns: number[] = [];
  for (let idx = 1; idx < points.length; idx += 1) {
    const prev = points[idx - 1].price;
    const current = points[idx].price;
    if (prev > 0) {
      returns.push((current - prev) / prev);
    }
  }
  return returns;
}

function computeMomentum(points: ChartPoint[], lookback = 10) {
  if (points.length <= lookback) return 0;
  const start = points[points.length - lookback - 1].price;
  const end = points[points.length - 1].price;
  if (start <= 0) return 0;
  return ((end - start) / start) * 100;
}

function computeRSI(points: ChartPoint[], period = 14) {
  if (points.length <= period) return null;

  const deltas: number[] = [];
  for (let idx = 1; idx < points.length; idx += 1) {
    deltas.push(points[idx].price - points[idx - 1].price);
  }

  const slice = deltas.slice(-period);
  const gains = slice.filter((delta) => delta > 0).map((delta) => Math.abs(delta));
  const losses = slice.filter((delta) => delta < 0).map((delta) => Math.abs(delta));
  const avgGain = average(gains);
  const avgLoss = average(losses);

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(percentileValue * (sorted.length - 1)))
  );
  return sorted[index];
}

function correlationCoefficient(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length < 6) return 0;

  const aSlice = a.slice(-length);
  const bSlice = b.slice(-length);
  const aMean = average(aSlice);
  const bMean = average(bSlice);
  let numerator = 0;
  let aVar = 0;
  let bVar = 0;

  for (let idx = 0; idx < length; idx += 1) {
    const aDiff = aSlice[idx] - aMean;
    const bDiff = bSlice[idx] - bMean;
    numerator += aDiff * bDiff;
    aVar += aDiff * aDiff;
    bVar += bDiff * bDiff;
  }

  const denominator = Math.sqrt(aVar) * Math.sqrt(bVar);
  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

function correlationCellClass(value: number) {
  if (value >= 0.7) return "bg-emerald-500/30 text-emerald-700 dark:text-emerald-200";
  if (value >= 0.35) return "bg-emerald-400/20 text-emerald-700 dark:text-emerald-200";
  if (value <= -0.7) return "bg-rose-500/30 text-rose-700 dark:text-rose-200";
  if (value <= -0.35) return "bg-rose-400/20 text-rose-700 dark:text-rose-200";
  return "bg-black/5 dark:bg-white/10 text-[var(--ink)]";
}

function sentimentFromText(text: string) {
  const lowered = text.toLowerCase();
  const positiveHits = POSITIVE_WORDS.reduce(
    (count, keyword) => (lowered.includes(keyword) ? count + 1 : count),
    0
  );
  const negativeHits = NEGATIVE_WORDS.reduce(
    (count, keyword) => (lowered.includes(keyword) ? count + 1 : count),
    0
  );

  if (positiveHits === 0 && negativeHits === 0) return 0;
  const score = (positiveHits - negativeHits) / Math.max(positiveHits + negativeHits, 1);
  return Math.max(-1, Math.min(1, score));
}

function generateSyntheticSeries(symbol: string, range: RangeKey): ChartPoint[] {
  const points = pointsForRange(range);
  const interval = intervalMsForRange(range);
  const now = Date.now();
  const seed = hashSymbol(symbol);
  const random = createSeededRng(seed);

  let price = 80 + (seed % 380);
  const drift = ((seed % 13) - 6) / 1200;

  return Array.from({ length: points }).map((_, idx) => {
    const ts = now - (points - idx - 1) * interval;
    const wave = Math.sin(idx / (6 + (seed % 4))) * 0.008;
    const noise = (random() - 0.5) * 0.03;

    price = Math.max(3, price * (1 + drift + wave + noise));

    return {
      ts,
      label: formatLabel(ts, range),
      price: Number(price.toFixed(2)),
    };
  });
}

function normalizeChartSeries(raw: any[], range: RangeKey): ChartPoint[] {
  const normalized = raw
    .map((entry) => {
      const tsCandidates = [
        toNumber(entry?.ts),
        toNumber(entry?.x),
        entry?.date ? Date.parse(String(entry.date)) : null,
        entry?.time ? Date.parse(String(entry.time)) : null,
      ];
      const ts = tsCandidates.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));

      const price = toNumber(entry?.price) ?? toNumber(entry?.close) ?? toNumber(entry?.y);

      if (typeof ts !== "number" || !Number.isFinite(ts) || price === null) return null;

      return {
        ts,
        label: formatLabel(ts, range),
        price,
      };
    })
    .filter((entry): entry is ChartPoint => Boolean(entry))
    .sort((a, b) => a.ts - b.ts);

  if (normalized.length < 10) return [];

  const needed = pointsForRange(range);
  return normalized.slice(-needed).map((point) => ({
    ...point,
    label: formatLabel(point.ts, range),
  }));
}

async function safeFetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

function quoteFromSeries(symbol: string, series: ChartPoint[]): QuoteSnapshot {
  const points = series.length ? series : generateSyntheticSeries(symbol, "1M");
  const current = points[points.length - 1].price;
  const previous = points[Math.max(points.length - 2, 0)].price;
  const min = Math.min(...points.map((point) => point.price));
  const max = Math.max(...points.map((point) => point.price));

  const changePct = previous ? ((current - previous) / previous) * 100 : 0;

  return {
    symbol,
    price: current,
    changePct,
    prevClose: previous || current,
    high: max,
    low: min,
    volume: 1_000_000 + hashSymbol(symbol) * 147,
    asOf: new Date().toISOString(),
    source: "synthetic",
  };
}

async function getQuote(symbol: string): Promise<QuoteSnapshot> {
  const fallback = quoteFromSeries(symbol, generateSyntheticSeries(symbol, "1M"));

  try {
    const local = await safeFetchJson(`/api/stocks/price?symbol=${symbol}`);
    const price = toNumber(local?.price);
    const changePct = toNumber(local?.change) ?? fallback.changePct;

    if (price !== null && price > 0) {
      const prevClose = price / (1 + changePct / 100);
      return {
        ...fallback,
        symbol,
        price,
        changePct,
        prevClose: Number.isFinite(prevClose) ? prevClose : fallback.prevClose,
        asOf: new Date().toISOString(),
        source: "local-api",
      };
    }
  } catch {
    // Fall through to backend or synthetic fallback.
  }

  if (API_BASE) {
    try {
      const backend = await safeFetchJson(`${API_BASE}/price/${symbol}`);
      const price = toNumber(backend?.price);
      const changePct = toNumber(backend?.change) ?? fallback.changePct;

      if (price !== null && price > 0) {
        const prevClose = price / (1 + changePct / 100);
        return {
          ...fallback,
          symbol,
          price,
          changePct,
          prevClose: Number.isFinite(prevClose) ? prevClose : fallback.prevClose,
          asOf: new Date().toISOString(),
          source: "backend-api",
        };
      }
    } catch {
      // Synthetic fallback below.
    }
  }

  return fallback;
}

function mapRangeToBackend(range: RangeKey) {
  switch (range) {
    case "1D":
      return "1d";
    case "1W":
      return "1wk";
    case "1M":
      return "1mo";
    case "3M":
      return "3mo";
    default:
      return "1y";
  }
}

async function getChartSeries(symbol: string, range: RangeKey): Promise<ChartPoint[]> {
  try {
    const local = await safeFetchJson(`/api/stocks/chart?symbol=${symbol}`);
    const normalized = normalizeChartSeries(local?.data ?? local?.history ?? [], range);
    if (normalized.length >= 10) return normalized;
  } catch {
    // Fall through.
  }

  if (API_BASE) {
    try {
      const backend = await safeFetchJson(`${API_BASE}/chart/${symbol}?range=${mapRangeToBackend(range)}`);
      const normalized = normalizeChartSeries(backend?.data ?? backend?.history ?? [], range);
      if (normalized.length >= 10) return normalized;
    } catch {
      // Synthetic fallback.
    }
  }

  return generateSyntheticSeries(symbol, range);
}

function buildFallbackNews(symbol: string): NewsItem[] {
  const baseDate = Date.now();
  const templates = [
    `${symbol} attracts institutional accumulation as liquidity improves`,
    `Analysts debate whether ${symbol} can sustain margin expansion into next quarter`,
    `${symbol} option flows indicate elevated short-term volatility`,
    `Macro rate expectations reshape growth-stock leadership including ${symbol}`,
    `${symbol} management outlines multi-year capital allocation priorities`,
  ];

  return templates.map((title, idx) => ({
    title,
    url: "#",
    source: "Market Synth",
    publishedAt: new Date(baseDate - idx * 1000 * 60 * 60 * 6).toISOString(),
    summary: "Generated fallback headline used when live feeds are unavailable.",
    sentiment: sentimentFromText(title),
  }));
}

function normalizeNewsItems(raw: any[]): NewsItem[] {
  return raw
    .map((item) => {
      const title = String(item?.headline ?? item?.title ?? "").trim();
      const url = String(item?.url ?? "").trim();
      if (!title) return null;

      const publishedAt =
        toNumber(item?.datetime) !== null
          ? new Date(Number(item.datetime) * 1000).toISOString()
          : String(item?.publishedAt ?? item?.date ?? new Date().toISOString());

      const source = String(item?.source ?? item?.site ?? "Market Feed");
      const summary = String(item?.summary ?? item?.description ?? "").trim();
      const sentiment = sentimentFromText(`${title} ${summary}`);

      return {
        title,
        url: url || "#",
        source,
        publishedAt,
        summary,
        sentiment,
      };
    })
    .filter((item): item is NewsItem => Boolean(item))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 8);
}

async function getNews(symbol: string): Promise<NewsItem[]> {
  try {
    const local = await safeFetchJson(`/api/stocks/news?symbol=${symbol}`);
    const normalized = normalizeNewsItems(local?.news ?? local ?? []);
    if (normalized.length) return normalized;
  } catch {
    // Fall through.
  }

  if (API_BASE) {
    try {
      const backend = await safeFetchJson(`${API_BASE}/news/${symbol}`);
      const normalized = normalizeNewsItems(backend?.news ?? backend ?? []);
      if (normalized.length) return normalized;
    } catch {
      // Fall through.
    }
  }

  return buildFallbackNews(symbol);
}

function fallbackCopilotAnswer(
  symbol: string,
  question: string,
  quote: QuoteSnapshot | null,
  sentiment: number,
  trendUp: boolean
) {
  const stance = trendUp ? "constructive" : "defensive";
  const sentimentBias = sentiment > 0.2 ? "positive" : sentiment < -0.2 ? "negative" : "mixed";

  return [
    `Live model fallback for ${symbol}: current structure is ${stance} with ${sentimentBias} news flow.`,
    quote
      ? `Spot ${formatMoney(quote.price)} vs prev close ${formatMoney(
          quote.prevClose
        )}; intraday move ${formatPercent(quote.changePct)}.`
      : "Live quote is unavailable, using synthetic projection.",
    `For your prompt (\"${question}\"), prioritize position sizing, stop placement, and event risk before directional conviction.`,
  ].join(" ");
}

export default function Home() {
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [range, setRange] = useState<RangeKey>("1M");
  const [symbolQuery, setSymbolQuery] = useState("");

  const [quote, setQuote] = useState<QuoteSnapshot | null>(null);
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const [compareSymbols, setCompareSymbols] = useState<string[]>(DEFAULT_COMPARE);
  const [compareInput, setCompareInput] = useState("");
  const [comparisonQuotes, setComparisonQuotes] = useState<Record<string, QuoteSnapshot>>({});
  const [comparisonSeries, setComparisonSeries] = useState<Record<string, ChartPoint[]>>({});
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [screenerSort, setScreenerSort] = useState<ScreenerSort>("composite");

  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [askingAI, setAskingAI] = useState(false);

  const [entryPrice, setEntryPrice] = useState("");
  const [positionSize, setPositionSize] = useState("120");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [alertSymbol, setAlertSymbol] = useState("AAPL");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const [alertTarget, setAlertTarget] = useState("");

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalPlan, setJournalPlan] = useState("");
  const [journalConviction, setJournalConviction] = useState("60");
  const [journalStatus, setJournalStatus] = useState<JournalEntryStatus>("Draft");

  const stockUniverse = sp500 as StockItem[];

  const suggestions = useMemo(() => {
    const value = symbolQuery.trim().toUpperCase();
    if (!value) return [];

    return stockUniverse
      .filter(
        (stock) =>
          stock.symbol.startsWith(value) || stock.name.toUpperCase().includes(value.toUpperCase())
      )
      .slice(0, 7);
  }, [stockUniverse, symbolQuery]);

  const sentimentScore = useMemo(() => {
    if (!news.length) return 0;
    return news.reduce((sum, item) => sum + item.sentiment, 0) / news.length;
  }, [news]);

  const trendUp = useMemo(() => {
    if (series.length < 2) return true;
    return series[series.length - 1].price >= series[0].price;
  }, [series]);

  const volatilityPct = useMemo(() => {
    if (!quote || quote.price <= 0) return 0;
    return ((quote.high - quote.low) / quote.price) * 100;
  }, [quote]);

  const riskScore = useMemo(() => {
    if (!quote) return 45;

    const movementWeight = Math.abs(quote.changePct) * 2.4;
    const volatilityWeight = volatilityPct * 1.8;
    const sentimentPenalty = sentimentScore < -0.25 ? 18 : sentimentScore > 0.25 ? -6 : 5;

    return Math.max(0, Math.min(100, movementWeight + volatilityWeight + sentimentPenalty));
  }, [quote, volatilityPct, sentimentScore]);

  const sentimentMeta = useMemo(() => {
    if (sentimentScore > 0.2) {
      return {
        label: "Bullish",
        className: "badge-positive",
      };
    }

    if (sentimentScore < -0.2) {
      return {
        label: "Risk-Off",
        className: "badge-negative",
      };
    }

    return {
      label: "Balanced",
      className: "badge-neutral",
    };
  }, [sentimentScore]);

  const quantInsights = useMemo(() => {
    const closes = series.map((point) => point.price);
    const sma20 = computeSMA(series, 20);
    const sma50 = computeSMA(series, 50);
    const rsi14 = computeRSI(series, 14);
    const momentum10 = computeMomentum(series, 10);
    const volatility = stdDev(computeReturns(series).map((value) => value * 100));
    const support = percentile(closes, 0.2);
    const resistance = percentile(closes, 0.8);

    let bullishPoints = 0;
    let bearishPoints = 0;

    if (sma20 !== null && sma50 !== null) {
      if (sma20 > sma50) {
        bullishPoints += 1;
      } else {
        bearishPoints += 1;
      }
    }

    if (rsi14 !== null) {
      if (rsi14 < 35) bullishPoints += 1;
      else if (rsi14 > 65) bearishPoints += 1;
    }

    if (momentum10 >= 0) bullishPoints += 1;
    else bearishPoints += 1;

    if (sentimentScore > 0.15) bullishPoints += 1;
    if (sentimentScore < -0.15) bearishPoints += 1;

    let signal = "Balanced Setup";
    if (bullishPoints - bearishPoints >= 2) signal = "Bullish Setup";
    if (bearishPoints - bullishPoints >= 2) signal = "Defensive Setup";

    const confidence = Math.max(
      48,
      Math.min(95, 54 + Math.abs(bullishPoints - bearishPoints) * 10 + Math.abs(momentum10) * 0.6)
    );

    return {
      sma20,
      sma50,
      rsi14,
      momentum10,
      volatility,
      support,
      resistance,
      signal,
      confidence,
    };
  }, [series, sentimentScore]);

  const correlationSymbols = useMemo(
    () => Array.from(new Set([activeSymbol, ...compareSymbols])).slice(0, 6),
    [activeSymbol, compareSymbols]
  );

  const correlationMatrix = useMemo(() => {
    const returnMap = Object.fromEntries(
      correlationSymbols.map((symbol) => {
        const sourceSeries = symbol === activeSymbol ? series : comparisonSeries[symbol] ?? [];
        return [symbol, computeReturns(sourceSeries)];
      })
    ) as Record<string, number[]>;

    return correlationSymbols.map((rowSymbol) =>
      correlationSymbols.map((colSymbol) => {
        if (rowSymbol === colSymbol) return 1;
        return correlationCoefficient(returnMap[rowSymbol] ?? [], returnMap[colSymbol] ?? []);
      })
    );
  }, [correlationSymbols, activeSymbol, series, comparisonSeries]);

  const screenerRows = useMemo(() => {
    const universe = Array.from(new Set([activeSymbol, ...compareSymbols, ...PRESETS])).slice(0, 12);

    const rows = universe.map((symbol) => {
      const snapshot =
        symbol === activeSymbol ? quote : comparisonQuotes[symbol] ?? quoteFromSeries(symbol, comparisonSeries[symbol] ?? []);
      const priceSeries = symbol === activeSymbol ? series : comparisonSeries[symbol] ?? [];
      const momentum = computeMomentum(priceSeries, 12);
      const volatility = stdDev(computeReturns(priceSeries).map((value) => value * 100));
      const sentiment = symbol === activeSymbol ? sentimentScore : Math.max(-1, Math.min(1, momentum / 14));
      const composite = momentum * 1.35 + (snapshot?.changePct ?? 0) * 0.75 - volatility * 0.8 + sentiment * 12;

      return {
        symbol,
        price: snapshot?.price ?? 0,
        changePct: snapshot?.changePct ?? 0,
        momentum,
        volatility,
        sentiment,
        composite,
      };
    });

    rows.sort((a, b) => {
      if (screenerSort === "momentum") return b.momentum - a.momentum;
      if (screenerSort === "volatility") return a.volatility - b.volatility;
      if (screenerSort === "change") return b.changePct - a.changePct;
      return b.composite - a.composite;
    });

    return rows;
  }, [
    activeSymbol,
    compareSymbols,
    quote,
    series,
    comparisonQuotes,
    comparisonSeries,
    sentimentScore,
    screenerSort,
  ]);

  const loadPrimaryData = useCallback(async () => {
    setLoading(true);

    try {
      const [quoteSnapshot, chartSeries, newsFeed] = await Promise.all([
        getQuote(activeSymbol),
        getChartSeries(activeSymbol, range),
        getNews(activeSymbol),
      ]);

      setQuote(quoteSnapshot);
      setSeries(chartSeries);
      setNews(newsFeed);
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [activeSymbol, range]);

  const loadComparisonQuotes = useCallback(async () => {
    setComparisonLoading(true);

    try {
      const quotePairs = await Promise.all(
        compareSymbols.map(async (symbol) => {
          const [quoteSnapshot, oneMonthSeries] = await Promise.all([
            getQuote(symbol),
            getChartSeries(symbol, "1M"),
          ]);
          return [symbol, { quoteSnapshot, oneMonthSeries }] as const;
        })
      );

      setComparisonQuotes(
        Object.fromEntries(quotePairs.map(([symbol, data]) => [symbol, data.quoteSnapshot]))
      );
      setComparisonSeries(
        Object.fromEntries(quotePairs.map(([symbol, data]) => [symbol, data.oneMonthSeries]))
      );
    } finally {
      setComparisonLoading(false);
    }
  }, [compareSymbols]);

  useEffect(() => {
    loadPrimaryData();
  }, [loadPrimaryData]);

  useEffect(() => {
    const interval = window.setInterval(loadPrimaryData, 60_000);
    return () => window.clearInterval(interval);
  }, [loadPrimaryData]);

  useEffect(() => {
    loadComparisonQuotes();
  }, [loadComparisonQuotes]);

  useEffect(() => {
    const interval = window.setInterval(loadComparisonQuotes, 75_000);
    return () => window.clearInterval(interval);
  }, [loadComparisonQuotes]);

  useEffect(() => {
    setAlertSymbol(activeSymbol);
  }, [activeSymbol]);

  useEffect(() => {
    const raw = localStorage.getItem(ALERT_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AlertRule[];
      if (Array.isArray(parsed)) {
        setAlerts(parsed);
      }
    } catch {
      localStorage.removeItem(ALERT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as JournalEntry[];
      if (Array.isArray(parsed)) {
        setJournalEntries(parsed);
      }
    } catch {
      localStorage.removeItem(JOURNAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journalEntries));
  }, [journalEntries]);

  const priceLookup = useMemo(() => {
    const map: Record<string, number> = {};

    if (quote) {
      map[activeSymbol] = quote.price;
    }

    Object.values(comparisonQuotes).forEach((snapshot) => {
      map[snapshot.symbol] = snapshot.price;
    });

    return map;
  }, [quote, activeSymbol, comparisonQuotes]);

  useEffect(() => {
    if (!Object.keys(priceLookup).length) return;

    setAlerts((current) =>
      current.map((alert) => {
        if (alert.triggered) return alert;
        const last = priceLookup[alert.symbol];
        if (typeof last !== "number") return alert;

        const shouldTrigger =
          alert.direction === "above" ? last >= alert.target : last <= alert.target;

        if (!shouldTrigger) return alert;

        return {
          ...alert,
          triggered: true,
          triggeredAt: new Date().toISOString(),
        };
      })
    );
  }, [priceLookup]);

  useEffect(() => {
    if (!quote) return;
    setEntryPrice((current) => current || quote.price.toFixed(2));
    setTargetPrice((current) => current || (quote.price * 1.08).toFixed(2));
    setStopPrice((current) => current || (quote.price * 0.95).toFixed(2));
  }, [quote]);

  const scenario = useMemo(() => {
    const entry = Number(entryPrice) || quote?.price || 0;
    const qty = Number(positionSize) || 0;
    const target = Number(targetPrice) || 0;
    const stop = Number(stopPrice) || 0;

    const potentialProfit = Math.max(0, (target - entry) * qty);
    const potentialLoss = Math.max(0, (entry - stop) * qty);
    const riskReward = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;

    return {
      entry,
      qty,
      target,
      stop,
      potentialProfit,
      potentialLoss,
      riskReward,
    };
  }, [entryPrice, positionSize, targetPrice, stopPrice, quote]);

  const quickPrompts = [
    `Build a tactical thesis for ${activeSymbol} over the next 10 trading sessions.`,
    `What are the top downside risks for ${activeSymbol} and how should I hedge them?`,
    `Compare valuation and momentum signals for ${activeSymbol} versus its peers.`,
  ];

  const askCopilot = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      setAskingAI(true);
      setAiAnswer("");

      try {
        try {
          const proxyResponse = await fetch("/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: trimmed, symbol: activeSymbol }),
          });

          if (proxyResponse.ok) {
            const data = await proxyResponse.json();
            if (data?.answer) {
              setAiAnswer(String(data.answer));
              return;
            }
          }
        } catch {
          // Fall through to backend/fallback.
        }

        if (API_BASE) {
          try {
            const backendResponse = await fetch(`${API_BASE}/ask`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: trimmed, symbol: activeSymbol }),
            });

            if (backendResponse.ok) {
              const data = await backendResponse.json();
              if (data?.answer) {
                setAiAnswer(String(data.answer));
                return;
              }
            }
          } catch {
            // Fall through.
          }
        }

        setAiAnswer(fallbackCopilotAnswer(activeSymbol, trimmed, quote, sentimentScore, trendUp));
      } finally {
        setAskingAI(false);
      }
    },
    [activeSymbol, quote, sentimentScore, trendUp]
  );

  const handleSelectSymbol = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;

    setActiveSymbol(normalized);
    setSymbolQuery("");
    setEntryPrice("");
    setTargetPrice("");
    setStopPrice("");
  };

  const addCompareSymbol = () => {
    const normalized = compareInput.trim().toUpperCase();
    if (!normalized) return;
    if (compareSymbols.includes(normalized)) {
      setCompareInput("");
      return;
    }

    setCompareSymbols((current) => [...current, normalized].slice(0, 8));
    setCompareInput("");
  };

  const removeCompareSymbol = (symbol: string) => {
    setCompareSymbols((current) => current.filter((item) => item !== symbol));
  };

  const addAlert = () => {
    const normalizedSymbol = alertSymbol.trim().toUpperCase();
    const target = Number(alertTarget);

    if (!normalizedSymbol || !Number.isFinite(target) || target <= 0) return;

    const createdAt = new Date().toISOString();
    const id = `${normalizedSymbol}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;

    setAlerts((current) => [
      {
        id,
        symbol: normalizedSymbol,
        direction: alertDirection,
        target,
        createdAt,
        triggered: false,
      },
      ...current,
    ]);

    setAlertTarget("");
  };

  const clearTriggeredAlerts = () => {
    setAlerts((current) => current.filter((alert) => !alert.triggered));
  };

  const addJournalEntry = () => {
    const title = journalTitle.trim();
    const plan = journalPlan.trim();
    const conviction = Math.max(1, Math.min(100, Number(journalConviction) || 50));
    if (!title && !plan) return;

    const createdAt = new Date().toISOString();
    const id = `${activeSymbol}-${createdAt}-${Math.random().toString(36).slice(2, 7)}`;

    setJournalEntries((current) => [
      {
        id,
        symbol: activeSymbol,
        title: title || `${activeSymbol} setup note`,
        plan: plan || "No plan detail provided.",
        conviction,
        status: journalStatus,
        createdAt,
      },
      ...current,
    ]);

    setJournalTitle("");
    setJournalPlan("");
  };

  const removeJournalEntry = (id: string) => {
    setJournalEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const quoteDelta = quote ? quote.price - quote.prevClose : 0;

  return (
    <div className="pro-container py-8 sm:py-10 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="surface-glass rounded-3xl overflow-hidden relative"
      >
        <div className="absolute inset-0 grid-overlay opacity-30" />
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 grid lg:grid-cols-[1.5fr_1fr] gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 bg-white/65 dark:bg-black/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] muted">
              <Sparkles size={14} />
              AI Trading Command Center
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight section-title">
              Build sharper market decisions with a live intelligence workspace.
            </h1>
            <p className="mt-3 muted max-w-2xl">
              Monitor {activeSymbol}, compare leaders, stress-test position ideas, and collaborate with an
              AI copilot from one decision-grade interface.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium badge-positive">
                <Shield size={12} />
                Risk-first workflow
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium badge-neutral">
                <Gauge size={12} />
                Auto-refresh every minute
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${sentimentMeta.className}`}>
                <Newspaper size={12} />
                News mood: {sentimentMeta.label}
              </span>
            </div>
          </div>

          <div className="surface-panel rounded-2xl p-5 fade-up">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.14em] muted">Live Snapshot</span>
              <span className="text-xs muted">
                {lastUpdated
                  ? `Updated ${new Date(lastUpdated).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : "Preparing feeds"}
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-xs muted">{activeSymbol}</div>
                <div className="text-3xl sm:text-4xl metric-value font-semibold">
                  {quote ? formatMoney(quote.price) : "--"}
                </div>
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  quoteDelta >= 0 ? "badge-positive" : "badge-negative"
                }`}
              >
                {quoteDelta >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {quote ? formatPercent(quote.changePct) : "--"}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/65 dark:bg-black/25 p-3">
                <div className="text-xs muted">Session Range</div>
                <div className="font-semibold mt-1 metric-value">
                  {quote ? `${formatMoney(quote.low)} - ${formatMoney(quote.high)}` : "--"}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/65 dark:bg-black/25 p-3">
                <div className="text-xs muted">Relative Volume</div>
                <div className="font-semibold mt-1 metric-value">
                  {quote ? `${formatCompact(quote.volume)}` : "--"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="surface-glass rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex-1 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 muted" size={16} />
              <input
                value={symbolQuery}
                onChange={(event) => setSymbolQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (suggestions[0]) {
                      handleSelectSymbol(suggestions[0].symbol);
                    } else {
                      handleSelectSymbol(symbolQuery);
                    }
                  }
                }}
                placeholder="Search symbol or company"
                className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />

              {suggestions.length > 0 && (
                <div className="absolute mt-2 w-full rounded-xl border border-black/10 dark:border-white/10 bg-[var(--surface-strong)] shadow-2xl z-40 overflow-hidden">
                  {suggestions.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleSelectSymbol(stock.symbol)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between"
                    >
                      <span className="font-medium">{stock.symbol}</span>
                      <span className="text-xs muted truncate max-w-[65%]">{stock.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => handleSelectSymbol(symbol)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    symbol === activeSymbol
                      ? "bg-gradient-to-r from-[var(--accent)] to-orange-400 text-white"
                      : "bg-white/70 dark:bg-black/20 border border-black/10 dark:border-white/10 hover:bg-white dark:hover:bg-black/35"
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setRange(option)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  range === option
                    ? "bg-[var(--accent-2)] text-white"
                    : "border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20"
                }`}
              >
                {option}
              </button>
            ))}

            <button
              onClick={loadPrimaryData}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/25 text-xs font-semibold hover:bg-white dark:hover:bg-black/35"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.9fr_1fr] gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold section-title flex items-center gap-2">
                <ChartCandlestick size={17} />
                Price Structure: {activeSymbol}
              </h2>
              <div className="text-xs muted">Adaptive charting with synthetic fallback resilience</div>
            </div>
            <span className="text-xs rounded-full px-3 py-1 border border-black/10 dark:border-white/15 bg-white/70 dark:bg-black/20">
              Source: {quote?.source ?? "--"}
            </span>
          </div>

          <div className="h-[330px] sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 18, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-2)" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="var(--accent-2)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickMargin={8} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  width={52}
                />
                <Tooltip
                  formatter={(value: number) => [formatMoney(Number(value)), "Price"]}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(15, 23, 42, 0.15)",
                    background: "rgba(255,255,255,0.95)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--accent-2)"
                  strokeWidth={2.2}
                  fill="url(#chartFill)"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold section-title flex items-center gap-2">
            <Gauge size={17} />
            Pulse & Risk Radar
          </h2>
          <p className="text-xs muted mt-1">Composite score from movement, range volatility, and sentiment.</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/65 dark:bg-black/20 p-3">
              <div className="text-xs muted">Trend state</div>
              <div className={`text-sm font-semibold mt-1 ${trendUp ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                {trendUp ? "Uptrend structure" : "Downtrend structure"}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/65 dark:bg-black/20 p-3">
              <div className="text-xs muted">Intraday volatility</div>
              <div className="text-sm font-semibold mt-1 metric-value">{volatilityPct.toFixed(2)}%</div>
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/65 dark:bg-black/20 p-3">
              <div className="flex items-center justify-between text-xs muted">
                <span>Risk pressure score</span>
                <span>{Math.round(riskScore)}/100</span>
              </div>
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500"
                  style={{ width: `${riskScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.slice(-42)}>
                <Line type="monotone" dataKey="price" stroke="var(--accent)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold section-title flex items-center gap-2">
              <Activity size={17} />
              Quant Signal Engine
            </h2>
            <span className="text-xs rounded-full px-3 py-1 border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20">
              Confidence: {Math.round(quantInsights.confidence)}%
            </span>
          </div>
          <p className="text-xs muted mt-1">
            Technical composite built from momentum, trend stack, mean reversion pressure, and sentiment.
          </p>

          <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="muted">Signal regime</span>
              <span
                className={`font-semibold ${
                  quantInsights.signal === "Bullish Setup"
                    ? "text-[var(--positive)]"
                    : quantInsights.signal === "Defensive Setup"
                    ? "text-[var(--negative)]"
                    : "muted"
                }`}
              >
                {quantInsights.signal}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-[var(--accent-2)] to-[var(--accent)]"
                style={{ width: `${quantInsights.confidence}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">SMA 20</div>
              <div className="metric-value font-semibold mt-1">
                {quantInsights.sma20 !== null ? formatMoney(quantInsights.sma20) : "--"}
              </div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">SMA 50</div>
              <div className="metric-value font-semibold mt-1">
                {quantInsights.sma50 !== null ? formatMoney(quantInsights.sma50) : "--"}
              </div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">RSI 14</div>
              <div className="metric-value font-semibold mt-1">
                {quantInsights.rsi14 !== null ? quantInsights.rsi14.toFixed(1) : "--"}
              </div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">Momentum 10</div>
              <div
                className={`metric-value font-semibold mt-1 ${
                  quantInsights.momentum10 >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                }`}
              >
                {formatPercent(quantInsights.momentum10)}
              </div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">Return Volatility</div>
              <div className="metric-value font-semibold mt-1">{quantInsights.volatility.toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">Support / Resistance</div>
              <div className="metric-value font-semibold mt-1">
                {formatMoney(quantInsights.support)} / {formatMoney(quantInsights.resistance)}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold section-title flex items-center gap-2">
            <LayoutGrid size={17} />
            Correlation Matrix
          </h2>
          <p className="text-xs muted mt-1">30-day return correlations for your focused symbol basket.</p>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-xs min-w-[320px] border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {correlationSymbols.map((symbol) => (
                    <th key={symbol} className="p-2 text-[11px] font-semibold">
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationSymbols.map((rowSymbol, rowIdx) => (
                  <tr key={rowSymbol}>
                    <th className="p-2 text-[11px] text-left font-semibold">{rowSymbol}</th>
                    {correlationSymbols.map((colSymbol, colIdx) => {
                      const value = correlationMatrix[rowIdx]?.[colIdx] ?? 0;
                      return (
                        <td
                          key={`${rowSymbol}-${colSymbol}`}
                          className={`p-2 rounded-md text-center font-semibold ${correlationCellClass(
                            value
                          )}`}
                        >
                          {value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold section-title">Multi-Symbol Relative Strength</h2>
            <div className="flex items-center gap-2">
              <input
                value={compareInput}
                onChange={(event) => setCompareInput(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCompareSymbol();
                  }
                }}
                placeholder="Add symbol"
                className="rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs w-28"
              />
              <button
                onClick={addCompareSymbol}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-2)] text-white px-3 py-1.5 text-xs font-semibold"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[450px] text-sm">
              <thead>
                <tr className="text-left text-xs muted border-b border-black/10 dark:border-white/10">
                  <th className="py-2 font-medium">Symbol</th>
                  <th className="py-2 font-medium">Last</th>
                  <th className="py-2 font-medium">Change</th>
                  <th className="py-2 font-medium">Volatility</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {compareSymbols.map((symbol) => {
                  const snapshot = comparisonQuotes[symbol];
                  const miniVolatility = snapshot
                    ? Math.abs(((snapshot.high - snapshot.low) / snapshot.price) * 100)
                    : null;

                  return (
                    <tr
                      key={symbol}
                      className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="py-2.5 font-semibold">{symbol}</td>
                      <td className="py-2.5 metric-value">
                        {snapshot ? formatMoney(snapshot.price) : "--"}
                      </td>
                      <td className="py-2.5">
                        {snapshot ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              snapshot.changePct >= 0 ? "badge-positive" : "badge-negative"
                            }`}
                          >
                            {formatPercent(snapshot.changePct)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="py-2.5 metric-value">
                        {miniVolatility !== null ? `${miniVolatility.toFixed(2)}%` : "--"}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelectSymbol(symbol)}
                            className="text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10"
                          >
                            Focus
                          </button>
                          <button
                            onClick={() => removeCompareSymbol(symbol)}
                            className="text-xs px-2 py-1 rounded-md border border-red-400/40 text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {comparisonLoading && <div className="text-xs muted mt-3">Refreshing relative quotes...</div>}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold section-title">News Intelligence Stream</h2>
          <p className="text-xs muted mt-1">Headline scoring + source-aware filtering for faster context.</p>

          <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {news.map((item, index) => {
              const badgeClass =
                item.sentiment > 0.2
                  ? "badge-positive"
                  : item.sentiment < -0.2
                  ? "badge-negative"
                  : "badge-neutral";

              return (
                <a
                  key={`${item.title}-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 p-3 hover:bg-white dark:hover:bg-black/35 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badgeClass}`}>
                      {(item.sentiment * 100).toFixed(0)}
                    </span>
                  </div>
                  <div className="text-xs muted mt-2 flex items-center gap-2">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>
                      {new Date(item.publishedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold section-title flex items-center gap-2">
            <Bot size={17} />
            AI Copilot Workspace
          </h2>
          <p className="text-xs muted mt-1">Thesis building, risk framing, and tactical planning in natural language.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setQuestion(prompt);
                  askCopilot(prompt);
                }}
                className="text-xs rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-1.5 hover:bg-white dark:hover:bg-black/35"
              >
                {prompt.length > 65 ? `${prompt.slice(0, 65)}...` : prompt}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask a deep question about ${activeSymbol}`}
              className="w-full min-h-[96px] rounded-xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => askCopilot(question)}
              disabled={askingAI || !question.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {askingAI ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {askingAI ? "Analyzing" : "Ask Copilot"}
            </button>
            <button
              onClick={() => {
                setQuestion("");
                setAiAnswer("");
              }}
              className="rounded-lg px-3 py-2 text-sm border border-black/10 dark:border-white/10"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 min-h-[128px] text-sm leading-relaxed whitespace-pre-wrap">
            {aiAnswer || "Copilot response will appear here. Use prompts above or ask your own scenario question."}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold section-title flex items-center gap-2">
            <Target size={17} />
            What-If Risk Lab
          </h2>
          <p className="text-xs muted mt-1">Calibrate setup quality before execution.</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span className="muted">Entry</span>
              <input
                value={entryPrice}
                onChange={(event) => setEntryPrice(event.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="muted">Shares</span>
              <input
                value={positionSize}
                onChange={(event) => setPositionSize(event.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="muted">Target</span>
              <input
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="muted">Stop</span>
              <input
                value={stopPrice}
                onChange={(event) => setStopPrice(event.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">Potential Upside</div>
              <div className="font-semibold mt-1 text-[var(--positive)] metric-value">
                {formatMoney(scenario.potentialProfit)}
              </div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">Max Risk</div>
              <div className="font-semibold mt-1 text-[var(--negative)] metric-value">
                {formatMoney(scenario.potentialLoss)}
              </div>
            </div>
            <div className="col-span-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-2.5">
              <div className="muted">Risk / Reward</div>
              <div className="font-semibold mt-1 metric-value">{scenario.riskReward.toFixed(2)}x</div>
            </div>
          </div>

          <div className="mt-6 border-t border-black/10 dark:border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BellPlus size={14} />
                Alert Builder
              </h3>
              <button
                onClick={clearTriggeredAlerts}
                className="text-xs rounded-lg border border-black/10 dark:border-white/10 px-2 py-1"
              >
                Clear Triggered
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <input
                value={alertSymbol}
                onChange={(event) => setAlertSymbol(event.target.value.toUpperCase())}
                className="rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2 py-2"
                placeholder="Symbol"
              />
              <select
                value={alertDirection}
                onChange={(event) => setAlertDirection(event.target.value as "above" | "below")}
                className="rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2 py-2"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <input
                value={alertTarget}
                onChange={(event) => setAlertTarget(event.target.value)}
                className="rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2 py-2"
                placeholder="Target"
              />
            </div>

            <button
              onClick={addAlert}
              className="mt-2 w-full rounded-lg bg-[var(--accent-2)] text-white px-3 py-2 text-xs font-semibold"
            >
              Add Alert
            </button>

            <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
              {alerts.length === 0 && <div className="text-xs muted">No custom alerts configured yet.</div>}

              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border px-2.5 py-2 text-xs flex items-center justify-between gap-2 ${
                    alert.triggered
                      ? "border-red-400/40 bg-red-500/10"
                      : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20"
                  }`}
                >
                  <div>
                    <div className="font-semibold">
                      {alert.symbol} {alert.direction} {formatMoney(alert.target)}
                    </div>
                    <div className="muted mt-0.5">
                      {alert.triggered
                        ? `Triggered ${new Date(alert.triggeredAt ?? alert.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : "Monitoring"}
                    </div>
                  </div>
                  <button
                    onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))}
                    className="rounded-md border border-black/10 dark:border-white/10 p-1"
                    aria-label="Delete alert"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold section-title flex items-center gap-2">
              <SlidersHorizontal size={17} />
              Smart Opportunity Screener
            </h2>
            <div className="flex gap-1 rounded-lg border border-black/10 dark:border-white/10 p-1 bg-white/70 dark:bg-black/20">
              {([
                ["composite", "Composite"],
                ["momentum", "Momentum"],
                ["volatility", "Low Vol"],
                ["change", "Day Move"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setScreenerSort(value)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold ${
                    screenerSort === value
                      ? "bg-[var(--accent-2)] text-white"
                      : "bg-transparent hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full min-w-[540px] text-sm">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr className="text-left text-xs">
                  <th className="px-3 py-2.5 font-medium">Symbol</th>
                  <th className="px-3 py-2.5 font-medium">Last</th>
                  <th className="px-3 py-2.5 font-medium">Day Change</th>
                  <th className="px-3 py-2.5 font-medium">Momentum</th>
                  <th className="px-3 py-2.5 font-medium">Volatility</th>
                  <th className="px-3 py-2.5 font-medium">Composite</th>
                </tr>
              </thead>
              <tbody>
                {screenerRows.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <td className="px-3 py-2.5 font-semibold">{row.symbol}</td>
                    <td className="px-3 py-2.5 metric-value">{formatMoney(row.price)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.changePct >= 0 ? "badge-positive" : "badge-negative"
                        }`}
                      >
                        {formatPercent(row.changePct)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 metric-value">{formatPercent(row.momentum)}</td>
                    <td className="px-3 py-2.5 metric-value">{row.volatility.toFixed(2)}%</td>
                    <td className="px-3 py-2.5 metric-value font-semibold">{row.composite.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs muted inline-flex items-center gap-1">
            <TrendingUp size={12} />
            Composite score combines momentum, day move, volatility, and sentiment bias.
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.36 }}
          className="surface-glass rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold section-title flex items-center gap-2">
            <NotebookText size={17} />
            Strategy Journal
          </h2>
          <p className="text-xs muted mt-1">Capture thesis, conviction, and execution state for every setup.</p>

          <div className="mt-4 space-y-2 text-xs">
            <input
              value={journalTitle}
              onChange={(event) => setJournalTitle(event.target.value)}
              placeholder={`Entry title (${activeSymbol})`}
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
            />
            <textarea
              value={journalPlan}
              onChange={(event) => setJournalPlan(event.target.value)}
              placeholder="Trade plan, catalyst, stop logic, invalidation level"
              className="w-full min-h-[76px] rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="muted">Conviction (1-100)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={journalConviction}
                  onChange={(event) => setJournalConviction(event.target.value)}
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="muted">Status</span>
                <select
                  value={journalStatus}
                  onChange={(event) => setJournalStatus(event.target.value as JournalEntryStatus)}
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2.5 py-2"
                >
                  <option value="Draft">Draft</option>
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Exited">Exited</option>
                </select>
              </label>
            </div>

            <button
              onClick={addJournalEntry}
              className="w-full rounded-lg bg-[var(--accent)] text-white font-semibold py-2"
            >
              Save Journal Entry
            </button>
          </div>

          <div className="mt-4 max-h-[260px] overflow-y-auto space-y-2">
            {journalEntries.length === 0 && (
              <div className="text-xs muted rounded-lg border border-black/10 dark:border-white/10 p-3 bg-white/70 dark:bg-black/20">
                No journal entries yet.
              </div>
            )}
            {journalEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-black/10 dark:border-white/10 p-3 bg-white/70 dark:bg-black/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {entry.symbol} · {entry.title}
                  </div>
                  <button
                    onClick={() => removeJournalEntry(entry.id)}
                    className="text-xs rounded-md border border-red-400/40 text-red-500 px-2 py-0.5"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-xs muted mt-1">{entry.plan}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="rounded-full badge-neutral px-2 py-0.5">Conviction {entry.conviction}%</span>
                  <span className="rounded-full badge-neutral px-2 py-0.5">{entry.status}</span>
                  <span className="muted">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
        className="surface-glass rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 badge-neutral">
            <AlertTriangle size={13} />
            Live APIs unavailable? Intelligent synthetic fallback stays active.
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 badge-neutral">
            <Sparkles size={13} />
            Rich signals: quote, quant stack, correlation map, smart screener, and strategy journaling.
          </span>
        </div>
      </motion.section>
    </div>
  );
}
