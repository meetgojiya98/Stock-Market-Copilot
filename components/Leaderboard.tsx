"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Medal,
  Trophy,
  User,
} from "lucide-react";

type PaperPosition = { symbol: string; shares: number; averagePrice: number };
type PaperOrder = {
  id: string;
  status: string;
  realizedPnl?: number;
  side: string;
};
type PaperLedger = {
  startingCash: number;
  cash: number;
  realizedPnl: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
};

type LeaderEntry = {
  rank: number;
  username: string;
  totalReturn: number;
  winRate: number;
  trades: number;
  isUser: boolean;
};

type TimePeriod = "week" | "month" | "all";

const LEDGER_KEY = "smc_paper_trading_ledger_v1";

function seededRandom(seed: number): () => number {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function generateMockEntries(period: TimePeriod): LeaderEntry[] {
  const seed = period === "week" ? 1001 : period === "month" ? 2002 : 3003;
  const rand = seededRandom(seed);

  const names = [
    "Trader_8271", "Trader_4592", "Trader_1037", "Trader_6854", "Trader_3319",
    "Trader_7745", "Trader_2188", "Trader_9463", "Trader_5620", "Trader_0891",
    "Trader_3477", "Trader_6102", "Trader_8839", "Trader_1554", "Trader_4266",
    "Trader_7018", "Trader_2793", "Trader_5341",
  ];

  const multiplier = period === "week" ? 0.3 : period === "month" ? 0.7 : 1.0;

  return names.map((name) => {
    const baseReturn = (rand() * 80 - 15) * multiplier;
    const winRate = 35 + rand() * 40;
    const trades = Math.floor(5 + rand() * (period === "week" ? 20 : period === "month" ? 60 : 150));
    return {
      rank: 0,
      username: name,
      totalReturn: Number(baseReturn.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
      trades,
      isUser: false,
    };
  });
}

function loadLedger(): PaperLedger | null {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return null;
}

function computeUserStats(ledger: PaperLedger): { totalReturn: number; winRate: number; trades: number } {
  const filledOrders = ledger.orders.filter((o) => o.status === "filled");
  const sellOrders = filledOrders.filter((o) => o.side === "sell");
  const totalTrades = sellOrders.length;
  const wins = sellOrders.filter((o) => (o.realizedPnl ?? 0) > 0).length;
  const totalReturn = ledger.startingCash > 0
    ? ((ledger.realizedPnl) / ledger.startingCash) * 100
    : 0;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  return {
    totalReturn: Number(totalReturn.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    trades: totalTrades,
  };
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown size={14} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={14} className="text-gray-400" />;
  if (rank === 3) return <Award size={14} className="text-amber-600" />;
  return <span className="text-xs muted w-[14px] text-center inline-block">{rank}</span>;
}

function formatPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<TimePeriod>("all");
  const [showUsername, setShowUsername] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const ledger = useMemo(() => {
    if (typeof window === "undefined") return null;
    return loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(() => {
    const mock = generateMockEntries(period);

    if (ledger) {
      const stats = computeUserStats(ledger);
      const userEntry: LeaderEntry = {
        rank: 0,
        username: showUsername ? "You" : "Trader_YOU",
        totalReturn: stats.totalReturn,
        winRate: stats.winRate,
        trades: stats.trades,
        isUser: true,
      };
      mock.push(userEntry);
    }

    mock.sort((a, b) => b.totalReturn - a.totalReturn);
    mock.forEach((entry, idx) => { entry.rank = idx + 1; });

    return mock;
  }, [period, ledger, showUsername]);

  const top10 = useMemo(() => entries.slice(0, 10), [entries]);
  const remaining = useMemo(() => entries.slice(10), [entries]);
  const userEntry = useMemo(() => entries.find((e) => e.isUser), [entries]);

  const periods: { key: TimePeriod; label: string }[] = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="section-title text-base flex items-center gap-2">
            <Trophy size={16} />
            Paper Trading Leaderboard
          </h3>
          <button
            onClick={() => setShowUsername((p) => !p)}
            className="rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-xs muted inline-flex items-center gap-1"
          >
            {showUsername ? <Eye size={12} /> : <EyeOff size={12} />}
            {showUsername ? "Username Visible" : "Anonymous"}
          </button>
        </div>

        <p className="text-xs muted">
          See how you stack up against other paper traders. Rankings are based on total return percentage.
          {!ledger && " Start paper trading on the Execution page to appear on the board."}
        </p>

        <div className="flex items-center gap-1.5">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                period === p.key
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                  : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* User Highlight */}
        {userEntry && (
          <div className="rounded-xl control-surface p-3 border border-[var(--accent)]/30 bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]">
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Your Position</div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <div className="flex items-center gap-2">
                {rankIcon(userEntry.rank)}
                <span className="text-lg font-semibold metric-value">#{userEntry.rank}</span>
              </div>
              <div>
                <div className="text-[11px] muted">Return</div>
                <div className={`text-sm font-semibold metric-value ${
                  userEntry.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                }`}>
                  {formatPct(userEntry.totalReturn)}
                </div>
              </div>
              <div>
                <div className="text-[11px] muted">Win Rate</div>
                <div className="text-sm font-semibold metric-value">{userEntry.winRate}%</div>
              </div>
              <div>
                <div className="text-[11px] muted">Trades</div>
                <div className="text-sm font-semibold metric-value">{userEntry.trades}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3">
          Top 10
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
                <th className="text-left py-2 pr-2 w-10">Rank</th>
                <th className="text-left py-2 pr-2">Trader</th>
                <th className="text-right py-2 px-2">Return</th>
                <th className="text-right py-2 px-2">Win Rate</th>
                <th className="text-right py-2 pl-2">Trades</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((entry) => (
                <tr
                  key={entry.username + entry.rank}
                  className={`border-t border-[var(--surface-border)] ${
                    entry.isUser
                      ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                      : ""
                  }`}
                >
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-1">
                      {rankIcon(entry.rank)}
                    </div>
                  </td>
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="muted" />
                      <span className={`text-xs font-semibold ${entry.isUser ? "text-[var(--accent)]" : ""}`}>
                        {entry.isUser && showUsername ? "You" : entry.username}
                        {entry.isUser && <span className="ml-1 text-[10px] muted">(you)</span>}
                      </span>
                    </div>
                  </td>
                  <td className={`py-2.5 px-2 text-right font-semibold metric-value text-xs ${
                    entry.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                  }`}>
                    {formatPct(entry.totalReturn)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-xs metric-value">
                    {entry.winRate}%
                  </td>
                  <td className="py-2.5 pl-2 text-right text-xs muted">
                    {entry.trades}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Remaining Entries */}
        {remaining.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded((p) => !p)}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs muted inline-flex items-center gap-1"
            >
              <ChevronDown size={12} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
              {expanded ? "Hide" : "Show"} Ranks #{11}-{entries.length}
            </button>

            {expanded && (
              <div className="mt-2 overflow-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {remaining.map((entry) => (
                      <tr
                        key={entry.username + entry.rank}
                        className={`border-t border-[var(--surface-border)] ${
                          entry.isUser
                            ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                            : ""
                        }`}
                      >
                        <td className="py-2 pr-2 w-10">
                          <span className="text-xs muted">{entry.rank}</span>
                        </td>
                        <td className="py-2 pr-2">
                          <span className={`text-xs ${entry.isUser ? "font-semibold text-[var(--accent)]" : "muted"}`}>
                            {entry.isUser && showUsername ? "You" : entry.username}
                            {entry.isUser && <span className="ml-1 text-[10px]">(you)</span>}
                          </span>
                        </td>
                        <td className={`py-2 px-2 text-right text-xs ${
                          entry.totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                        }`}>
                          {formatPct(entry.totalReturn)}
                        </td>
                        <td className="py-2 px-2 text-right text-xs muted">{entry.winRate}%</td>
                        <td className="py-2 pl-2 text-right text-xs muted">{entry.trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
