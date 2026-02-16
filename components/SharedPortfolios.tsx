"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Copy, MessageSquare, Share2, ThumbsDown, ThumbsUp, Users } from "lucide-react";

type PortfolioItem = { symbol: string; shares: number; avg_cost: number; name?: string };
type Comment = { id: string; author: string; message: string; timestamp: string; upvotes: number; downvotes: number };
type SharedPortfolio = { id: string; name: string; positions: PortfolioItem[]; sharedAt: string; comments: Comment[] };

const SHARED_KEY = "smc_shared_portfolios_v1";
const PROFILE_KEY = "smc_profile_v1";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadShared(): SharedPortfolio[] {
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch { /* */ }
  return [];
}

function saveShared(data: SharedPortfolio[]) {
  localStorage.setItem(SHARED_KEY, JSON.stringify(data));
}

function getUsername(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p?.name) return p.name; }
  } catch { /* */ }
  return "Anonymous";
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

export default function SharedPortfolios() {
  const [shared, setShared] = useState<SharedPortfolio[]>([]);
  const [myPortfolio, setMyPortfolio] = useState<PortfolioItem[]>([]);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareJson, setShareJson] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setShared(loadShared());
    try {
      const raw = localStorage.getItem("smc_portfolio_v3");
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) setMyPortfolio(p); }
    } catch { /* */ }
  }, []);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }, []);

  const handleShare = () => {
    const snapshot: SharedPortfolio = {
      id: uid(),
      name: `${getUsername()}'s Portfolio`,
      positions: myPortfolio.map((p) => ({ symbol: p.symbol, shares: p.shares, avg_cost: p.avg_cost })),
      sharedAt: new Date().toISOString(),
      comments: [],
    };
    const json = JSON.stringify(snapshot, null, 2);
    setShareJson(json);
    setShowShare(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      flash("Failed to copy.");
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.positions || !Array.isArray(parsed.positions)) {
        flash("Invalid format. Expected a shared portfolio JSON.");
        return;
      }
      const portfolio: SharedPortfolio = {
        id: parsed.id || uid(),
        name: parsed.name || "Imported Portfolio",
        positions: parsed.positions,
        sharedAt: parsed.sharedAt || new Date().toISOString(),
        comments: parsed.comments || [],
      };
      const updated = [portfolio, ...shared.filter((s) => s.id !== portfolio.id)];
      setShared(updated);
      saveShared(updated);
      setImportText("");
      setShowImport(false);
      flash("Portfolio imported successfully!");
    } catch {
      flash("Invalid JSON. Please paste a valid shared portfolio.");
    }
  };

  const addComment = (portfolioId: string) => {
    const message = commentInputs[portfolioId]?.trim();
    if (!message) return;
    const comment: Comment = {
      id: uid(),
      author: getUsername(),
      message,
      timestamp: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
    };
    const updated = shared.map((s) =>
      s.id === portfolioId ? { ...s, comments: [...s.comments, comment] } : s
    );
    setShared(updated);
    saveShared(updated);
    setCommentInputs((c) => ({ ...c, [portfolioId]: "" }));
  };

  const vote = (portfolioId: string, commentId: string, direction: "up" | "down") => {
    const updated = shared.map((s) => {
      if (s.id !== portfolioId) return s;
      return {
        ...s,
        comments: s.comments.map((c) => {
          if (c.id !== commentId) return c;
          return direction === "up"
            ? { ...c, upvotes: c.upvotes + 1 }
            : { ...c, downvotes: c.downvotes + 1 };
        }),
      };
    });
    setShared(updated);
    saveShared(updated);
  };

  const mySymbols = new Set(myPortfolio.map((p) => p.symbol));

  return (
    <div className="space-y-4 fade-up">
      <div className="card-elevated rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold section-title">Shared Portfolios</h3>
            <span className="text-[11px] badge-neutral rounded-full px-2 py-0.5">{shared.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={!myPortfolio.length}
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Share2 size={12} /> Share My Portfolio
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 muted"
            >
              <ArrowDownToLine size={12} /> Import
            </button>
          </div>
        </div>

        {notice && (
          <div className="rounded-lg border border-emerald-300/55 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            {notice}
          </div>
        )}

        {/* Share output */}
        {showShare && (
          <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold muted">Share Code</span>
              <button onClick={handleCopy} className="inline-flex items-center gap-1 text-xs text-[var(--accent)]">
                <Copy size={12} /> {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              value={shareJson}
              className="w-full rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-xs font-mono min-h-[100px] resize-none"
            />
            <button onClick={() => setShowShare(false)} className="text-xs muted underline">Close</button>
          </div>
        )}

        {/* Import */}
        {showImport && (
          <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-3 space-y-2">
            <div className="text-xs font-semibold muted">Paste shared portfolio JSON</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"name": "...", "positions": [...]}'
              className="w-full rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-xs font-mono min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleImport} className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1">
                <ArrowUpFromLine size={12} /> Import
              </button>
              <button onClick={() => { setShowImport(false); setImportText(""); }} className="text-xs muted underline">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Shared portfolio list */}
      {shared.map((portfolio) => (
        <div key={portfolio.id} className="card-elevated rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{portfolio.name}</div>
              <div className="text-[11px] muted">
                Shared {new Date(portfolio.sharedAt).toLocaleDateString()} · {portfolio.positions.length} positions
              </div>
            </div>
          </div>

          {/* Positions table */}
          <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
            <table className="w-full text-xs">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr className="text-left">
                  <th className="px-2.5 py-1.5 font-medium">Symbol</th>
                  <th className="px-2.5 py-1.5 font-medium text-right">Shares</th>
                  <th className="px-2.5 py-1.5 font-medium text-right">Avg Cost</th>
                  <th className="px-2.5 py-1.5 font-medium">Match</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((pos, i) => (
                  <tr key={i} className={`border-t border-[var(--surface-border)] ${mySymbols.has(pos.symbol) ? "shared-overlap" : ""}`}>
                    <td className="px-2.5 py-1.5 font-semibold">{pos.symbol}</td>
                    <td className="px-2.5 py-1.5 text-right metric-value">{pos.shares}</td>
                    <td className="px-2.5 py-1.5 text-right metric-value">{pos.avg_cost ? formatMoney(pos.avg_cost) : "—"}</td>
                    <td className="px-2.5 py-1.5">
                      {mySymbols.has(pos.symbol) && (
                        <span className="badge-positive rounded-full px-1.5 py-0.5 text-[10px] font-semibold">In yours</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <div className="text-xs font-semibold muted flex items-center gap-1">
              <MessageSquare size={12} /> Comments ({portfolio.comments.length})
            </div>
            {portfolio.comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{c.author}</span>
                  <span className="muted text-[10px]">{new Date(c.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="mt-1">{c.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button onClick={() => vote(portfolio.id, c.id, "up")} className="inline-flex items-center gap-0.5 muted hover:text-[var(--positive)]">
                    <ThumbsUp size={11} /> {c.upvotes}
                  </button>
                  <button onClick={() => vote(portfolio.id, c.id, "down")} className="inline-flex items-center gap-0.5 muted hover:text-[var(--negative)]">
                    <ThumbsDown size={11} /> {c.downvotes}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={commentInputs[portfolio.id] || ""}
                onChange={(e) => setCommentInputs((c) => ({ ...c, [portfolio.id]: e.target.value }))}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") addComment(portfolio.id); }}
              />
              <button
                onClick={() => addComment(portfolio.id)}
                className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs font-semibold muted"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      ))}

      {shared.length === 0 && (
        <div className="card-elevated rounded-xl p-6 text-center">
          <Users size={32} className="mx-auto muted opacity-40" />
          <div className="text-sm font-semibold mt-2">No shared portfolios yet</div>
          <div className="text-xs muted mt-1">Share your portfolio or import one from a friend.</div>
        </div>
      )}
    </div>
  );
}
