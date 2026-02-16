"use client";

import { useCallback, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Newspaper,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Headline = {
  title: string;
  sentiment: "Bullish" | "Neutral" | "Bearish";
  source: string;
};

type SentimentData = {
  symbol: string;
  overall: "Bullish" | "Neutral" | "Bearish";
  score: number;
  trend: "Improving" | "Stable" | "Declining";
  confidence: number;
  sourceCount: number;
  headlines: Headline[];
};

const POPULAR_STOCKS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META"];

const HEADLINE_POOL: Record<string, Headline[]> = {
  default: [
    { title: "Analysts raise price targets ahead of earnings season", sentiment: "Bullish", source: "MarketWatch" },
    { title: "Company beats revenue expectations for Q4", sentiment: "Bullish", source: "Bloomberg" },
    { title: "Stock holds steady despite broader market pullback", sentiment: "Neutral", source: "Reuters" },
    { title: "New product launch receives mixed reviews from critics", sentiment: "Neutral", source: "CNBC" },
    { title: "Insider selling activity raises questions among investors", sentiment: "Bearish", source: "Barron's" },
    { title: "Strong demand reported in key growth markets", sentiment: "Bullish", source: "WSJ" },
    { title: "Supply chain concerns could weigh on margins next quarter", sentiment: "Bearish", source: "Financial Times" },
    { title: "Management reaffirms full-year guidance at conference", sentiment: "Bullish", source: "SeekingAlpha" },
    { title: "Regulatory headwinds create uncertainty for expansion plans", sentiment: "Bearish", source: "Reuters" },
    { title: "Trading volume spikes as institutional investors rebalance", sentiment: "Neutral", source: "Bloomberg" },
  ],
};

function generateSentiment(symbol: string): SentimentData {
  const score = Math.floor(Math.random() * 201) - 100;
  const overall: SentimentData["overall"] =
    score > 25 ? "Bullish" : score < -25 ? "Bearish" : "Neutral";
  const trends: SentimentData["trend"][] = ["Improving", "Stable", "Declining"];
  const trend = trends[Math.floor(Math.random() * 3)];
  const confidence = Math.floor(Math.random() * 40) + 55;
  const sourceCount = Math.floor(Math.random() * 20) + 8;

  const pool = [...HEADLINE_POOL.default].sort(() => Math.random() - 0.5);
  const headlines = pool.slice(0, 5).map((h) => ({
    ...h,
    title: h.title.replace("Company", symbol).replace("Stock", symbol),
  }));

  return { symbol, overall, score, trend, confidence, sourceCount, headlines };
}

function sentimentColor(s: "Bullish" | "Neutral" | "Bearish"): string {
  if (s === "Bullish") return "var(--positive)";
  if (s === "Bearish") return "var(--negative)";
  return "var(--warning)";
}

function sentimentBadge(s: "Bullish" | "Neutral" | "Bearish") {
  const cls =
    s === "Bullish"
      ? "badge-positive"
      : s === "Bearish"
      ? "badge-negative"
      : "badge-neutral";
  return cls;
}

function TrendIcon({ trend }: { trend: SentimentData["trend"] }) {
  if (trend === "Improving") return <ArrowUpRight size={14} style={{ color: "var(--positive)" }} />;
  if (trend === "Declining") return <ArrowDownRight size={14} style={{ color: "var(--negative)" }} />;
  return <ArrowRight size={14} style={{ color: "var(--warning)" }} />;
}

export default function NewsSentiment() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback((sym: string) => {
    const normalized = sym.trim().toUpperCase();
    if (!normalized) return;
    setQuery(normalized);
    setLoading(true);
    setTimeout(() => {
      setData(generateSentiment(normalized));
      setLoading(false);
    }, 800);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  const gaugeOffset = data ? ((data.score + 100) / 200) * 100 : 50;

  return (
    <div className="space-y-4 fade-up">
      {/* Search */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
          Look Up Sentiment
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Enter stock symbol (e.g. AAPL)"
              className="w-full rounded-lg control-surface bg-white/75 dark:bg-black/25 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Check Sentiment"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[11px] muted mr-1 self-center">Popular:</span>
          {POPULAR_STOCKS.map((s) => (
            <button
              key={s}
              onClick={() => lookup(s)}
              className="rounded-md control-surface px-2 py-1 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Newspaper size={28} className="mx-auto animate-pulse" style={{ color: "var(--accent)" }} />
          <p className="mt-3 text-sm muted">Scanning headlines for {query}...</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4">
          {/* Overview cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                Overall Sentiment
              </div>
              <div className="mt-2 flex items-center gap-2">
                {data.overall === "Bullish" ? (
                  <TrendingUp size={16} style={{ color: sentimentColor(data.overall) }} />
                ) : data.overall === "Bearish" ? (
                  <TrendingDown size={16} style={{ color: sentimentColor(data.overall) }} />
                ) : (
                  <BarChart3 size={16} style={{ color: sentimentColor(data.overall) }} />
                )}
                <span
                  className="text-lg font-bold"
                  style={{ color: sentimentColor(data.overall) }}
                >
                  {data.overall}
                </span>
              </div>
            </div>

            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                Sentiment Score
              </div>
              <div
                className="mt-2 text-2xl font-bold metric-value"
                style={{ color: sentimentColor(data.overall) }}
              >
                {data.score > 0 ? "+" : ""}
                {data.score}
              </div>
            </div>

            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                Trend
              </div>
              <div className="mt-2 flex items-center gap-2 font-semibold text-sm">
                <TrendIcon trend={data.trend} />
                {data.trend}
              </div>
            </div>

            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                Confidence
              </div>
              <div className="mt-2 text-lg font-bold metric-value">{data.confidence}%</div>
              <div className="text-[11px] muted">{data.sourceCount} sources analyzed</div>
            </div>
          </div>

          {/* Gauge */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
              Sentiment Gauge for {data.symbol}
            </div>
            <div className="relative h-4 rounded-full overflow-hidden">
              <div className="absolute inset-0 flex">
                <div className="flex-1 bg-[var(--negative)]" style={{ opacity: 0.35 }} />
                <div className="flex-1 bg-[var(--warning)]" style={{ opacity: 0.35 }} />
                <div className="flex-1 bg-[var(--positive)]" style={{ opacity: 0.35 }} />
              </div>
              <div
                className="absolute top-0 h-full w-1.5 rounded-full bg-white shadow-md transition-all duration-500"
                style={{ left: `calc(${gaugeOffset}% - 3px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] muted mt-1">
              <span>Bearish (-100)</span>
              <span>Neutral (0)</span>
              <span>Bullish (+100)</span>
            </div>
          </div>

          {/* Headlines */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
              Recent Headlines
            </div>
            <ul className="space-y-2">
              {data.headlines.map((h, i) => (
                <li
                  key={i}
                  className="rounded-xl control-surface p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">{h.title}</p>
                    <p className="text-[11px] muted mt-0.5">{h.source}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${sentimentBadge(
                      h.sentiment
                    )}`}
                  >
                    {h.sentiment}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Search size={28} className="mx-auto muted" />
          <p className="mt-3 text-sm muted">
            Search for a stock symbol or pick one above to see its news sentiment.
          </p>
        </div>
      )}
    </div>
  );
}
