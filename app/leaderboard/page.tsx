"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, ChevronDown, ChevronUp, Plus, Check, X } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import {
  loadAllMemories,
  getAgentAccuracy,
  getTopPredictors,
  saveMemory,
  resolveMemory,
  type MemoryEntry,
  type AgentAccuracy,
} from "../../lib/agents/agent-memory";
import { getAgentConfig, AGENT_CONFIGS } from "../../lib/agents/configs";
import type { AgentId } from "../../lib/agents/types";

const ALL_AGENT_IDS: AgentId[] = [
  "market-scanner",
  "portfolio-guardian",
  "research-analyst",
  "risk-monitor",
  "news-sentinel",
  "trade-executor",
];

type RankedAgent = {
  id: AgentId;
  name: string;
  color: string;
  accuracy: AgentAccuracy;
  memories: MemoryEntry[];
};

function generateId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<RankedAgent[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formAgent, setFormAgent] = useState<AgentId>("market-scanner");
  const [formSymbol, setFormSymbol] = useState("");
  const [formPrediction, setFormPrediction] = useState<"bullish" | "bearish" | "neutral">("bullish");
  const [formConfidence, setFormConfidence] = useState(50);
  const [formTargetPrice, setFormTargetPrice] = useState("");
  const [formTimeframe, setFormTimeframe] = useState("");

  const refresh = useCallback(() => {
    const allMemories = loadAllMemories();
    const ranked: RankedAgent[] = ALL_AGENT_IDS.map((id) => {
      const config = getAgentConfig(id);
      const agentMem = allMemories.find((a) => a.agentId === id);
      return {
        id,
        name: config?.name ?? id,
        color: config?.color ?? "var(--accent-2)",
        accuracy: getAgentAccuracy(id),
        memories: agentMem?.memories ?? [],
      };
    });
    // Sort by accuracy descending, then by total predictions descending
    ranked.sort((a, b) => {
      if (b.accuracy.accuracyPercent !== a.accuracy.accuracyPercent) {
        return b.accuracy.accuracyPercent - a.accuracy.accuracyPercent;
      }
      return b.accuracy.total - a.accuracy.total;
    });
    setAgents(ranked);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRecordPrediction = () => {
    if (!formSymbol.trim()) return;
    const entry: MemoryEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      symbol: formSymbol.trim().toUpperCase(),
      prediction: formPrediction,
      confidence: formConfidence,
      targetPrice: formTargetPrice ? parseFloat(formTargetPrice) : undefined,
      timeframe: formTimeframe.trim() || undefined,
      actualOutcome: "pending",
      context: `Manual prediction: ${formPrediction} on ${formSymbol.trim().toUpperCase()} with ${formConfidence}% confidence`,
    };
    saveMemory(formAgent, entry);
    resetForm();
    setShowForm(false);
    refresh();
  };

  const resetForm = () => {
    setFormAgent("market-scanner");
    setFormSymbol("");
    setFormPrediction("bullish");
    setFormConfidence(50);
    setFormTargetPrice("");
    setFormTimeframe("");
  };

  const handleResolve = (memoryId: string, outcome: "correct" | "incorrect") => {
    resolveMemory(memoryId, outcome);
    refresh();
  };

  const hasAnyMemories = agents.some((a) => a.memories.length > 0);

  return (
    <AuthGuard>
      <PageShell title="Agent Leaderboard" subtitle="Track agent prediction accuracy and performance">
        {/* Record Prediction Button */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Agents ranked by prediction accuracy
          </p>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
              color: "var(--accent-2)",
            }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? "Cancel" : "Record Prediction"}
          </button>
        </div>

        {/* Record Prediction Form */}
        {showForm && (
          <div className="glass-card p-5 mb-6 space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--ink)" }}>
              Record New Prediction
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Agent Select */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Agent
                </label>
                <select
                  value={formAgent}
                  onChange={(e) => setFormAgent(e.target.value as AgentId)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                >
                  {AGENT_CONFIGS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Symbol */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Symbol
                </label>
                <input
                  type="text"
                  placeholder="AAPL"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>

              {/* Prediction */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Prediction
                </label>
                <div className="flex rounded-lg overflow-hidden border border-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                  {(["bullish", "bearish", "neutral"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormPrediction(p)}
                      className={`flex-1 px-2 py-2 text-xs font-medium transition-all capitalize ${
                        formPrediction === p
                          ? p === "bullish"
                            ? "bg-[#22c55e] text-white"
                            : p === "bearish"
                              ? "bg-[#ef4444] text-white"
                              : "bg-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] text-[var(--accent-2)]"
                          : ""
                      }`}
                      style={formPrediction !== p ? { color: "var(--ink-muted)" } : {}}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Slider */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Confidence: {formConfidence}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formConfidence}
                  onChange={(e) => setFormConfidence(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent-2)]"
                />
              </div>

              {/* Target Price */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Target Price (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  value={formTargetPrice}
                  onChange={(e) => setFormTargetPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>

              {/* Timeframe */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
                  Timeframe (optional)
                </label>
                <input
                  type="text"
                  placeholder="1 week, 30 days..."
                  value={formTimeframe}
                  onChange={(e) => setFormTimeframe(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-transparent outline-none focus:border-[var(--accent-2)] transition-colors"
                  style={{ color: "var(--ink)" }}
                />
              </div>
            </div>

            <button
              onClick={handleRecordPrediction}
              disabled={!formSymbol.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: "var(--accent-2)" }}
            >
              Save Prediction
            </button>
          </div>
        )}

        {/* Empty State */}
        {!hasAnyMemories ? (
          <div className="glass-card p-8 text-center">
            <Trophy size={32} className="mx-auto mb-3" style={{ color: "var(--ink-muted)" }} />
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              No predictions tracked yet. Run agents to start building their track record.
            </p>
          </div>
        ) : (
          /* Agent Cards */
          <div className="space-y-3">
            {agents.map((agent, rank) => {
              const acc = agent.accuracy;
              const resolved = acc.correct + acc.incorrect;
              const barPercent = resolved > 0 ? acc.accuracyPercent : 0;
              const isExpanded = expandedAgent === agent.id;

              return (
                <div key={agent.id} className="glass-card p-4">
                  {/* Agent Header */}
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <span
                      className="text-lg font-bold w-7 text-center shrink-0"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      #{rank + 1}
                    </span>

                    {/* Colored circle icon */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: agent.color }}
                    >
                      {agent.name.charAt(0)}
                    </div>

                    {/* Name + stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {agent.name}
                        </span>
                      </div>

                      {/* Stat pills */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-medium">
                        <span style={{ color: "var(--ink-muted)" }}>
                          {acc.total} predictions
                        </span>
                        <span style={{ color: "#22c55e" }}>
                          {acc.correct} correct
                        </span>
                        <span style={{ color: "#ef4444" }}>
                          {acc.incorrect} incorrect
                        </span>
                        <span style={{ color: "var(--ink-muted)" }}>
                          {acc.pending} pending
                        </span>
                      </div>
                    </div>

                    {/* Accuracy Number */}
                    <div className="text-right shrink-0">
                      <span
                        className="text-2xl font-bold"
                        style={{
                          color:
                            resolved > 0
                              ? acc.accuracyPercent >= 60
                                ? "#22c55e"
                                : acc.accuracyPercent >= 40
                                  ? "var(--warning, #f59e0b)"
                                  : "#ef4444"
                              : "var(--ink-muted)",
                        }}
                      >
                        {resolved > 0 ? `${acc.accuracyPercent.toFixed(1)}%` : "--"}
                      </span>
                      <div className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                        accuracy
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Bar */}
                  <div
                    className="mt-3 h-2 rounded-full overflow-hidden"
                    style={{ background: "color-mix(in srgb, var(--ink) 10%, transparent)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPercent}%`,
                        background: barPercent >= 60 ? "#22c55e" : barPercent >= 40 ? "var(--warning, #f59e0b)" : "#ef4444",
                      }}
                    />
                  </div>

                  {/* View Predictions Toggle */}
                  {agent.memories.length > 0 && (
                    <>
                      <button
                        onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium transition-all"
                        style={{ color: "var(--accent-2)" }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "Hide Predictions" : `View Predictions (${agent.memories.length})`}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {agent.memories.slice(0, 20).map((mem) => (
                            <div
                              key={mem.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg text-xs"
                              style={{
                                background: "color-mix(in srgb, var(--ink) 4%, transparent)",
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-bold" style={{ color: "var(--ink)" }}>
                                    {mem.symbol}
                                  </span>
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-white"
                                    style={{
                                      background:
                                        mem.prediction === "bullish"
                                          ? "#22c55e"
                                          : mem.prediction === "bearish"
                                            ? "#ef4444"
                                            : "var(--accent-2)",
                                    }}
                                  >
                                    {mem.prediction}
                                  </span>
                                  <span style={{ color: "var(--ink-muted)" }}>
                                    {mem.confidence}% conf
                                  </span>
                                  {mem.targetPrice && (
                                    <span style={{ color: "var(--ink-muted)" }}>
                                      TP: ${mem.targetPrice}
                                    </span>
                                  )}
                                  {mem.timeframe && (
                                    <span style={{ color: "var(--ink-muted)" }}>
                                      {mem.timeframe}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span style={{ color: "var(--ink-muted)" }}>
                                    {new Date(mem.timestamp).toLocaleDateString()}
                                  </span>
                                  {mem.actualOutcome && mem.actualOutcome !== "pending" && (
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-white"
                                      style={{
                                        background:
                                          mem.actualOutcome === "correct" ? "#22c55e" : "#ef4444",
                                      }}
                                    >
                                      {mem.actualOutcome}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Resolve buttons for pending */}
                              {(!mem.actualOutcome || mem.actualOutcome === "pending") && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => handleResolve(mem.id, "correct")}
                                    className="p-1.5 rounded-md transition-all hover:bg-[color-mix(in_srgb,#22c55e_15%,transparent)]"
                                    style={{ color: "#22c55e" }}
                                    title="Mark as correct"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleResolve(mem.id, "incorrect")}
                                    className="p-1.5 rounded-md transition-all hover:bg-[color-mix(in_srgb,#ef4444_15%,transparent)]"
                                    style={{ color: "#ef4444" }}
                                    title="Mark as incorrect"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
