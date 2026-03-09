"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Heart,
  Copy,
  Share2,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  X,
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
  generateMockProfiles,
  getMyProfiles,
  shareProfile,
  likeProfile,
  getLikedProfiles,
  type AgentProfile,
} from "../../lib/agent-profiles";

const AGENT_META: Record<AgentId, { name: string; color: string; icon: typeof Radar }> = {
  "market-scanner": { name: "Market Scanner", color: "#3b82f6", icon: Radar },
  "portfolio-guardian": { name: "Portfolio Guardian", color: "#8b5cf6", icon: Shield },
  "research-analyst": { name: "Research Analyst", color: "#06b6d4", icon: Search },
  "risk-monitor": { name: "Risk Monitor", color: "#f59e0b", icon: AlertTriangle },
  "news-sentinel": { name: "News Sentinel", color: "#ec4899", icon: Newspaper },
  "trade-executor": { name: "Trade Executor", color: "#22c55e", icon: Zap },
};

const AGENT_IDS: AgentId[] = [
  "market-scanner", "portfolio-guardian", "research-analyst",
  "risk-monitor", "news-sentinel", "trade-executor",
];

type SortOption = "newest" | "most-liked" | "best-performance";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<AgentId | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [showShareForm, setShowShareForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Share form state
  const [formUsername, setFormUsername] = useState("");
  const [formAgentId, setFormAgentId] = useState<AgentId>("market-scanner");
  const [formSymbols, setFormSymbols] = useState("");
  const [formInterval, setFormInterval] = useState(15);
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    const mock = generateMockProfiles();
    const local = getMyProfiles();
    setProfiles([...local, ...mock]);
    setLikedIds(getLikedProfiles());
  }, []);

  const handleLike = (id: string) => {
    const wasLiked = likedIds.includes(id);
    likeProfile(id);
    setLikedIds((prev) =>
      wasLiked ? prev.filter((l) => l !== id) : [...prev, id]
    );
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likes: p.likes + (wasLiked ? -1 : 1) } : p
      )
    );
  };

  const handleCopyConfig = (profile: AgentProfile) => {
    const configText = JSON.stringify(profile.config, null, 2);
    navigator.clipboard.writeText(configText);
    setCopiedId(profile.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = () => {
    if (!formUsername.trim()) return;
    const newProfile: AgentProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      username: formUsername.trim(),
      agentId: formAgentId,
      config: {
        symbols: formSymbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
        interval: formInterval,
        notes: formNotes.trim(),
      },
      performance: {
        totalRuns: 0,
        avgConfidence: 0,
        topSignalType: "neutral",
      },
      sharedAt: new Date().toISOString(),
      likes: 0,
    };
    shareProfile(newProfile);
    setProfiles((prev) => [newProfile, ...prev]);
    setShowShareForm(false);
    setFormUsername("");
    setFormSymbols("");
    setFormNotes("");
  };

  const filtered = useMemo(() => {
    let list = filter === "all" ? profiles : profiles.filter((p) => p.agentId === filter);
    list = [...list].sort((a, b) => {
      if (sort === "newest") return new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime();
      if (sort === "most-liked") return b.likes - a.likes;
      return b.performance.avgConfidence - a.performance.avgConfidence;
    });
    return list;
  }, [profiles, filter, sort]);

  return (
    <PageShell
      title="Agent Profiles"
      subtitle="Discover and share community agent configurations"
      actions={
        <button
          onClick={() => setShowShareForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
            color: "var(--accent-2)",
          }}
        >
          {showShareForm ? <X size={15} /> : <Share2 size={15} />}
          {showShareForm ? "Cancel" : "Share My Agent"}
        </button>
      }
    >
      {/* Share Form */}
      {showShareForm && (
        <div className="glass-card p-5 mb-6 space-y-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            Share Your Agent Configuration
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
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Agent Type</label>
              <select
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value as AgentId)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              >
                {AGENT_IDS.map((id) => (
                  <option key={id} value={id}>{AGENT_META[id].name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Symbols (comma separated)</label>
              <input
                type="text"
                placeholder="AAPL, MSFT, TSLA"
                value={formSymbols}
                onChange={(e) => setFormSymbols(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Interval (min)</label>
              <input
                type="number"
                value={formInterval}
                onChange={(e) => setFormInterval(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>Notes</label>
              <input
                type="text"
                placeholder="Describe your strategy..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                style={{ color: "var(--ink)" }}
              />
            </div>
          </div>
          <button
            onClick={handleShare}
            disabled={!formUsername.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "var(--accent-2)" }}
          >
            Share Profile
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SlidersHorizontal size={14} style={{ color: "var(--ink-muted)" }} />
        {(["all", ...AGENT_IDS] as const).map((id) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: filter === id
                ? "color-mix(in srgb, var(--accent-2) 15%, transparent)"
                : "color-mix(in srgb, var(--ink) 6%, transparent)",
              color: filter === id ? "var(--accent-2)" : "var(--ink-muted)",
            }}
          >
            {id === "all" ? "All" : AGENT_META[id].name}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-5">
        <ArrowUpDown size={14} style={{ color: "var(--ink-muted)" }} />
        {([
          { key: "newest", label: "Newest" },
          { key: "most-liked", label: "Most Liked" },
          { key: "best-performance", label: "Best Performance" },
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

      {/* Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((profile) => {
          const meta = AGENT_META[profile.agentId];
          const Icon = meta.icon;
          const isLiked = likedIds.includes(profile.id);

          return (
            <div key={profile.id} className="glass-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: meta.color }}
                >
                  {profile.username.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>
                    {profile.username}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} style={{ color: meta.color }} />
                    <span className="text-xs font-medium" style={{ color: meta.color }}>
                      {meta.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Symbols */}
              <div className="flex flex-wrap gap-1.5">
                {profile.config.symbols.map((s) => (
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
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    background: "color-mix(in srgb, var(--ink) 6%, transparent)",
                    color: "var(--ink-muted)",
                  }}
                >
                  {profile.config.interval}min
                </span>
              </div>

              {/* Notes */}
              {profile.config.notes && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--ink-muted)" }}>
                  {profile.config.notes}
                </p>
              )}

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--ink)" }}>{profile.performance.totalRuns}</p>
                  <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Runs</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--ink)" }}>{profile.performance.avgConfidence}%</p>
                  <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Avg Conf</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}>
                  <p className="text-xs font-bold capitalize" style={{ color: "var(--ink)" }}>{profile.performance.topSignalType}</p>
                  <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Top Signal</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid var(--surface-border)" }}>
                <button
                  onClick={() => handleLike(profile.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isLiked
                      ? "color-mix(in srgb, var(--negative) 12%, transparent)"
                      : "color-mix(in srgb, var(--ink) 6%, transparent)",
                    color: isLiked ? "var(--negative)" : "var(--ink-muted)",
                  }}
                >
                  <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
                  {profile.likes}
                </button>
                <button
                  onClick={() => handleCopyConfig(profile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--ink) 6%, transparent)",
                    color: copiedId === profile.id ? "var(--positive)" : "var(--ink-muted)",
                  }}
                >
                  {copiedId === profile.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === profile.id ? "Copied!" : "Copy Config"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            No profiles found for this filter.
          </p>
        </div>
      )}
    </PageShell>
  );
}
