export type SentimentResult = {
  symbol: string;
  score: number;
  label: "Very Bearish" | "Bearish" | "Neutral" | "Bullish" | "Very Bullish";
  newsCount: number;
  analyzedAt: string;
};

const CACHE_KEY = "zentrade_sentiment_cache_v1";

const BULLISH_KEYWORDS = [
  "surge", "rally", "beat", "upgrade", "growth", "profit", "record",
  "buy", "outperform", "bullish", "positive",
];

const BEARISH_KEYWORDS = [
  "crash", "drop", "miss", "downgrade", "loss", "decline", "cut",
  "sell", "underperform", "bearish", "negative", "warning", "risk",
];

export function getSentimentLabel(score: number): SentimentResult["label"] {
  if (score <= -60) return "Very Bearish";
  if (score <= -20) return "Bearish";
  if (score <= 20) return "Neutral";
  if (score <= 60) return "Bullish";
  return "Very Bullish";
}

export function getSentimentColor(score: number): string {
  if (score <= -60) return "#ef4444";
  if (score <= -20) return "#f97316";
  if (score <= 20) return "#eab308";
  if (score <= 60) return "#22c55e";
  return "#16a34a";
}

function loadCache(): Record<string, SentimentResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveCache(cache: Record<string, SentimentResult>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export function getCachedSentiment(symbol: string): SentimentResult | null {
  const cache = loadCache();
  return cache[symbol.toUpperCase()] || null;
}

export async function analyzeSentiment(symbol: string): Promise<SentimentResult> {
  const upperSymbol = symbol.toUpperCase();

  let articles: { headline?: string; title?: string; summary?: string }[] = [];
  try {
    const res = await fetch(`/api/stocks/news?symbol=${upperSymbol}`);
    if (res.ok) {
      const data = await res.json();
      articles = data.news || data.articles || data.data || [];
    }
  } catch { /* continue with empty articles */ }

  let totalScore = 0;
  const newsCount = articles.length;

  for (const article of articles) {
    const text = [
      article.headline || article.title || "",
      article.summary || "",
    ].join(" ").toLowerCase();

    for (const kw of BULLISH_KEYWORDS) {
      if (text.includes(kw)) totalScore += 8;
    }
    for (const kw of BEARISH_KEYWORDS) {
      if (text.includes(kw)) totalScore -= 8;
    }
  }

  // Clamp score to -100..100
  const clampedScore = Math.max(-100, Math.min(100, totalScore));

  const result: SentimentResult = {
    symbol: upperSymbol,
    score: clampedScore,
    label: getSentimentLabel(clampedScore),
    newsCount,
    analyzedAt: new Date().toISOString(),
  };

  // Cache result
  const cache = loadCache();
  cache[upperSymbol] = result;
  saveCache(cache);

  return result;
}

export async function batchAnalyzeSentiment(symbols: string[]): Promise<SentimentResult[]> {
  const results: SentimentResult[] = [];
  for (const symbol of symbols) {
    const result = await analyzeSentiment(symbol);
    results.push(result);
  }
  return results;
}
