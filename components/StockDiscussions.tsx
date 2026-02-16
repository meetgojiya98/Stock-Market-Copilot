"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Heart,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";

type Comment = {
  id: string;
  symbol: string;
  author: string;
  text: string;
  timestamp: string;
  likes: number;
};

type DiscussionState = {
  comments: Comment[];
  likedIds: string[];
};

const LS_KEY = "smc_discussions_v1";

const POPULAR_SYMBOLS = ["AAPL", "TSLA", "MSFT", "NVDA"];

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function buildSeedComments(): Comment[] {
  const seed: { symbol: string; author: string; text: string; days: number; likes: number }[] = [
    { symbol: "AAPL", author: "BullRunner", text: "Services revenue keeps surprising to the upside. Holding long.", days: 2, likes: 24 },
    { symbol: "AAPL", author: "ValueHunter", text: "Buybacks are doing the heavy lifting this quarter. P/E stretched.", days: 5, likes: 11 },
    { symbol: "AAPL", author: "ChartWhiz", text: "Nice breakout above the 200-day. Watch $195 as support.", days: 1, likes: 18 },
    { symbol: "TSLA", author: "SwingKing", text: "Deliveries beat expectations. FSD progress is underappreciated.", days: 3, likes: 37 },
    { symbol: "TSLA", author: "DataDriven", text: "Margins are still compressing. I want to see stabilization first.", days: 4, likes: 15 },
    { symbol: "TSLA", author: "TickerTalk", text: "Energy storage side of the business is the real story long term.", days: 1, likes: 22 },
    { symbol: "MSFT", author: "QuietCapital", text: "Azure growth reacceleration is a big deal. Cloud is the backbone.", days: 2, likes: 31 },
    { symbol: "MSFT", author: "PatienceAlpha", text: "Copilot monetization is still early. Watching enterprise adoption.", days: 6, likes: 9 },
    { symbol: "MSFT", author: "BullRunner", text: "Solid balance sheet, great moat. Core position for me.", days: 3, likes: 19 },
    { symbol: "NVDA", author: "DataDriven", text: "Data center demand is insatiable. Revenue guidance keeps going up.", days: 1, likes: 52 },
    { symbol: "NVDA", author: "SwingKing", text: "Valuation is aggressive but the growth backs it up for now.", days: 4, likes: 28 },
    { symbol: "NVDA", author: "ChartWhiz", text: "Volume profile looks healthy. Support at the 50-day moving average.", days: 2, likes: 14 },
    { symbol: "NVDA", author: "ValueHunter", text: "Competition from AMD and custom chips is the main risk to watch.", days: 7, likes: 8 },
  ];

  return seed.map((s) => ({
    id: uid(),
    symbol: s.symbol,
    author: s.author,
    text: s.text,
    timestamp: daysAgo(s.days),
    likes: s.likes,
  }));
}

function loadState(): DiscussionState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DiscussionState;
      if (parsed.comments && parsed.comments.length > 0) return parsed;
    }
  } catch { /* empty */ }
  return { comments: buildSeedComments(), likedIds: [] };
}

function saveState(state: DiscussionState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type SortMode = "newest" | "liked";

export default function StockDiscussions() {
  const [state, setState] = useState<DiscussionState>(loadState);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [symbolInput, setSymbolInput] = useState("");
  const [commentText, setCommentText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [notice, setNotice] = useState("");

  useEffect(() => { saveState(state); }, [state]);

  const allSymbols = useMemo(() => {
    const set = new Set(state.comments.map((c) => c.symbol));
    POPULAR_SYMBOLS.forEach((s) => set.add(s));
    return [...set].sort();
  }, [state.comments]);

  const commentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    state.comments.forEach((c) => { map[c.symbol] = (map[c.symbol] || 0) + 1; });
    return map;
  }, [state.comments]);

  const filteredComments = useMemo(() => {
    const list = state.comments.filter((c) => c.symbol === selectedSymbol);
    if (sortMode === "liked") {
      return [...list].sort((a, b) => b.likes - a.likes);
    }
    return [...list].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }, [state.comments, selectedSymbol, sortMode]);

  const handleSelectSymbol = useCallback((sym: string) => {
    const normalized = sym.trim().toUpperCase();
    if (normalized) setSelectedSymbol(normalized);
    setSymbolInput("");
  }, []);

  const handlePost = useCallback(() => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: uid(),
      symbol: selectedSymbol,
      author: "You",
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
      likes: 0,
    };
    setState((prev) => ({
      ...prev,
      comments: [newComment, ...prev.comments],
    }));
    setCommentText("");
    setNotice("Comment posted.");
    setTimeout(() => setNotice(""), 2500);
  }, [commentText, selectedSymbol]);

  const handleLike = useCallback((id: string) => {
    setState((prev) => {
      const alreadyLiked = prev.likedIds.includes(id);
      return {
        comments: prev.comments.map((c) =>
          c.id === id ? { ...c, likes: c.likes + (alreadyLiked ? -1 : 1) } : c
        ),
        likedIds: alreadyLiked
          ? prev.likedIds.filter((x) => x !== id)
          : [...prev.likedIds, id],
      };
    });
  }, []);

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-lg px-3 py-2 text-xs border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Symbol Selector */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <h3 className="section-title text-base flex items-center gap-2">
          <MessageCircle size={16} />
          Stock Discussions
        </h3>
        <p className="text-xs muted">
          Select a stock to view and join the conversation. Pick a popular symbol or type any ticker.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {POPULAR_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSymbol(s)}
              className={`rounded-full px-2.5 py-1 text-xs border font-semibold ${
                selectedSymbol === s
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                  : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
              }`}
            >
              {s}
              {commentCounts[s] ? (
                <span className="ml-1 text-[10px] muted">({commentCounts[s]})</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSelectSymbol(symbolInput);
              }}
              placeholder="Type a symbol and press Enter"
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 pl-8 pr-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => handleSelectSymbol(symbolInput)}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
          >
            Go
          </button>
        </div>
      </div>

      {/* Discussion Thread */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Discussion Thread
            </div>
            <h3 className="section-title text-lg font-semibold mt-0.5">{selectedSymbol}</h3>
          </div>
          <button
            onClick={() => setSortMode((p) => (p === "newest" ? "liked" : "newest"))}
            className="rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-xs muted inline-flex items-center gap-1"
          >
            <ArrowUpDown size={12} />
            {sortMode === "newest" ? "Newest First" : "Most Liked"}
          </button>
        </div>

        {/* Comment Form */}
        <div className="rounded-xl control-surface p-3 space-y-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Share your thoughts on ${selectedSymbol}...`}
            rows={2}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] muted">Posting as You</span>
            <button
              onClick={handlePost}
              disabled={!commentText.trim()}
              className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={12} />
              Post
            </button>
          </div>
        </div>

        {/* Comment List */}
        <div className="space-y-2">
          {filteredComments.length === 0 && (
            <p className="text-xs muted py-4 text-center">No comments yet for {selectedSymbol}. Be the first to share your thoughts.</p>
          )}

          {filteredComments.map((c) => {
            const isLiked = state.likedIds.includes(c.id);
            return (
              <div key={c.id} className="rounded-xl control-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold section-title">
                        {c.author}
                      </span>
                      <span className="text-[11px] muted">
                        {formatTimestamp(c.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 leading-relaxed">{c.text}</p>
                  </div>
                  <button
                    onClick={() => handleLike(c.id)}
                    className={`flex-shrink-0 inline-flex items-center gap-1 text-xs rounded-lg border px-2 py-1 ${
                      isLiked
                        ? "border-[var(--negative)] text-[var(--negative)]"
                        : "border-[var(--surface-border)] muted"
                    }`}
                  >
                    <Heart size={11} fill={isLiked ? "currentColor" : "none"} />
                    {c.likes}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
