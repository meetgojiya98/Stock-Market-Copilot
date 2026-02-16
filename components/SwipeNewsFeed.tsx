"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ThumbsDown, ThumbsUp, TrendingDown, TrendingUp } from "lucide-react";

type NewsCard = {
  id: string;
  headline: string;
  source: string;
  date: string;
  summary: string;
};

type Vote = {
  headline: string;
  vote: "bullish" | "bearish";
  timestamp: number;
};

const VOTES_KEY = "smc_sentiment_votes_v1";

const SYNTHETIC_NEWS: NewsCard[] = [
  { id: "1", headline: "Fed Signals Steady Rates Through Q2", source: "Reuters", date: "2026-02-16", summary: "Federal Reserve officials indicate no rate changes expected in the near term as inflation data remains stable." },
  { id: "2", headline: "Tech Giants Report Record Cloud Revenue", source: "Bloomberg", date: "2026-02-15", summary: "Microsoft, Amazon, and Google all exceeded cloud revenue estimates, driving sector-wide optimism." },
  { id: "3", headline: "Oil Prices Surge on Supply Concerns", source: "CNBC", date: "2026-02-15", summary: "Crude oil jumped 4.2% following reports of production cuts from major OPEC+ members." },
  { id: "4", headline: "Housing Starts Fall Below Expectations", source: "WSJ", date: "2026-02-14", summary: "New residential construction dropped 8% month-over-month, missing analyst forecasts." },
  { id: "5", headline: "Semiconductor Stocks Rally on AI Demand", source: "MarketWatch", date: "2026-02-14", summary: "NVDA, AMD, and AVGO surged as AI infrastructure spending continues to accelerate globally." },
  { id: "6", headline: "Consumer Spending Beats Estimates", source: "Reuters", date: "2026-02-13", summary: "US retail sales rose 0.6% in January, signaling resilient consumer demand despite inflation." },
  { id: "7", headline: "Bitcoin Crosses $95K Milestone", source: "CoinDesk", date: "2026-02-13", summary: "Cryptocurrency markets rally as institutional adoption grows and ETF inflows hit new records." },
  { id: "8", headline: "EV Sales Growth Slows in North America", source: "Bloomberg", date: "2026-02-12", summary: "Electric vehicle sales grew 12% YoY, down from 28% growth in the prior year quarter." },
  { id: "9", headline: "Treasury Yields Rise on Inflation Data", source: "FT", date: "2026-02-12", summary: "The 10-year yield climbed to 4.35% after core CPI came in slightly above expectations." },
  { id: "10", headline: "Pharma Sector Dips on Drug Pricing Bill", source: "CNBC", date: "2026-02-11", summary: "Healthcare stocks fell broadly after new legislation aimed at capping drug prices advanced in Congress." },
  { id: "11", headline: "Small Cap Stocks Outperform Large Caps", source: "Barrons", date: "2026-02-11", summary: "The Russell 2000 gained 2.3% this week versus 0.8% for the S&P 500, reversing a recent trend." },
  { id: "12", headline: "Global Supply Chain Pressures Ease Further", source: "Reuters", date: "2026-02-10", summary: "Shipping costs and delivery times continue to normalize, supporting manufacturing margins." },
  { id: "13", headline: "Earnings Season Wraps with 72% Beat Rate", source: "FactSet", date: "2026-02-10", summary: "Q4 earnings exceeded estimates for 72% of S&P 500 companies, above the 5-year average." },
  { id: "14", headline: "Chinese Markets Rebound on Stimulus Hopes", source: "Bloomberg", date: "2026-02-09", summary: "Hong Kong and Shanghai indices rallied after Beijing announced new economic support measures." },
  { id: "15", headline: "IPO Market Heats Up with $12B in Filings", source: "WSJ", date: "2026-02-09", summary: "Several high-profile companies filed for public offerings, signaling renewed capital markets confidence." },
];

function loadVotes(): Vote[] {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch { /* */ }
  return [];
}

function saveVotes(votes: Vote[]) {
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

export default function SwipeNewsFeed({ compact = false }: { compact?: boolean }) {
  const [cards, setCards] = useState<NewsCard[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCards(SYNTHETIC_NEWS);
    setVotes(loadVotes());
  }, []);

  const bullishCount = votes.filter((v) => v.vote === "bullish").length;
  const bearishCount = votes.filter((v) => v.vote === "bearish").length;
  const totalVotes = bullishCount + bearishCount;
  const bullishPct = totalVotes > 0 ? Math.round((bullishCount / totalVotes) * 100) : 50;

  const currentCard = cards[currentIdx] ?? null;
  const exhausted = currentIdx >= cards.length;

  const handleVote = useCallback((vote: "bullish" | "bearish") => {
    if (!currentCard) return;
    const newVote: Vote = { headline: currentCard.headline, vote, timestamp: Date.now() };
    const updated = [...votes, newVote];
    setVotes(updated);
    saveVotes(updated);

    setExitDir(vote === "bullish" ? "right" : "left");
    setTimeout(() => {
      setCurrentIdx((i) => i + 1);
      setExitDir(null);
      setDragX(0);
    }, 250);
  }, [currentCard, votes]);

  const handleSkip = useCallback(() => {
    setCurrentIdx((i) => i + 1);
    setDragX(0);
  }, []);

  const handleReset = () => {
    setCurrentIdx(0);
    setDragX(0);
    setExitDir(null);
  };

  // Touch/mouse handlers
  const onStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    setDragging(true);
  }, []);

  const onMove = useCallback((clientX: number) => {
    if (!dragging) return;
    setDragX(clientX - startXRef.current);
  }, [dragging]);

  const onEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 100) {
      handleVote("bullish");
    } else if (dragX < -100) {
      handleVote("bearish");
    } else {
      setDragX(0);
    }
  }, [dragging, dragX, handleVote]);

  const rotation = dragX * 0.08;
  const opacity = Math.max(0.3, 1 - Math.abs(dragX) / 300);
  const threshold = Math.abs(dragX) > 60;

  return (
    <div className={`space-y-4 fade-up ${compact ? "" : ""}`}>
      {/* Sentiment gauge */}
      <div className="card-elevated rounded-xl p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: "var(--positive)" }} />
          <span className="text-xs font-semibold">{bullishPct}% Bullish</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${bullishPct}%`, background: "linear-gradient(90deg, var(--positive), var(--accent))" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{100 - bullishPct}% Bearish</span>
          <TrendingDown size={14} style={{ color: "var(--negative)" }} />
        </div>
      </div>

      {/* Card stack */}
      <div className={`relative ${compact ? "h-[200px]" : "h-[280px]"} mx-auto max-w-md`}>
        {exhausted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-semibold muted">No more news</div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2 text-xs font-semibold"
            >
              <RefreshCw size={13} /> Refresh Feed
            </button>
          </div>
        ) : (
          <>
            {/* Background cards */}
            {[2, 1].map((offset) => {
              const idx = currentIdx + offset;
              if (idx >= cards.length) return null;
              return (
                <div
                  key={cards[idx].id}
                  className="absolute inset-x-0 top-0 card-elevated rounded-xl p-4"
                  style={{
                    transform: `scale(${1 - offset * 0.04}) translateY(${offset * 8}px)`,
                    zIndex: 10 - offset,
                    opacity: 0.6 - offset * 0.2,
                  }}
                >
                  <div className="text-sm font-semibold line-clamp-2">{cards[idx].headline}</div>
                </div>
              );
            })}

            {/* Active card */}
            {currentCard && (
              <div
                ref={cardRef}
                className="swipe-card absolute inset-x-0 top-0 card-elevated rounded-xl p-4 space-y-3 z-20"
                style={{
                  transform: exitDir
                    ? `translate3d(${exitDir === "right" ? "120%" : "-120%"}, 0, 0) rotate(${exitDir === "right" ? 15 : -15}deg)`
                    : `translate3d(${dragX}px, 0, 0) rotate(${rotation}deg)`,
                  opacity: exitDir ? 0 : opacity,
                  transition: dragging ? "none" : "transform 0.25s ease, opacity 0.25s ease",
                }}
                onMouseDown={(e) => onStart(e.clientX)}
                onMouseMove={(e) => onMove(e.clientX)}
                onMouseUp={onEnd}
                onMouseLeave={() => { if (dragging) onEnd(); }}
                onTouchStart={(e) => onStart(e.touches[0].clientX)}
                onTouchMove={(e) => onMove(e.touches[0].clientX)}
                onTouchEnd={onEnd}
              >
                {/* Swipe indicators */}
                {threshold && dragX > 0 && (
                  <div className="absolute top-3 left-3 rounded-lg border-2 border-[var(--positive)] px-3 py-1 text-sm font-bold text-[var(--positive)] -rotate-12">
                    BULLISH
                  </div>
                )}
                {threshold && dragX < 0 && (
                  <div className="absolute top-3 right-3 rounded-lg border-2 border-[var(--negative)] px-3 py-1 text-sm font-bold text-[var(--negative)] rotate-12">
                    BEARISH
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold muted uppercase tracking-wider">{currentCard.source}</span>
                  <span className="text-[10px] muted">{currentCard.date}</span>
                </div>
                <h4 className={`font-semibold leading-snug ${compact ? "text-sm" : "text-base"}`}>{currentCard.headline}</h4>
                <p className="text-xs muted leading-relaxed">{currentCard.summary}</p>

                {/* Button controls */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleVote("bearish")}
                    className="rounded-full border border-red-400/50 bg-red-500/10 p-2.5 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <ThumbsDown size={16} />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="rounded-full border border-[var(--surface-border)] p-2 muted text-xs"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleVote("bullish")}
                    className="rounded-full border border-emerald-400/50 bg-emerald-500/10 p-2.5 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                  >
                    <ThumbsUp size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="text-center text-[11px] muted">
        {currentIdx}/{cards.length} reviewed · {totalVotes} total votes
      </div>
    </div>
  );
}
