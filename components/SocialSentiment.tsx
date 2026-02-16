"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Hash,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";

type SourceData = {
  name: string;
  bullishPct: number;
  bearishPct: number;
  mentions: number;
  trending: string[];
};

type Mention = {
  id: string;
  username: string;
  source: string;
  text: string;
  sentiment: "bullish" | "bearish" | "neutral";
  timeAgo: string;
};

type SentimentResult = {
  symbol: string;
  overallScore: number; // 0-100
  sources: SourceData[];
  mentions: Mention[];
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const REDDIT_USERS = ["DeepValue42", "WSBAutist", "StockNerd99", "TendiesChef", "DiamondHands_", "OptionsYOLO", "BullishBear23", "MarketMaven"];
const TWITTER_USERS = ["@TraderJoe", "@StockPicks", "@WallStWolf", "@MarketMinds", "@EquityEdge", "@BullRunAI", "@ChartWhisper", "@AlphaSeeker"];
const STOCKTWITS_USERS = ["AlgoTrader1", "ValueHunter", "MomentumKing", "SwingMaster", "DayTraderPro", "FundyGuru", "TechChartist", "EarningsPlay"];

const BULLISH_SNIPPETS = [
  "Breaking out of the channel, looking strong above resistance",
  "Earnings beat incoming, institutional accumulation is clear",
  "This dip is a gift. Loading up more shares here",
  "Massive call option flow detected. Smart money is bullish",
  "Revenue growth trajectory is insane. PT $XXX easy",
  "Cup and handle formation on the daily. Breakout imminent",
  "Just added to my position. Fundamentals are solid",
];

const BEARISH_SNIPPETS = [
  "Overbought on every timeframe. Expecting a pullback soon",
  "Insider selling is concerning. Reducing my position",
  "Competition is heating up, margins are going to compress",
  "RSI divergence on the weekly chart. Distribution phase",
  "Valuation is stretched here. Better entries ahead",
  "Put volume spiking, someone knows something",
  "Missed estimates last quarter, guidance was weak too",
];

const NEUTRAL_SNIPPETS = [
  "Watching this level closely. Could go either way",
  "Consolidating in a range. Waiting for a catalyst",
  "Mixed signals from the technicals. Staying on the sidelines",
];

const TRENDING_TAGS_POOL: Record<string, string[]> = {
  AAPL: ["#AppleEvent", "#iPhone17", "#AAPL", "#AppleAI", "#VisionPro", "#TimCook"],
  MSFT: ["#Microsoft", "#Azure", "#Copilot", "#MSFT", "#AI", "#WindowsAI"],
  GOOGL: ["#Google", "#Gemini", "#GOOGL", "#SearchAI", "#Waymo", "#Alphabet"],
  AMZN: ["#Amazon", "#AWS", "#Prime", "#AMZN", "#Alexa", "#ECommerce"],
  NVDA: ["#NVIDIA", "#CUDA", "#H100", "#NVDA", "#AIChips", "#Blackwell"],
  TSLA: ["#Tesla", "#Cybertruck", "#FSD", "#TSLA", "#ElonMusk", "#EVs"],
  META: ["#Meta", "#Threads", "#Reels", "#META", "#LlamaAI", "#Metaverse"],
  JPM: ["#JPMorgan", "#Banking", "#JPM", "#WallStreet", "#Rates", "#Financials"],
};

const DEFAULT_TAGS = ["#Stocks", "#Trading", "#Earnings", "#Markets", "#Investing", "#WallStreet"];

function generateSentimentData(symbol: string): SentimentResult {
  const seed = symbol.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 3), 17);
  const rand = seededRandom(seed);

  // Generate source-level data
  const redditBull = Math.round(35 + rand() * 45); // 35-80
  const twitterBull = Math.round(30 + rand() * 50); // 30-80
  const stocktwitsBull = Math.round(40 + rand() * 40); // 40-80

  const trendingPool = TRENDING_TAGS_POOL[symbol] || DEFAULT_TAGS;

  const sources: SourceData[] = [
    {
      name: "Reddit",
      bullishPct: redditBull,
      bearishPct: 100 - redditBull,
      mentions: Math.round(800 + rand() * 4200),
      trending: trendingPool.slice(0, 3).concat(["#WallStreetBets", "#Investing"]),
    },
    {
      name: "Twitter / X",
      bullishPct: twitterBull,
      bearishPct: 100 - twitterBull,
      mentions: Math.round(1200 + rand() * 8800),
      trending: trendingPool.slice(1, 4).concat(["#FinTwit", "#Markets"]),
    },
    {
      name: "StockTwits",
      bullishPct: stocktwitsBull,
      bearishPct: 100 - stocktwitsBull,
      mentions: Math.round(500 + rand() * 3500),
      trending: trendingPool.slice(0, 2).concat(["#Trading", "#Watchlist"]),
    },
  ];

  // Overall score weighted by mention count
  const totalMentions = sources.reduce((s, src) => s + src.mentions, 0);
  const weightedBull = sources.reduce(
    (s, src) => s + (src.bullishPct / 100) * (src.mentions / totalMentions),
    0
  );
  const overallScore = Math.round(weightedBull * 100);

  // Generate mentions
  const times = ["2m ago", "8m ago", "15m ago", "23m ago", "41m ago", "1h ago", "2h ago", "3h ago"];
  const mentions: Mention[] = [];

  for (let i = 0; i < 8; i++) {
    const sentRoll = rand();
    const sentiment: Mention["sentiment"] =
      sentRoll < 0.45 ? "bullish" : sentRoll < 0.8 ? "bearish" : "neutral";

    const snippets =
      sentiment === "bullish"
        ? BULLISH_SNIPPETS
        : sentiment === "bearish"
        ? BEARISH_SNIPPETS
        : NEUTRAL_SNIPPETS;

    const snippetIdx = Math.floor(rand() * snippets.length);
    const text = snippets[snippetIdx].replace("$XXX", `${Math.round(100 + rand() * 400)}`);

    let username: string;
    let source: string;
    if (i < 3) {
      username = REDDIT_USERS[Math.floor(rand() * REDDIT_USERS.length)];
      source = "Reddit";
    } else if (i < 6) {
      username = TWITTER_USERS[Math.floor(rand() * TWITTER_USERS.length)];
      source = "Twitter / X";
    } else {
      username = STOCKTWITS_USERS[Math.floor(rand() * STOCKTWITS_USERS.length)];
      source = "StockTwits";
    }

    mentions.push({
      id: `mention-${i}`,
      username,
      source,
      text: `$${symbol} ${text}`,
      sentiment,
      timeAgo: times[i],
    });
  }

  return { symbol, overallScore, sources, mentions };
}

const POPULAR = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META"];

export default function SocialSentiment() {
  const [query, setQuery] = useState("AAPL");
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(false);

  const data = useMemo(() => generateSentimentData(activeSymbol), [activeSymbol]);

  const lookup = useCallback((sym: string) => {
    const normalized = sym.trim().toUpperCase();
    if (!normalized) return;
    setQuery(normalized);
    setLoading(true);
    setTimeout(() => {
      setActiveSymbol(normalized);
      setLoading(false);
    }, 600);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  const scoreLabel =
    data.overallScore >= 65
      ? "Bullish"
      : data.overallScore <= 35
      ? "Bearish"
      : "Neutral";
  const scoreColor =
    data.overallScore >= 65
      ? "var(--positive)"
      : data.overallScore <= 35
      ? "var(--negative)"
      : "var(--warning)";

  return (
    <div className="space-y-4 fade-up">
      {/* Search */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users size={15} style={{ color: "var(--accent)" }} />
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Social Sentiment Aggregation
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Search symbol (e.g. AAPL)"
              className="w-full rounded-lg control-surface bg-white/75 dark:bg-black/25 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Analyze"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[11px] muted mr-1 self-center">Popular:</span>
          {POPULAR.map((s) => (
            <button
              key={s}
              onClick={() => lookup(s)}
              className={`rounded-md control-surface px-2 py-1 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                activeSymbol === s ? "border border-[var(--accent)]" : ""
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <MessageCircle size={28} className="mx-auto animate-pulse" style={{ color: "var(--accent)" }} />
          <p className="mt-3 text-sm muted">Scanning social channels for ${query}...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {/* Overall sentiment gauge */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
              Overall Social Sentiment &mdash; {data.symbol}
            </div>
            <div className="flex items-center gap-4">
              <div
                className="text-3xl font-bold metric-value"
                style={{ color: scoreColor }}
              >
                {data.overallScore}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: scoreColor }}>
                  {scoreLabel}
                </div>
                <div className="text-xs muted">Composite score (0 = max bearish, 100 = max bullish)</div>
              </div>
            </div>
            {/* Gauge bar */}
            <div className="mt-3 relative h-3 rounded-full overflow-hidden bg-[var(--surface-border)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${data.overallScore}%`,
                  background: `linear-gradient(90deg, var(--negative), var(--warning) 50%, var(--positive))`,
                }}
              />
              <div
                className="absolute top-0 h-full w-1 rounded-full bg-white shadow-md transition-all duration-500"
                style={{ left: `calc(${data.overallScore}% - 2px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] muted mt-1">
              <span>Bearish (0)</span>
              <span>Neutral (50)</span>
              <span>Bullish (100)</span>
            </div>
          </div>

          {/* Source cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            {data.sources.map((src) => (
              <div
                key={src.name}
                className="sentiment-source-card rounded-2xl surface-glass dynamic-surface p-4 sm:p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">{src.name}</span>
                  <span className="sentiment-mention text-[11px] muted font-semibold">
                    {src.mentions.toLocaleString()} mentions
                  </span>
                </div>

                {/* Bull/bear bar */}
                <div className="sentiment-bar-track h-4 rounded-full overflow-hidden flex">
                  <div
                    className="sentiment-bar-bull h-full transition-all duration-500"
                    style={{
                      width: `${src.bullishPct}%`,
                      backgroundColor: "var(--positive)",
                      opacity: 0.8,
                    }}
                  />
                  <div
                    className="sentiment-bar-bear h-full transition-all duration-500"
                    style={{
                      width: `${src.bearishPct}%`,
                      backgroundColor: "var(--negative)",
                      opacity: 0.8,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                  <span style={{ color: "var(--positive)" }}>{src.bullishPct}% Bull</span>
                  <span style={{ color: "var(--negative)" }}>{src.bearishPct}% Bear</span>
                </div>

                {/* Trending tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {src.trending.map((tag) => (
                    <span
                      key={tag}
                      className="sentiment-trending-tag inline-flex items-center gap-1 rounded-md control-surface px-2 py-0.5 text-[10px] muted"
                    >
                      <Hash size={9} />
                      {tag.replace("#", "")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recent mentions */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="muted" />
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                Recent Mentions
              </div>
            </div>
            <ul className="space-y-2">
              {data.mentions.map((m) => {
                const badgeCls =
                  m.sentiment === "bullish"
                    ? "badge-positive"
                    : m.sentiment === "bearish"
                    ? "badge-negative"
                    : "badge-neutral";

                return (
                  <li
                    key={m.id}
                    className="rounded-xl control-surface p-3 flex flex-col sm:flex-row sm:items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">{m.username}</span>
                        <span className="muted">{m.source}</span>
                        <span className="muted">{m.timeAgo}</span>
                      </div>
                      <p className="text-sm mt-1 break-words">{m.text}</p>
                    </div>
                    <span
                      className={`${badgeCls} text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap`}
                    >
                      {m.sentiment}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
