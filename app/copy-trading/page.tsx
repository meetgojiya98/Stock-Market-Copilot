"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
  Target,
  Activity,
  Radar,
  Shield,
  Search,
  AlertTriangle,
  Newspaper,
  Zap,
} from "lucide-react";
import PageShell from "../../components/PageShell";
import type { AgentId } from "../../lib/agents/types";
import {
  generateMockTraders,
  followTrader,
  unfollowTrader,
  type Trader,
} from "../../lib/copy-trading";

const AGENT_META: Record<AgentId, { name: string; color: string; icon: typeof Radar }> = {
  "market-scanner": { name: "Scanner", color: "#3b82f6", icon: Radar },
  "portfolio-guardian": { name: "Guardian", color: "#8b5cf6", icon: Shield },
  "research-analyst": { name: "Analyst", color: "#06b6d4", icon: Search },
  "risk-monitor": { name: "Risk", color: "#f59e0b", icon: AlertTriangle },
  "news-sentinel": { name: "News", color: "#ec4899", icon: Newspaper },
  "trade-executor": { name: "Executor", color: "#22c55e", icon: Zap },
};

const STRATEGIES = [
  "Momentum", "Value", "Swing Trading", "Day Trading",
  "Options Flow", "Sector Rotation", "Dividend Growth", "Contrarian",
];

const STRATEGY_COLORS: Record<string, string> = {
  Momentum: "#3b82f6",
  Value: "#8b5cf6",
  "Swing Trading": "#06b6d4",
  "Day Trading": "#f59e0b",
  "Options Flow": "#ec4899",
  "Sector Rotation": "#22c55e",
  "Dividend Growth": "#14b8a6",
  Contrarian: "#ef4444",
};

type SortOption = "performance" | "followers" | "win-rate";
type TabOption = "all" | "following";

export default function CopyTradingPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("performance");
  const [tab, setTab] = useState<TabOption>("all");

  useEffect(() => {
    setTraders(generateMockTraders());
  }, []);

  const handleFollow = (id: string) => {
    const trader = traders.find((t) => t.id === id);
    if (!trader) return;

    if (trader.isFollowing) {
      unfollowTrader(id);
    } else {
      followTrader(id);
    }

    setTraders((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              isFollowing: !t.isFollowing,
              followers: t.followers + (t.isFollowing ? -1 : 1),
            }
          : t
      )
    );
  };

  const filtered = useMemo(() => {
    let list = traders;

    if (tab === "following") {
      list = list.filter((t) => t.isFollowing);
    }

    if (strategyFilter !== "all") {
      list = list.filter((t) => t.strategy === strategyFilter);
    }

    list = [...list].sort((a, b) => {
      if (sort === "performance") return b.performance.totalReturn - a.performance.totalReturn;
      if (sort === "followers") return b.followers - a.followers;
      return b.performance.winRate - a.performance.winRate;
    });

    return list;
  }, [traders, strategyFilter, sort, tab]);

  return (
    <PageShell
      title="Copy Trading"
      subtitle="Follow top traders and replicate their agent strategies"
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "following"] as TabOption[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
            style={{
              background: tab === t
                ? "color-mix(in srgb, var(--accent-2) 15%, transparent)"
                : "color-mix(in srgb, var(--ink) 6%, transparent)",
              color: tab === t ? "var(--accent-2)" : "var(--ink-muted)",
            }}
          >
            {t === "following" ? `Following (${traders.filter((tr) => tr.isFollowing).length})` : "All Traders"}
          </button>
        ))}
      </div>

      {/* Strategy Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Activity size={14} style={{ color: "var(--ink-muted)" }} />
        <button
          onClick={() => setStrategyFilter("all")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: strategyFilter === "all"
              ? "color-mix(in srgb, var(--accent-2) 15%, transparent)"
              : "color-mix(in srgb, var(--ink) 6%, transparent)",
            color: strategyFilter === "all" ? "var(--accent-2)" : "var(--ink-muted)",
          }}
        >
          All
        </button>
        {STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setStrategyFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: strategyFilter === s
                ? `color-mix(in srgb, ${STRATEGY_COLORS[s]} 15%, transparent)`
                : "color-mix(in srgb, var(--ink) 6%, transparent)",
              color: strategyFilter === s ? STRATEGY_COLORS[s] : "var(--ink-muted)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-5">
        <ArrowUpDown size={14} style={{ color: "var(--ink-muted)" }} />
        {([
          { key: "performance", label: "Performance" },
          { key: "followers", label: "Followers" },
          { key: "win-rate", label: "Win Rate" },
        ] as const).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: sort === opt.key
                ? "color-mix(in srgb, var(--accent-2) 15%, transparent)"
                : "color-mix(in srgb, var(--ink) 6%, transparent)",
              color: sort === opt.key ? "var(--accent-2)" : "var(--ink-muted)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Trader Cards */}
      <div className="space-y-4">
        {filtered.map((trader) => {
          const stratColor = STRATEGY_COLORS[trader.strategy] || "var(--accent-2)";

          return (
            <div key={trader.id} className="glass-card p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Left: Avatar + Info */}
                <div className="flex gap-3 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                    style={{ background: stratColor }}
                  >
                    {trader.username.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                        {trader.username}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: stratColor }}
                      >
                        {trader.strategy}
                      </span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
                        <Users size={10} />
                        {trader.followers} followers
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--ink-muted)" }}>
                      {trader.description}
                    </p>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      <div className="p-2 rounded-lg text-center" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Target size={10} style={{ color: "var(--positive)" }} />
                          <span className="text-xs font-bold" style={{ color: "var(--positive)" }}>
                            {trader.performance.winRate}%
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Win Rate</p>
                      </div>
                      <div className="p-2 rounded-lg text-center" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <TrendingUp size={10} style={{ color: trader.performance.totalReturn >= 0 ? "var(--positive)" : "var(--negative)" }} />
                          <span className="text-xs font-bold" style={{ color: trader.performance.totalReturn >= 0 ? "var(--positive)" : "var(--negative)" }}>
                            {trader.performance.totalReturn >= 0 ? "+" : ""}{trader.performance.totalReturn}%
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Total Return</p>
                      </div>
                      <div className="p-2 rounded-lg text-center" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <BarChart3 size={10} style={{ color: "var(--accent-2)" }} />
                          <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {trader.performance.sharpe}
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Sharpe</p>
                      </div>
                      <div className="p-2 rounded-lg text-center" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Activity size={10} style={{ color: "var(--accent-2)" }} />
                          <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {trader.performance.trades}
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Trades</p>
                      </div>
                    </div>

                    {/* Agent Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-medium" style={{ color: "var(--ink-muted)" }}>Agents:</span>
                      {trader.agentIds.map((aid) => {
                        const meta = AGENT_META[aid];
                        const AgentIcon = meta.icon;
                        return (
                          <span
                            key={aid}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                              color: meta.color,
                            }}
                          >
                            <AgentIcon size={9} />
                            {meta.name}
                          </span>
                        );
                      })}
                    </div>

                    {/* Symbols */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-medium" style={{ color: "var(--ink-muted)" }}>Symbols:</span>
                      {trader.symbols.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                            color: "var(--accent-2)",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Follow Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                  <button
                    onClick={() => handleFollow(trader.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: trader.isFollowing
                        ? "color-mix(in srgb, var(--negative) 12%, transparent)"
                        : "color-mix(in srgb, var(--accent-2) 12%, transparent)",
                      color: trader.isFollowing ? "var(--negative)" : "var(--accent-2)",
                    }}
                  >
                    {trader.isFollowing ? (
                      <>
                        <UserMinus size={13} />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} />
                        Follow
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {tab === "following"
              ? "You are not following any traders yet."
              : "No traders match your filters."}
          </p>
        </div>
      )}
    </PageShell>
  );
}
