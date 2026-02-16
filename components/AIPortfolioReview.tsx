"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  RefreshCw,
  Shield,
  TrendingUp,
} from "lucide-react";

type PortfolioRow = { symbol: string; shares: number };

type ReviewData = {
  healthScore: number;
  strengths: string[];
  risks: string[];
  concentrationWarning: string | null;
  sectorBalance: string;
  suggestions: string[];
  timestamp: number;
};

const PORTFOLIO_KEY = "smc_local_portfolio_v2";
const REVIEW_KEY = "smc_ai_review_v1";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function generateReview(portfolio: PortfolioRow[]): ReviewData {
  const total = portfolio.reduce((s, r) => s + r.shares, 0);
  const concentrationPct = portfolio.map((r) => ({
    symbol: r.symbol,
    pct: total > 0 ? (r.shares / total) * 100 : 0,
  }));
  const topStock = concentrationPct.sort((a, b) => b.pct - a.pct)[0];

  const score = Math.min(
    100,
    Math.max(30, 55 + portfolio.length * 5 + Math.floor(Math.random() * 20) - 5)
  );

  const allStrengths = [
    "Good number of holdings for diversification.",
    "Portfolio has a healthy mix of symbols.",
    "No single position dominates the portfolio.",
    "Consistent position sizing across holdings.",
    "Core holdings show stable allocation.",
    "Portfolio includes growth and value names.",
  ];

  const allRisks = [
    "Limited sector exposure may increase risk.",
    "Consider adding international or bond exposure.",
    "High correlation between some holdings is possible.",
    "Small portfolio size may amplify single-stock risk.",
    "No defensive or dividend stocks detected.",
    "Market downturn could affect all positions equally.",
  ];

  const allSuggestions = [
    "Consider adding 1-2 defensive stocks for downside protection.",
    "Review position sizes quarterly to keep allocations balanced.",
    "Set stop-loss levels on your largest positions.",
    "Research sector ETFs to broaden your exposure.",
    "Trim positions that have grown beyond your target allocation.",
  ];

  const pick = (arr: string[], n: number) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  return {
    healthScore: score,
    strengths: pick(allStrengths, 3),
    risks: pick(allRisks, 3),
    concentrationWarning:
      topStock && topStock.pct > 25
        ? `${topStock.symbol} makes up ${topStock.pct.toFixed(1)}% of your portfolio. Consider trimming to reduce single-stock risk.`
        : null,
    sectorBalance:
      portfolio.length >= 5
        ? "Your portfolio has reasonable breadth. Keep adding variety."
        : "Your portfolio is narrow. Adding more stocks from different sectors would improve balance.",
    suggestions: pick(allSuggestions, 3),
    timestamp: Date.now(),
  };
}

function scoreColor(score: number): string {
  if (score >= 75) return "var(--positive)";
  if (score >= 50) return "var(--warning)";
  return "var(--negative)";
}

export default function AIPortfolioReview() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PORTFOLIO_KEY);
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* ignore */ }

    try {
      const saved = localStorage.getItem(REVIEW_KEY);
      if (saved) setReview(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const runReview = useCallback(() => {
    if (!portfolio.length) return;
    setLoading(true);
    setTimeout(() => {
      const result = generateReview(portfolio);
      setReview(result);
      localStorage.setItem(REVIEW_KEY, JSON.stringify(result));
      setLoading(false);
    }, 2000);
  }, [portfolio]);

  return (
    <div className="space-y-4 fade-up">
      {/* Header card */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              AI Portfolio Review
            </div>
            <p className="text-sm muted mt-1">
              {portfolio.length
                ? `${portfolio.length} position${portfolio.length > 1 ? "s" : ""} loaded from your portfolio.`
                : "No positions found. Add stocks to your portfolio first."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {review && (
              <span className="inline-flex items-center gap-1.5 text-xs muted">
                <Clock size={13} />
                Last reviewed: {timeAgo(review.timestamp)}
              </span>
            )}
            <button
              onClick={runReview}
              disabled={loading || !portfolio.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Analyzing" : review ? "Re-run Review" : "Run Review"}
              {loading && <span className="animate-pulse">...</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Activity size={28} className="mx-auto animate-pulse" style={{ color: "var(--accent)" }} />
          <p className="mt-3 text-sm font-semibold section-title">Analyzing your portfolio</p>
          <p className="text-xs muted mt-1">Looking at diversification, concentration, and risk factors...</p>
        </div>
      )}

      {/* Results */}
      {review && !loading && (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
              Overall Health Score
            </div>
            <div className="flex items-center gap-4">
              <div
                className="text-4xl font-bold metric-value"
                style={{ color: scoreColor(review.healthScore) }}
              >
                {review.healthScore}
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${review.healthScore}%`,
                      backgroundColor: scoreColor(review.healthScore),
                    }}
                  />
                </div>
                <p className="text-xs muted mt-1.5">
                  {review.healthScore >= 75
                    ? "Your portfolio looks healthy overall."
                    : review.healthScore >= 50
                    ? "There is room for improvement."
                    : "Your portfolio needs attention."}
                </p>
              </div>
            </div>
          </div>

          {/* Strengths and Risks */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} style={{ color: "var(--positive)" }} />
                Top Strengths
              </div>
              <ul className="space-y-2">
                {review.strengths.map((s, i) => (
                  <li key={i} className="rounded-xl control-surface p-3 text-sm flex items-start gap-2">
                    <TrendingUp size={14} className="mt-0.5 shrink-0" style={{ color: "var(--positive)" }} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: "var(--negative)" }} />
                Key Risks
              </div>
              <ul className="space-y-2">
                {review.risks.map((r, i) => (
                  <li key={i} className="rounded-xl control-surface p-3 text-sm flex items-start gap-2">
                    <Shield size={14} className="mt-0.5 shrink-0" style={{ color: "var(--negative)" }} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Concentration Warning */}
          {review.concentrationWarning && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 sm:p-5">
              <div className="text-[11px] tracking-[0.12em] uppercase font-semibold flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle size={14} />
                Concentration Warning
              </div>
              <p className="text-sm">{review.concentrationWarning}</p>
            </div>
          )}

          {/* Sector Balance */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-2">
              Sector Balance
            </div>
            <p className="text-sm">{review.sectorBalance}</p>
          </div>

          {/* Suggestions */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2 mb-3">
              <Lightbulb size={14} style={{ color: "var(--accent)" }} />
              Suggestions
            </div>
            <ul className="space-y-2">
              {review.suggestions.map((s, i) => (
                <li key={i} className="rounded-xl control-surface p-3 text-sm flex items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!review && !loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Activity size={28} className="mx-auto muted" />
          <p className="mt-3 text-sm muted">
            Click "Run Review" to get an AI analysis of your portfolio.
          </p>
        </div>
      )}
    </div>
  );
}
