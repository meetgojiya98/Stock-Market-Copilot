"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Heart,
  Link2,
  List,
  Share2,
  Users,
} from "lucide-react";

type WatchlistEntry = { symbol: string };

type CommunityWatchlist = {
  id: string;
  name: string;
  author: string;
  description: string;
  stocks: string[];
  performance: number;
  views: number;
  likes: number;
};

type PublicState = {
  shared: boolean;
  shareLink: string;
  likedIds: string[];
};

const LS_KEY = "smc_public_watchlists_v1";
const WATCHLIST_KEY = "smc_local_watchlist_v2";

const COMMUNITY: CommunityWatchlist[] = [
  {
    id: "cw-1",
    name: "Mega-Cap Tech Leaders",
    author: "MarketOwl_42",
    description: "Core mega-cap tech names with strong moats and recurring revenue.",
    stocks: ["AAPL", "MSFT", "GOOGL", "AMZN", "META"],
    performance: 14.2,
    views: 1843,
    likes: 312,
  },
  {
    id: "cw-2",
    name: "AI & Semiconductor Picks",
    author: "ChipTrader",
    description: "Stocks riding the artificial intelligence and chip demand wave.",
    stocks: ["NVDA", "AMD", "AVGO", "MRVL", "TSM"],
    performance: 22.7,
    views: 2104,
    likes: 487,
  },
  {
    id: "cw-3",
    name: "Dividend Royals",
    author: "IncomeFirst",
    description: "Reliable dividend payers with 10+ years of consecutive increases.",
    stocks: ["JNJ", "PG", "KO", "PEP", "MMM", "ABT"],
    performance: 5.8,
    views: 967,
    likes: 198,
  },
  {
    id: "cw-4",
    name: "EV Revolution",
    author: "GreenDrive",
    description: "Pure-play and adjacent electric vehicle opportunities.",
    stocks: ["TSLA", "RIVN", "LI", "XPEV", "CHPT"],
    performance: -3.4,
    views: 1521,
    likes: 143,
  },
  {
    id: "cw-5",
    name: "Small-Cap Growth",
    author: "AlphaSeeker",
    description: "High-growth small caps with strong revenue acceleration.",
    stocks: ["CELH", "DUOL", "TMDX", "ONON"],
    performance: 18.1,
    views: 734,
    likes: 105,
  },
];

function loadState(): PublicState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return { shared: false, shareLink: "", likedIds: [] };
}

function saveState(state: PublicState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WatchlistEntry[];
      return parsed.map((e) => e.symbol);
    }
  } catch { /* empty */ }
  return [];
}

function saveWatchlist(symbols: string[]) {
  const entries: WatchlistEntry[] = symbols.map((s) => ({ symbol: s }));
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function PublicWatchlists() {
  const [state, setState] = useState<PublicState>(loadState);
  const [myStocks, setMyStocks] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setMyStocks(loadWatchlist());
  }, []);

  useEffect(() => { saveState(state); }, [state]);

  const handleShare = useCallback(() => {
    const link = `https://zentrade.app/shared/wl-${Date.now().toString(36)}`;
    setState((prev) => ({ ...prev, shared: true, shareLink: link }));
    setNotice("Share link generated. Copy and send it to others.");
    setTimeout(() => setNotice(""), 3000);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.shareLink);
      setNotice("Link copied to clipboard.");
    } catch {
      setNotice("Could not copy. Try selecting the link manually.");
    }
    setTimeout(() => setNotice(""), 3000);
  }, [state.shareLink]);

  const handleLike = useCallback((id: string) => {
    setState((prev) => {
      const liked = prev.likedIds.includes(id);
      return {
        ...prev,
        likedIds: liked
          ? prev.likedIds.filter((x) => x !== id)
          : [...prev.likedIds, id],
      };
    });
  }, []);

  const handleCopyToWatchlist = useCallback((stocks: string[]) => {
    setMyStocks((prev) => {
      const merged = [...new Set([...prev, ...stocks])];
      saveWatchlist(merged);
      return merged;
    });
    setNotice("Stocks added to your watchlist.");
    setTimeout(() => setNotice(""), 3000);
  }, []);

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-lg px-3 py-2 text-xs border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* My Watchlist Card */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="section-title text-base flex items-center gap-2">
            <List size={16} />
            My Watchlist
          </h3>
          <button
            onClick={handleShare}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Share2 size={13} />
            Share
          </button>
        </div>

        {myStocks.length === 0 ? (
          <p className="text-xs muted">Your watchlist is empty. Add stocks from the Watchlist page to share them here.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {myStocks.map((s) => (
              <span
                key={s}
                className="rounded-full px-2.5 py-1 text-xs border border-[var(--surface-border)] bg-white/70 dark:bg-black/25 font-semibold"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {state.shared && state.shareLink && (
          <div className="rounded-xl control-surface p-3 flex items-center gap-2 flex-wrap">
            <Link2 size={13} className="muted flex-shrink-0" />
            <span className="text-xs break-all flex-1 font-mono muted">{state.shareLink}</span>
            <button
              onClick={handleCopyLink}
              className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Community Watchlists */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <h3 className="section-title text-base flex items-center gap-2">
          <Users size={16} />
          Community Watchlists
        </h3>
        <p className="text-xs muted">
          Discover what other traders are watching. Expand a list to see all stocks, or copy them to your own watchlist.
        </p>

        <div className="space-y-2">
          {COMMUNITY.map((cw) => {
            const isExpanded = expandedId === cw.id;
            const isLiked = state.likedIds.includes(cw.id);
            const displayLikes = cw.likes + (isLiked ? 1 : 0);

            return (
              <div key={cw.id} className="rounded-xl control-surface p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold section-title">{cw.name}</span>
                      <span
                        className={`text-xs font-semibold ${
                          cw.performance >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }`}
                      >
                        {cw.performance >= 0 ? "+" : ""}
                        {cw.performance.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mt-0.5">
                      by {cw.author} &middot; {cw.stocks.length} stocks
                    </div>
                    <p className="text-xs muted mt-1">{cw.description}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] muted inline-flex items-center gap-1">
                      <Eye size={11} />
                      {formatNumber(cw.views)}
                    </span>
                    <button
                      onClick={() => handleLike(cw.id)}
                      className={`inline-flex items-center gap-1 text-[11px] ${
                        isLiked ? "text-[var(--negative)]" : "muted"
                      }`}
                    >
                      <Heart size={11} fill={isLiked ? "currentColor" : "none"} />
                      {formatNumber(displayLikes)}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : cw.id)}
                      className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-xs muted"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-2 pt-1 border-t border-[var(--surface-border)]">
                    <div className="flex flex-wrap gap-1.5">
                      {cw.stocks.map((s) => (
                        <span
                          key={s}
                          className="rounded-full px-2.5 py-1 text-xs border border-[var(--surface-border)] bg-white/70 dark:bg-black/25 font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCopyToWatchlist(cw.stocks)}
                      className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Copy size={12} />
                      Copy to My Watchlist
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
