"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BadgeCheck,
  ChevronDown,
  Copy,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RiskLevel = "Low" | "Medium" | "High" | "Aggressive";

type TopTrader = {
  id: string;
  username: string;
  avatar: string;
  winRate: number;
  totalReturn: number;
  strategyDescription: string;
  followerCount: number;
  riskLevel: RiskLevel;
  trades30d: number;
  avgHoldTime: string;
};

type CopiedTrade = {
  id: string;
  traderId: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  shares: number;
  pnl: number;
  timestamp: string;
};

type FollowStats = {
  traderId: string;
  returnFromCopying: number;
  tradesCopied: number;
};

type SortKey = "return" | "winRate" | "followers" | "risk";

type TabView = "discover" | "following";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_copy_following_v1";

const RISK_ORDER: Record<RiskLevel, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Aggressive: 4,
};

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "var(--positive)",
  Medium: "#f59e0b",
  High: "#f97316",
  Aggressive: "var(--negative)",
};

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#3b82f6", "#84cc16", "#f97316",
];

const SYMBOLS = ["AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "META", "GOOG", "AMD", "NFLX", "SPY"];

/* ------------------------------------------------------------------ */
/*  Seeded RNG                                                         */
/* ------------------------------------------------------------------ */

function seededRng(seed: number): () => number {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Generate mock traders                                              */
/* ------------------------------------------------------------------ */

function generateTraders(): TopTrader[] {
  const rng = seededRng(77331);
  const usernames = [
    "AlphaWolf", "QuietCapital", "MomentumKing", "ValueHunterX",
    "SwingMasterPro", "DeltaNeutral", "ThetaGang42", "GrowthPilot",
    "ScalpZone", "PatientBull",
  ];
  const strategies = [
    "Momentum breakouts on large-cap tech with tight stop-losses",
    "Deep value investing in undervalued consumer discretionary",
    "Swing trading high-volume stocks using MACD crossovers",
    "Options wheel strategy on blue-chip dividend payers",
    "Mean reversion plays on oversold sectors with RSI < 30",
    "Growth at a reasonable price, focus on SaaS and cloud",
    "Scalping intraday moves on SPY and QQQ",
    "Contrarian plays on beaten-down mid-caps with catalyst",
    "Sector rotation based on macro trends and PMI data",
    "Long-only portfolio of compounders, multi-year horizon",
  ];
  const holdTimes = ["2-3 days", "1-2 weeks", "3-5 days", "4-8 weeks", "1-3 days", "6+ months", "Intraday", "2-4 weeks", "1-2 weeks", "1+ year"];
  const risks: RiskLevel[] = ["Medium", "Low", "High", "Low", "Aggressive", "Medium", "Aggressive", "High", "Medium", "Low"];

  return usernames.map((username, i) => ({
    id: `trader-${i}`,
    username,
    avatar: AVATAR_COLORS[i],
    winRate: +(52 + rng() * 30).toFixed(1),
    totalReturn: +(15 + rng() * 180).toFixed(2),
    strategyDescription: strategies[i],
    followerCount: Math.floor(200 + rng() * 9800),
    riskLevel: risks[i],
    trades30d: Math.floor(5 + rng() * 95),
    avgHoldTime: holdTimes[i],
  }));
}

function generateCopiedTrades(traderId: string, count: number): CopiedTrade[] {
  const rng = seededRng(traderId.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 997));
  const trades: CopiedTrade[] = [];
  for (let i = 0; i < count; i++) {
    const side = rng() > 0.45 ? "buy" : "sell";
    const sym = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
    const price = +(50 + rng() * 400).toFixed(2);
    const shares = Math.floor(1 + rng() * 50);
    const pnl = +((rng() - 0.4) * shares * price * 0.05).toFixed(2);
    const daysAgo = Math.floor(rng() * 30);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    trades.push({
      id: `ct-${traderId}-${i}`,
      traderId,
      symbol: sym,
      side,
      price,
      shares,
      pnl,
      timestamp: d.toISOString().slice(0, 10),
    });
  }
  return trades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function generateFollowStats(traderId: string): FollowStats {
  const rng = seededRng(traderId.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 5), 439));
  return {
    traderId,
    returnFromCopying: +((rng() - 0.2) * 35).toFixed(2),
    tradesCopied: Math.floor(3 + rng() * 40),
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function formatMoney(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CopyTradingHub() {
  const traders = useMemo(() => generateTraders(), []);

  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [tab, setTab] = useState<TabView>("discover");
  const [sortKey, setSortKey] = useState<SortKey>("return");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [expandedTrader, setExpandedTrader] = useState<string | null>(null);

  /* ---- Load / persist ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFollowingIds(parsed);
      }
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(followingIds));
    } catch { /* empty */ }
  }, [followingIds]);

  /* ---- Actions ---- */
  const toggleFollow = useCallback((traderId: string) => {
    setFollowingIds((prev) =>
      prev.includes(traderId) ? prev.filter((id) => id !== traderId) : [...prev, traderId],
    );
  }, []);

  /* ---- Sorted traders ---- */
  const sortedTraders = useMemo(() => {
    const list = [...traders];
    list.sort((a, b) => {
      switch (sortKey) {
        case "return":
          return b.totalReturn - a.totalReturn;
        case "winRate":
          return b.winRate - a.winRate;
        case "followers":
          return b.followerCount - a.followerCount;
        case "risk":
          return RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
        default:
          return 0;
      }
    });
    return list;
  }, [traders, sortKey]);

  const displayTraders = useMemo(() => {
    if (tab === "following") return sortedTraders.filter((t) => followingIds.includes(t.id));
    return sortedTraders;
  }, [tab, sortedTraders, followingIds]);

  /* ---- Follow stats & trades ---- */
  const statsMap = useMemo(() => {
    const map: Record<string, FollowStats> = {};
    for (const id of followingIds) {
      map[id] = generateFollowStats(id);
    }
    return map;
  }, [followingIds]);

  const copiedTradesMap = useMemo(() => {
    const map: Record<string, CopiedTrade[]> = {};
    for (const id of followingIds) {
      map[id] = generateCopiedTrades(id, statsMap[id]?.tradesCopied ?? 8);
    }
    return map;
  }, [followingIds, statsMap]);

  /* ---- Sort labels ---- */
  const sortLabels: Record<SortKey, string> = {
    return: "Total Return",
    winRate: "Win Rate",
    followers: "Followers",
    risk: "Risk (Low first)",
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Copy size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Copy Trading Hub
          </span>
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex items-center gap-3 mb-4">
          {(["discover", "following"] as TabView[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs rounded-lg px-4 py-2 font-semibold border transition-colors capitalize ${
                tab === t
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              {t === "discover" ? (
                <><Users size={12} className="inline mr-1" />Discover ({traders.length})</>
              ) : (
                <><UserCheck size={12} className="inline mr-1" />Following ({followingIds.length})</>
              )}
            </button>
          ))}

          {/* ---- Sort dropdown ---- */}
          <div className="ml-auto relative">
            <button
              onClick={() => setSortDropdownOpen((p) => !p)}
              className="text-xs rounded-lg px-3 py-2 border border-[var(--surface-border)] hover:border-[var(--accent)] flex items-center gap-1 transition-colors"
            >
              <ArrowDownUp size={12} />
              Sort: {sortLabels[sortKey]}
              <ChevronDown size={12} className={`transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] shadow-lg py-1 min-w-[160px]">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortKey(key);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left text-xs px-4 py-2 hover:bg-[var(--surface-emphasis)] transition-colors ${
                      sortKey === key ? "text-[var(--accent)] font-semibold" : ""
                    }`}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---- Trader cards ---- */}
        {displayTraders.length === 0 && (
          <div className="text-center py-10 muted text-sm">
            {tab === "following"
              ? "You are not following any traders yet. Discover traders to start copying."
              : "No traders found."}
          </div>
        )}

        <div className="space-y-3">
          {displayTraders.map((trader) => {
            const isFollowing = followingIds.includes(trader.id);
            const stats = statsMap[trader.id];
            const copiedTrades = copiedTradesMap[trader.id] ?? [];
            const isExpanded = expandedTrader === trader.id;

            return (
              <div
                key={trader.id}
                className="copy-trader-card rounded-xl border border-[var(--surface-border)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                {/* ---- Top row ---- */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="copy-avatar w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: trader.avatar }}
                  >
                    {trader.username.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold truncate">{trader.username}</span>
                      {trader.winRate > 70 && <BadgeCheck size={14} className="text-[var(--accent)] shrink-0" />}
                      <span
                        className="text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0"
                        style={{
                          color: RISK_COLORS[trader.riskLevel],
                          background: `color-mix(in srgb, ${RISK_COLORS[trader.riskLevel]} 14%, transparent)`,
                        }}
                      >
                        {trader.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-[11px] muted leading-relaxed line-clamp-2">
                      {trader.strategyDescription}
                    </p>
                  </div>

                  {/* Follow btn */}
                  <button
                    onClick={() => toggleFollow(trader.id)}
                    className={`copy-follow-btn shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-colors ${
                      isFollowing
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                        : "border-[var(--surface-border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    }`}
                  >
                    {isFollowing ? (
                      <><UserCheck size={11} className="inline mr-1" />Following</>
                    ) : (
                      <><UserPlus size={11} className="inline mr-1" />Follow</>
                    )}
                  </button>
                </div>

                {/* ---- Stats row ---- */}
                <div className="copy-stats grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                  <div className="rounded-lg bg-[var(--surface-emphasis)] px-2.5 py-1.5">
                    <div className="text-[9px] muted uppercase tracking-wider">Win Rate</div>
                    <div className="copy-stat-value text-xs font-bold">{trader.winRate}%</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-emphasis)] px-2.5 py-1.5">
                    <div className="text-[9px] muted uppercase tracking-wider">Total Return</div>
                    <div className={`copy-stat-value text-xs font-bold ${trader.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                      {formatPct(trader.totalReturn)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-emphasis)] px-2.5 py-1.5">
                    <div className="text-[9px] muted uppercase tracking-wider">Followers</div>
                    <div className="copy-stat-value text-xs font-bold flex items-center gap-1">
                      <Users size={10} className="muted" />
                      {formatNumber(trader.followerCount)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-emphasis)] px-2.5 py-1.5">
                    <div className="text-[9px] muted uppercase tracking-wider">30d Trades</div>
                    <div className="copy-stat-value text-xs font-bold">{trader.trades30d}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-emphasis)] px-2.5 py-1.5">
                    <div className="text-[9px] muted uppercase tracking-wider">Avg Hold</div>
                    <div className="copy-stat-value text-xs font-bold">{trader.avgHoldTime}</div>
                  </div>
                </div>

                {/* ---- Following details ---- */}
                {isFollowing && stats && (
                  <div className="mt-3 pt-3 border-t border-[var(--surface-border)]">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-[10px]">
                        <span className="muted">Your return: </span>
                        <span className={`font-bold ${stats.returnFromCopying >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                          {formatPct(stats.returnFromCopying)}
                        </span>
                      </div>
                      <div className="text-[10px]">
                        <span className="muted">Trades copied: </span>
                        <span className="font-bold">{stats.tradesCopied}</span>
                      </div>
                      <button
                        onClick={() => setExpandedTrader(isExpanded ? null : trader.id)}
                        className="ml-auto text-[10px] text-[var(--accent)] font-semibold hover:underline"
                      >
                        {isExpanded ? "Hide trades" : "View trades"}
                      </button>
                    </div>

                    {isExpanded && copiedTrades.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {copiedTrades.slice(0, 15).map((trade) => (
                          <div
                            key={trade.id}
                            className="flex items-center gap-2 text-[11px] rounded-lg bg-[var(--surface-emphasis)] px-3 py-1.5"
                          >
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                trade.side === "buy"
                                  ? "bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]"
                                  : "bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] text-[var(--negative)]"
                              }`}
                            >
                              {trade.side}
                            </span>
                            <span className="font-semibold w-12">{trade.symbol}</span>
                            <span className="muted">{trade.shares} @ {formatMoney(trade.price)}</span>
                            <span
                              className={`ml-auto font-semibold ${trade.pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                            >
                              {trade.pnl >= 0 ? "+" : ""}{formatMoney(trade.pnl)}
                            </span>
                            <span className="muted text-[9px]">{trade.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
