"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Heart,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Zap,
  Filter,
  Search,
} from "lucide-react";
import PageShell from "../../components/PageShell";
import type { AgentId, SignalType } from "../../lib/agents/types";
import {
  generateMockFeed,
  getLocalSignals,
  addLocalSignal,
  type FeedSignal,
} from "../../lib/signal-feed";

const SIGNAL_COLORS: Record<SignalType, string> = {
  bullish: "var(--positive)",
  bearish: "var(--negative)",
  neutral: "var(--ink-muted)",
  alert: "var(--warning)",
  action: "var(--accent-2)",
};

const SIGNAL_ICONS: Record<SignalType, typeof TrendingUp> = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
  alert: AlertTriangle,
  action: Zap,
};

const AGENT_NAMES: Record<AgentId, string> = {
  "market-scanner": "Market Scanner",
  "portfolio-guardian": "Portfolio Guardian",
  "research-analyst": "Research Analyst",
  "risk-monitor": "Risk Monitor",
  "news-sentinel": "News Sentinel",
  "trade-executor": "Trade Executor",
};

const AGENT_IDS: AgentId[] = [
  "market-scanner", "portfolio-guardian", "research-analyst",
  "risk-monitor", "news-sentinel", "trade-executor",
];

type FilterType = "all" | "bullish" | "bearish" | "alerts";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<FeedSignal[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showPostForm, setShowPostForm] = useState(false);

  // Post form state
  const [formUsername, setFormUsername] = useState("");
  const [formAgentId, setFormAgentId] = useState<AgentId>("market-scanner");
  const [formSymbol, setFormSymbol] = useState("");
  const [formType, setFormType] = useState<SignalType>("bullish");
  const [formMessage, setFormMessage] = useState("");
  const [formConfidence, setFormConfidence] = useState(70);

  useEffect(() => {
    const mock = generateMockFeed();
    const local = getLocalSignals();
    setSignals([...local, ...mock]);
  }, []);

  const handleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSignals((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, likes: s.likes + (likedIds.has(id) ? -1 : 1) }
          : s
      )
    );
  };

  const handlePost = () => {
    if (!formUsername.trim() || !formSymbol.trim() || !formMessage.trim()) return;
    const newSignal: FeedSignal = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: formType,
      symbol: formSymbol.trim().toUpperCase(),
      message: formMessage.trim(),
      confidence: formConfidence,
      timestamp: new Date().toISOString(),
      agentId: formAgentId,
      username: formUsername.trim(),
      agentName: AGENT_NAMES[formAgentId],
      likes: 0,
    };
    addLocalSignal(newSignal);
    setSignals((prev) => [newSignal, ...prev]);
    setShowPostForm(false);
    setFormMessage("");
    setFormSymbol("");
  };

  const filtered = useMemo(() => {
    let list = signals;
    if (filter === "bullish") list = list.filter((s) => s.type === "bullish");
    else if (filter === "bearish") list = list.filter((s) => s.type === "bearish");
    else if (filter === "alerts") list = list.filter((s) => s.type === "alert" || s.type === "action");

    if (symbolFilter.trim()) {
      const sym = symbolFilter.trim().toUpperCase();
      list = list.filter((s) => s.symbol.includes(sym));
    }

    return list;
  }, [signals, filter, symbolFilter]);

  return (
    <PageShell
      title="Signal Feed"
      subtitle="Real-time agent signals from the community"
      actions={
        <button
          onClick={() => setShowPostForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
            color: "var(--accent-2)",
          }}
        >
          {showPostForm ? <X size={15} /> : <Plus size={15} />}
          {showPostForm ? "Cancel" : "Post Signal"}
        </button>
      }
    >
      {/* Post Form */}
      {showPostForm && (
        <div className="glass-card p-5 mb-6 space-y-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            Post a Signal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Username</label>
              <input
                type="text"
                placeholder="Your username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Symbol</label>
              <input
                type="text"
                placeholder="AAPL"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Agent</label>
              <select
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value as AgentId)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              >
                {AGENT_IDS.map((id) => (
                  <option key={id} value={id}>{AGENT_NAMES[id]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Signal Type</label>
              <div className="flex rounded-lg overflow-hidden border border-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                {(["bullish", "bearish", "neutral", "alert", "action"] as SignalType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormType(t)}
                    className="flex-1 px-1.5 py-2 text-[10px] font-medium transition-all capitalize"
                    style={{
                      background: formType === t
                        ? `color-mix(in srgb, ${SIGNAL_COLORS[t]} 20%, transparent)`
                        : "transparent",
                      color: formType === t ? SIGNAL_COLORS[t] : "var(--ink-muted)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                Confidence: {formConfidence}%
              </label>
              <input
                type="range"
                min={10}
                max={99}
                value={formConfidence}
                onChange={(e) => setFormConfidence(parseInt(e.target.value))}
                className="w-full accent-[var(--accent-2)]"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Message</label>
              <input
                type="text"
                placeholder="Describe the signal..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>
          </div>
          <button
            onClick={handlePost}
            disabled={!formUsername.trim() || !formSymbol.trim() || !formMessage.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "var(--accent-2)" }}
          >
            Post Signal
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--ink-muted)" }} />
          {(["all", "bullish", "bearish", "alerts"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={{
                background: filter === f
                  ? "color-mix(in srgb, var(--accent-2) 15%, transparent)"
                  : "color-mix(in srgb, var(--ink) 6%, transparent)",
                color: filter === f ? "var(--accent-2)" : "var(--ink-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            placeholder="Filter symbol..."
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
            style={{ color: "var(--ink)" }}
          />
        </div>
      </div>

      {/* Signal Feed */}
      <div className="space-y-3">
        {filtered.map((signal) => {
          const SignalIcon = SIGNAL_ICONS[signal.type];
          const color = SIGNAL_COLORS[signal.type];
          const isLiked = likedIds.has(signal.id);

          return (
            <div key={signal.id} className="glass-card p-4">
              <div className="flex gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: color }}
                >
                  {signal.username.charAt(0)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                      {signal.username}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--ink) 6%, transparent)", color: "var(--ink-muted)" }}>
                      {signal.agentName}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                      {timeAgo(signal.timestamp)}
                    </span>
                  </div>

                  {/* Signal badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                      style={{ background: color }}
                    >
                      <SignalIcon size={10} />
                      {signal.type}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                        color: "var(--accent-2)",
                      }}
                    >
                      {signal.symbol}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-xs leading-relaxed mb-2.5" style={{ color: "var(--ink)" }}>
                    {signal.message}
                  </p>

                  {/* Confidence Meter */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-medium" style={{ color: "var(--ink-muted)" }}>
                      Confidence
                    </span>
                    <div
                      className="flex-1 max-w-[120px] h-1.5 rounded-full overflow-hidden"
                      style={{ background: "color-mix(in srgb, var(--ink) 10%, transparent)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${signal.confidence}%`,
                          background: signal.confidence >= 70 ? "var(--positive)" : signal.confidence >= 50 ? "var(--warning)" : "var(--negative)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "var(--ink)" }}>
                      {signal.confidence}%
                    </span>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleLike(signal.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-all"
                    style={{ color: isLiked ? "var(--negative)" : "var(--ink-muted)" }}
                  >
                    <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
                    {signal.likes + (isLiked ? 1 : 0)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Radio size={32} className="mx-auto mb-3" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            No signals match your filters.
          </p>
        </div>
      )}
    </PageShell>
  );
}
