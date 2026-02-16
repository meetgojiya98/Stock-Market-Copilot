"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Calendar,
  ChevronDown,
  Crown,
  Flame,
  Medal,
  Star,
  Trophy,
  User,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StrategyTag = "Momentum" | "Value" | "Swing" | "Scalp" | "Options" | "Growth" | "Contrarian" | "DayTrade";

type Participant = {
  rank: number;
  username: string;
  totalReturn: number;
  winRate: number;
  trades: number;
  longestStreak: number;
  strategyTags: StrategyTag[];
  isUser: boolean;
};

type TimePeriod = "weekly" | "monthly";

type SortColumn = "rank" | "totalReturn" | "winRate" | "trades" | "longestStreak";
type SortDirection = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEDGER_KEY = "smc_paper_trading_ledger_v1";
const USER_RANK_KEY = "smc_leaderboard_user_rank_v1";

const ALL_TAGS: StrategyTag[] = ["Momentum", "Value", "Swing", "Scalp", "Options", "Growth", "Contrarian", "DayTrade"];

const USERNAMES = [
  "AlphaWolf", "QuietCapital", "MomentumKing", "ValueHunterX", "SwingMasterPro",
  "DeltaNeutral", "ThetaGang42", "GrowthPilot", "ScalpZone", "PatientBull",
  "MarketWhiz", "IronCondor", "BreakoutKid", "DivDripKing", "PivotTrader",
  "SharpEdge", "BullRunner", "CatalystHawk", "SteadyHand", "RiskMaster",
];

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
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

function generateParticipants(period: TimePeriod, userRank: number): Participant[] {
  const seed = period === "weekly" ? 5501 : 7703;
  const rng = seededRng(seed);
  const multiplier = period === "weekly" ? 0.35 : 1;

  const entries: Participant[] = USERNAMES.map((username, i) => {
    const totalReturn = +((rng() * 120 - 10) * multiplier).toFixed(2);
    const winRate = +(40 + rng() * 38).toFixed(1);
    const trades = Math.floor(3 + rng() * (period === "weekly" ? 30 : 120));
    const longestStreak = Math.floor(1 + rng() * 14);
    const tagCount = 1 + Math.floor(rng() * 3);
    const tags: StrategyTag[] = [];
    const used = new Set<number>();
    for (let t = 0; t < tagCount; t++) {
      let idx = Math.floor(rng() * ALL_TAGS.length);
      while (used.has(idx)) idx = (idx + 1) % ALL_TAGS.length;
      used.add(idx);
      tags.push(ALL_TAGS[idx]);
    }

    return {
      rank: 0,
      username,
      totalReturn,
      winRate,
      trades,
      longestStreak,
      strategyTags: tags,
      isUser: false,
    };
  });

  // Sort by return descending, assign ranks
  entries.sort((a, b) => b.totalReturn - a.totalReturn);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  // Insert user at specified rank
  const userEntry: Participant = {
    rank: userRank,
    username: "You",
    totalReturn: entries[Math.min(userRank - 1, entries.length - 1)]?.totalReturn ?? 12.5,
    winRate: +(55 + seededRng(42)() * 15).toFixed(1),
    trades: Math.floor(10 + seededRng(42)() * 40),
    longestStreak: Math.floor(3 + seededRng(42)() * 7),
    strategyTags: ["Swing", "Momentum"],
    isUser: true,
  };

  // Adjust: push entries down from userRank position
  if (userRank <= entries.length) {
    entries.splice(userRank - 1, 0, userEntry);
    entries.splice(21); // keep 21 (20 mock + you)
  } else {
    entries.push(userEntry);
  }

  // Re-rank
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return entries;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown size={16} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={16} className="text-gray-400" />;
  if (rank === 3) return <Award size={16} className="text-amber-600" />;
  return null;
}

function rankBadgeColor(rank: number): string {
  if (rank === 1) return "#eab308";
  if (rank === 2) return "#9ca3af";
  if (rank === 3) return "#d97706";
  return "transparent";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PaperTradingLeaderboard() {
  const [period, setPeriod] = useState<TimePeriod>("weekly");
  const [sortCol, setSortCol] = useState<SortColumn>("rank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [userRank, setUserRank] = useState(7);

  /* ---- Load user rank from localStorage ---- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(USER_RANK_KEY);
      if (saved) {
        const r = parseInt(saved, 10);
        if (r >= 1 && r <= 20) setUserRank(r);
      }
    } catch { /* empty */ }
  }, []);

  /* ---- Participants ---- */
  const participants = useMemo(() => generateParticipants(period, userRank), [period, userRank]);

  /* ---- Sorted participants ---- */
  const sorted = useMemo(() => {
    const list = [...participants];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "rank":
          cmp = a.rank - b.rank;
          break;
        case "totalReturn":
          cmp = b.totalReturn - a.totalReturn;
          break;
        case "winRate":
          cmp = b.winRate - a.winRate;
          break;
        case "trades":
          cmp = b.trades - a.trades;
          break;
        case "longestStreak":
          cmp = b.longestStreak - a.longestStreak;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [participants, sortCol, sortDir]);

  /* ---- Toggle sort ---- */
  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "rank" ? "asc" : "desc");
    }
  };

  const SortIndicator = ({ col }: { col: SortColumn }) => {
    if (sortCol !== col) return <ChevronDown size={10} className="muted opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp size={10} className="text-[var(--accent)]" />
    ) : (
      <ArrowDown size={10} className="text-[var(--accent)]" />
    );
  };

  /* ---- Top 3 podium ---- */
  const top3 = participants.filter((p) => p.rank <= 3).sort((a, b) => a.rank - b.rank);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="leaderboard-card space-y-4">
      {/* ---- Header ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Paper Trading Leaderboard
          </span>
        </div>

        {/* ---- Period tabs ---- */}
        <div className="flex items-center gap-2 mb-5">
          {(["weekly", "monthly"] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs rounded-lg px-4 py-2 font-semibold border transition-colors capitalize ${
                period === p
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              <Calendar size={12} className="inline mr-1" />
              {p}
            </button>
          ))}
        </div>

        {/* ---- Top 3 Podium ---- */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {top3.map((p) => (
            <div
              key={p.username}
              className={`rounded-xl border-2 p-3 text-center transition-colors ${
                p.isUser ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]" : "border-[var(--surface-border)]"
              }`}
              style={{
                borderColor: p.isUser ? undefined : rankBadgeColor(p.rank),
              }}
            >
              <div className="flex justify-center mb-1">{rankIcon(p.rank)}</div>
              <div className="leaderboard-rank text-lg font-black" style={{ color: rankBadgeColor(p.rank) }}>
                #{p.rank}
              </div>
              <div className="text-xs font-bold mt-1">
                {p.username}
                {p.isUser && <span className="text-[var(--accent)] ml-1">(You)</span>}
              </div>
              <div className={`text-sm font-bold mt-1 ${p.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                {formatPct(p.totalReturn)}
              </div>
              <div className="text-[10px] muted mt-0.5">
                {p.winRate}% win &middot; {p.trades} trades
              </div>
              {p.longestStreak >= 5 && (
                <div className="leaderboard-streak text-[10px] mt-1 font-semibold text-orange-500">
                  <Flame size={10} className="inline" /> {p.longestStreak}-day streak
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ---- Full table ---- */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--surface-border)]">
                {([
                  ["rank", "Rank"],
                  ["totalReturn", "Return"],
                  ["winRate", "Win Rate"],
                  ["trades", "Trades"],
                  ["longestStreak", "Streak"],
                ] as [SortColumn, string][]).map(([col, label]) => (
                  <th
                    key={col}
                    className="py-2 px-2 text-left muted font-medium cursor-pointer select-none hover:text-[var(--accent)] transition-colors"
                    onClick={() => handleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIndicator col={col} />
                    </span>
                  </th>
                ))}
                <th className="py-2 px-2 text-left muted font-medium">Player</th>
                <th className="py-2 px-2 text-left muted font-medium">Strategies</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr
                  key={p.username + p.rank}
                  className={`leaderboard-row border-b border-[var(--surface-border)] last:border-0 transition-colors ${
                    p.isUser
                      ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                      : "hover:bg-[var(--surface-emphasis)]"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      {rankIcon(p.rank)}
                      <span
                        className="leaderboard-rank font-bold"
                        style={{ color: p.rank <= 3 ? rankBadgeColor(p.rank) : undefined }}
                      >
                        #{p.rank}
                      </span>
                    </div>
                  </td>
                  {/* Return */}
                  <td className="py-2.5 px-2">
                    <span
                      className={`font-bold ${p.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                    >
                      {formatPct(p.totalReturn)}
                    </span>
                  </td>
                  {/* Win Rate */}
                  <td className="py-2.5 px-2 font-medium">{p.winRate}%</td>
                  {/* Trades */}
                  <td className="py-2.5 px-2">{p.trades}</td>
                  {/* Streak */}
                  <td className="py-2.5 px-2">
                    <span className="inline-flex items-center gap-0.5">
                      {p.longestStreak >= 5 && <Flame size={11} className="text-orange-500" />}
                      <span className={p.longestStreak >= 5 ? "font-bold text-orange-500" : ""}>
                        {p.longestStreak}d
                      </span>
                    </span>
                  </td>
                  {/* Player */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[var(--surface-emphasis)] flex items-center justify-center">
                        {p.isUser ? (
                          <Star size={11} className="text-[var(--accent)]" />
                        ) : (
                          <User size={11} className="muted" />
                        )}
                      </div>
                      <span className={`font-semibold ${p.isUser ? "text-[var(--accent)]" : ""}`}>
                        {p.username}
                      </span>
                    </div>
                  </td>
                  {/* Strategies */}
                  <td className="py-2.5 px-2">
                    <div className="flex flex-wrap gap-1">
                      {p.strategyTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-medium border border-[var(--surface-border)] bg-[var(--surface-emphasis)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
