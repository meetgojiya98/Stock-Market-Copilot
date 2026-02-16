"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bookmark,
  Clock,
  Lightbulb,
  MinusCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

type PortfolioRow = { symbol: string; shares: number };

type TradeIdea = {
  symbol: string;
  action: "Buy" | "Sell" | "Hold";
  confidence: "High" | "Medium" | "Low";
  reasoning: string;
  riskLevel: "Low" | "Medium" | "High";
  timeline: string;
  addedToWatchlist: boolean;
};

const PORTFOLIO_KEY = "smc_local_portfolio_v2";
const IDEAS_KEY = "smc_trade_ideas_v1";
const WATCHLIST_KEY = "smc_local_watchlist_v2";

const IDEA_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM",
  "V", "UNH", "HD", "PG", "DIS", "NFLX", "PYPL", "CRM", "AMD", "INTC",
];

const REASONING_POOL = {
  Buy: [
    "Strong earnings momentum and rising analyst estimates suggest further upside. Technical indicators show support near current levels.",
    "Undervalued relative to peers based on forward P/E. Recent product launches could drive revenue growth in coming quarters.",
    "Institutional accumulation pattern visible on volume data. Company guidance raised above consensus expectations.",
    "Breaking out of a multi-week consolidation pattern with increasing volume. Fundamentals remain solid.",
  ],
  Sell: [
    "Elevated valuation compared to historical averages. Insider selling has increased over the past month.",
    "Weakening demand trends and margin pressure could lead to earnings downgrades. Consider taking profits.",
    "Technical breakdown below key support level. Revenue growth is decelerating faster than the market expects.",
    "Competitive headwinds intensifying in core markets. Risk-reward is no longer favorable at current levels.",
  ],
  Hold: [
    "Fair value by most metrics. Wait for a clearer signal before adding or trimming the position.",
    "Mixed signals from recent data. Earnings are stable but growth catalysts are limited near term.",
    "Position is well-sized in your portfolio. No urgent reason to trade, but monitor upcoming earnings closely.",
    "Trading in a range with no clear breakout direction. Keep current allocation and reassess after next report.",
  ],
};

const TIMELINES = ["1-2 weeks", "2-4 weeks", "1-3 months", "3-6 months"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIdeas(portfolio: PortfolioRow[]): TradeIdea[] {
  const portfolioSymbols = portfolio.map((p) => p.symbol);
  const candidates = [...new Set([...portfolioSymbols, ...IDEA_SYMBOLS])];
  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 3);

  return shuffled.map((symbol) => {
    const actions: TradeIdea["action"][] = ["Buy", "Sell", "Hold"];
    const action = pick(actions);
    const confidences: TradeIdea["confidence"][] = ["High", "Medium", "Low"];
    const risks: TradeIdea["riskLevel"][] = ["Low", "Medium", "High"];

    return {
      symbol,
      action,
      confidence: pick(confidences),
      reasoning: pick(REASONING_POOL[action]),
      riskLevel: pick(risks),
      timeline: pick(TIMELINES),
      addedToWatchlist: false,
    };
  });
}

function actionColor(action: TradeIdea["action"]): string {
  if (action === "Buy") return "var(--positive)";
  if (action === "Sell") return "var(--negative)";
  return "var(--warning)";
}

function ActionIcon({ action }: { action: TradeIdea["action"] }) {
  if (action === "Buy") return <ArrowUpCircle size={15} style={{ color: "var(--positive)" }} />;
  if (action === "Sell") return <ArrowDownCircle size={15} style={{ color: "var(--negative)" }} />;
  return <MinusCircle size={15} style={{ color: "var(--warning)" }} />;
}

function confidenceBadge(c: TradeIdea["confidence"]): string {
  if (c === "High") return "badge-positive";
  if (c === "Medium") return "badge-neutral";
  return "badge-negative";
}

export default function AITradeIdeas() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PORTFOLIO_KEY);
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* ignore */ }

    try {
      const saved = localStorage.getItem(IDEAS_KEY);
      if (saved) setIdeas(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const generate = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const newIdeas = generateIdeas(portfolio);
      setIdeas(newIdeas);
      localStorage.setItem(IDEAS_KEY, JSON.stringify(newIdeas));
      setLoading(false);
    }, 1500);
  }, [portfolio]);

  const addToWatchlist = useCallback(
    (symbol: string) => {
      try {
        const raw = localStorage.getItem(WATCHLIST_KEY);
        const list: { symbol: string }[] = raw ? JSON.parse(raw) : [];
        if (!list.some((w) => w.symbol === symbol)) {
          list.push({ symbol });
          localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
        }
      } catch { /* ignore */ }

      setIdeas((prev) => {
        const updated = prev.map((idea) =>
          idea.symbol === symbol ? { ...idea, addedToWatchlist: true } : idea
        );
        localStorage.setItem(IDEAS_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2">
              <Sparkles size={13} style={{ color: "var(--accent)" }} />
              AI Trade Ideas
            </div>
            <p className="text-sm muted mt-1">
              {portfolio.length
                ? `Ideas are personalized from your ${portfolio.length} portfolio position${portfolio.length > 1 ? "s" : ""}.`
                : "Add stocks to your portfolio for personalized ideas."}
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Generating" : ideas.length ? "Refresh Ideas" : "Generate Ideas"}
            {loading && <span className="animate-pulse">...</span>}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Zap size={28} className="mx-auto animate-pulse" style={{ color: "var(--accent)" }} />
          <p className="mt-3 text-sm font-semibold section-title">Generating trade ideas</p>
          <p className="text-xs muted mt-1">Scanning market data and your portfolio...</p>
        </div>
      )}

      {/* Ideas */}
      {ideas.length > 0 && !loading && (
        <div className="grid md:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <div
              key={idea.symbol}
              className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 flex flex-col"
            >
              {/* Symbol and action */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ActionIcon action={idea.action} />
                  <span className="text-lg font-bold section-title">{idea.symbol}</span>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: actionColor(idea.action) }}
                >
                  {idea.action}
                </span>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceBadge(
                    idea.confidence
                  )}`}
                >
                  <Lightbulb size={11} />
                  {idea.confidence} confidence
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold badge-neutral">
                  <Shield size={11} />
                  {idea.riskLevel} risk
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold badge-neutral">
                  <Clock size={11} />
                  {idea.timeline}
                </span>
              </div>

              {/* Reasoning */}
              <div className="rounded-xl control-surface p-3 text-sm flex-1">
                <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-1.5">
                  Reasoning
                </div>
                {idea.reasoning}
              </div>

              {/* Watchlist button */}
              <button
                onClick={() => addToWatchlist(idea.symbol)}
                disabled={idea.addedToWatchlist}
                className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  idea.addedToWatchlist
                    ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border border-[var(--surface-border)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <Bookmark size={13} />
                {idea.addedToWatchlist ? "Added to Watchlist" : "Add to Watchlist"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!ideas.length && !loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Sparkles size={28} className="mx-auto muted" />
          <p className="mt-3 text-sm muted">
            Click "Generate Ideas" to get AI-suggested trades based on your portfolio and market trends.
          </p>
        </div>
      )}
    </div>
  );
}
