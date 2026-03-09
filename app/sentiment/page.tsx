"use client";

import { useState, useEffect, useCallback } from "react";
import { Gauge, RefreshCw, Loader2, ArrowUpDown, Sparkles } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import PageShell from "@/components/PageShell";
import {
  batchAnalyzeSentiment,
  getSentimentColor,
  type SentimentResult,
} from "@/lib/sentiment-engine";
import { streamAgent } from "@/lib/agents/run-agent";

function loadSymbols(): string[] {
  if (typeof window === "undefined") return [];
  let symbols: string[] = [];

  try {
    const watchlistRaw = localStorage.getItem("zentrade_watchlist_v1");
    if (watchlistRaw) {
      const wl = JSON.parse(watchlistRaw);
      if (Array.isArray(wl)) symbols.push(...wl);
    }
  } catch { /* ignore */ }

  try {
    const portfolioRaw = localStorage.getItem("zentrade_portfolio_v1");
    if (portfolioRaw) {
      const pf = JSON.parse(portfolioRaw);
      if (Array.isArray(pf)) {
        pf.forEach((item: string | { symbol?: string }) => {
          if (typeof item === "string") symbols.push(item);
          else if (item?.symbol) symbols.push(item.symbol);
        });
      }
    }
  } catch { /* ignore */ }

  symbols = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (symbols.length === 0) symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];
  return symbols;
}

function SentimentBar({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const color = getSentimentColor(score);
  return (
    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, #ef4444, #eab308, #22c55e)`,
          opacity: 0.85,
        }}
      />
      <div
        className="relative -mt-2.5 h-2.5 w-1 rounded-full"
        style={{
          marginLeft: `calc(${pct}% - 2px)`,
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
    </div>
  );
}

function SentimentCard({
  result,
  onDeepAnalysis,
  deepLoading,
  deepResult,
}: {
  result: SentimentResult;
  onDeepAnalysis: () => void;
  deepLoading: boolean;
  deepResult: string | null;
}) {
  const color = getSentimentColor(result.score);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {result.symbol}
          </span>
          <span
            className="text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            {result.label}
          </span>
        </div>
        <span className="text-lg font-bold" style={{ color }}>
          {result.score > 0 ? "+" : ""}{result.score}
        </span>
      </div>

      <SentimentBar score={result.score} />

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-muted)" }}>
        <span>{result.newsCount} articles analyzed</span>
        <span>{new Date(result.analyzedAt).toLocaleTimeString()}</span>
      </div>

      <button
        onClick={onDeepAnalysis}
        disabled={deepLoading}
        className="w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
        style={{ color: "var(--accent-2)", backgroundColor: "color-mix(in srgb, var(--accent-2) 10%, transparent)" }}
      >
        {deepLoading ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles size={12} />
            Deep AI Sentiment
          </>
        )}
      </button>

      {deepResult && (
        <div
          className="p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap"
          style={{
            color: "var(--ink-muted)",
            backgroundColor: "color-mix(in srgb, var(--ink) 4%, transparent)",
            borderLeft: "2px solid var(--accent-2)",
          }}
        >
          {deepResult}
        </div>
      )}
    </div>
  );
}

export default function SentimentPage() {
  const [results, setResults] = useState<SentimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"bullish" | "bearish">("bullish");
  const [deepStates, setDeepStates] = useState<Record<string, { loading: boolean; result: string | null }>>({});

  const analyze = useCallback(async () => {
    setLoading(true);
    const symbols = loadSymbols();
    const data = await batchAnalyzeSentiment(symbols);
    setResults(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    analyze();
  }, [analyze]);

  const sorted = [...results].sort((a, b) =>
    sortMode === "bullish" ? b.score - a.score : a.score - b.score,
  );

  const overallScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;
  const overallColor = getSentimentColor(overallScore);

  function handleDeepAnalysis(symbol: string) {
    setDeepStates((prev) => ({ ...prev, [symbol]: { loading: true, result: null } }));

    streamAgent(
      "news-sentinel",
      [symbol],
      "Provide deep sentiment analysis for this stock. Cover recent news sentiment, social media buzz, analyst opinions, and overall market sentiment. Be specific and concise.",
      () => { /* onChunk — we wait for done */ },
      (result) => {
        setDeepStates((prev) => ({
          ...prev,
          [symbol]: { loading: false, result: result.details || result.summary },
        }));
      },
    );
  }

  return (
    <AuthGuard>
      <PageShell
        title="Market Sentiment"
        actions={
          <button
            onClick={analyze}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ color: "var(--accent-2)", backgroundColor: "color-mix(in srgb, var(--accent-2) 12%, transparent)" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      >
        {loading && results.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--accent-2)" }} />
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Analyzing market sentiment...</p>
          </div>
        ) : (
          <>
            {/* Overall Sentiment */}
            <div className="stat-card p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                    Overall Market Sentiment
                  </p>
                  <p className="text-2xl font-bold mt-1" style={{ color: overallColor }}>
                    {overallScore > 0 ? "+" : ""}{overallScore}
                  </p>
                </div>
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `color-mix(in srgb, ${overallColor} 12%, transparent)` }}
                >
                  <Gauge size={24} style={{ color: overallColor }} />
                </div>
              </div>
              <SentimentBar score={overallScore} />
              <p className="text-xs mt-2" style={{ color: "var(--ink-muted)" }}>
                Based on {results.length} symbols / {results.reduce((s, r) => s + r.newsCount, 0)} news articles
              </p>
            </div>

            {/* Sort control */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold" style={{ color: "var(--ink-muted)" }}>
                {results.length} symbols analyzed
              </p>
              <button
                onClick={() => setSortMode((m) => (m === "bullish" ? "bearish" : "bullish"))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ color: "var(--ink-muted)", backgroundColor: "color-mix(in srgb, var(--ink-muted) 8%, transparent)" }}
              >
                <ArrowUpDown size={12} />
                {sortMode === "bullish" ? "Most Bullish First" : "Most Bearish First"}
              </button>
            </div>

            {/* Sentiment cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((result) => (
                <SentimentCard
                  key={result.symbol}
                  result={result}
                  onDeepAnalysis={() => handleDeepAnalysis(result.symbol)}
                  deepLoading={deepStates[result.symbol]?.loading ?? false}
                  deepResult={deepStates[result.symbol]?.result ?? null}
                />
              ))}
            </div>
          </>
        )}
      </PageShell>
    </AuthGuard>
  );
}
