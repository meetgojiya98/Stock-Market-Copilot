"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "../../components/PageShell";
import {
  Play,
  Plus,
  Trash2,
  ArrowRight,
  Check,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Link2,
  X,
} from "lucide-react";
import { AGENT_CONFIGS } from "../../lib/agents/configs";
import type { AgentId } from "../../lib/agents/types";
import {
  type AgentChain,
  type AgentChainStep,
  type StepStatus,
  PRESET_CHAINS,
  getChains,
  saveChain,
  deleteChain,
  runChain,
} from "../../lib/agent-chains";

const AGENT_LABELS: Record<AgentId, string> = {
  "market-scanner": "Market Scanner",
  "portfolio-guardian": "Portfolio Guardian",
  "research-analyst": "Research Analyst",
  "risk-monitor": "Risk Monitor",
  "news-sentinel": "News Sentinel",
  "trade-executor": "Trade Executor",
};

const AGENT_COLORS: Record<AgentId, string> = {
  "market-scanner": "var(--accent-2)",
  "portfolio-guardian": "var(--positive)",
  "research-analyst": "var(--accent-2)",
  "risk-monitor": "var(--warning)",
  "news-sentinel": "var(--accent-2)",
  "trade-executor": "var(--positive)",
};

function StepStatusIcon({ status }: { status: StepStatus["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-2)" }} />;
    case "done":
      return <Check size={16} style={{ color: "var(--positive)" }} />;
    case "error":
      return <X size={16} style={{ color: "var(--negative)" }} />;
    default:
      return <Clock size={16} style={{ color: "var(--ink-muted)" }} />;
  }
}

export default function ChainsPage() {
  const [customChains, setCustomChains] = useState<AgentChain[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSteps, setNewSteps] = useState<AgentChainStep[]>([]);
  const [stepAgent, setStepAgent] = useState<AgentId>("market-scanner");
  const [stepSymbols, setStepSymbols] = useState("AAPL, MSFT");
  const [stepPassOutput, setStepPassOutput] = useState(true);

  // Execution state
  const [runningChainId, setRunningChainId] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Map<string, StepStatus[]>>(new Map());
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCustomChains(getChains());
  }, []);

  const allChains = [...PRESET_CHAINS, ...customChains];

  const handleRunChain = useCallback(async (chain: AgentChain) => {
    if (runningChainId) return;
    setRunningChainId(chain.id);

    const initialStatuses: StepStatus[] = chain.steps.map((_, i) => ({
      stepIndex: i,
      status: "pending",
    }));
    setStepStatuses((prev) => new Map(prev).set(chain.id, initialStatuses));

    await runChain(chain, (status) => {
      setStepStatuses((prev) => {
        const next = new Map(prev);
        const arr = [...(next.get(chain.id) || initialStatuses)];
        arr[status.stepIndex] = status;
        next.set(chain.id, arr);
        return next;
      });
    });

    setRunningChainId(null);
    setExpandedResults((prev) => new Set(prev).add(chain.id));
  }, [runningChainId]);

  const handleCreateChain = () => {
    if (!newName.trim() || newSteps.length === 0) return;
    const chain: AgentChain = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      steps: newSteps,
      createdAt: new Date().toISOString(),
    };
    saveChain(chain);
    setCustomChains(getChains());
    setNewName("");
    setNewSteps([]);
    setShowCreate(false);
  };

  const addStep = () => {
    const symbols = stepSymbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (symbols.length === 0) return;
    setNewSteps([...newSteps, { agentId: stepAgent, symbols, passOutput: stepPassOutput }]);
  };

  const handleDelete = (id: string) => {
    deleteChain(id);
    setCustomChains(getChains());
  };

  const toggleExpand = (id: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageShell
      title="Agent Chains"
      subtitle="Chain multiple AI agents into sequential analysis pipelines"
      actions={
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--accent-2)",
            color: "#fff",
          }}
        >
          <Plus size={16} />
          Create Chain
        </button>
      }
    >
      {/* Create Chain Form */}
      {showCreate && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            New Chain
          </h3>
          <input
            type="text"
            placeholder="Chain name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "var(--surface-2)",
              color: "var(--ink)",
              border: "1px solid var(--surface-border)",
            }}
          />

          {/* Steps added so far */}
          {newSteps.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {newSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink)",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    {AGENT_LABELS[step.agentId]}
                    <span style={{ color: "var(--ink-muted)" }}> ({step.symbols.join(", ")})</span>
                  </span>
                  {i < newSteps.length - 1 && (
                    <ArrowRight size={14} style={{ color: "var(--ink-muted)" }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add step controls */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Agent</label>
              <select
                value={stepAgent}
                onChange={(e) => setStepAgent(e.target.value as AgentId)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                {AGENT_CONFIGS.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Symbols</label>
              <input
                type="text"
                placeholder="AAPL, MSFT"
                value={stepSymbols}
                onChange={(e) => setStepSymbols(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none w-40"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--surface-border)",
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }}>
              <input
                type="checkbox"
                checked={stepPassOutput}
                onChange={(e) => setStepPassOutput(e.target.checked)}
              />
              Pass output to next
            </label>
            <button
              onClick={addStep}
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{
                background: "var(--surface-2)",
                color: "var(--accent-2)",
                border: "1px solid var(--surface-border)",
              }}
            >
              + Add Step
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateChain}
              disabled={!newName.trim() || newSteps.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent-2)", color: "#fff" }}
            >
              Save Chain
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewSteps([]); setNewName(""); }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: "var(--ink-muted)", background: "var(--surface-2)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chain cards */}
      <div className="grid gap-4">
        {allChains.map((chain) => {
          const statuses = stepStatuses.get(chain.id);
          const isRunning = runningChainId === chain.id;
          const isExpanded = expandedResults.has(chain.id);
          const isPreset = chain.id.startsWith("preset-");

          return (
            <div key={chain.id} className="glass-card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link2 size={18} style={{ color: "var(--accent-2)" }} />
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {chain.name}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {chain.steps.length} steps
                      {isPreset ? " (Preset)" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunChain(chain)}
                    disabled={!!runningChainId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
                    style={{ background: "var(--accent-2)", color: "#fff" }}
                  >
                    {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {isRunning ? "Running..." : "Run Chain"}
                  </button>
                  {!isPreset && (
                    <button
                      onClick={() => handleDelete(chain.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                      style={{ color: "var(--negative)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Pipeline visualization */}
              <div className="flex flex-wrap items-center gap-2">
                {chain.steps.map((step, i) => {
                  const status = statuses?.[i];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: "var(--surface-2)",
                          border: `1px solid ${status?.status === "running" ? "var(--accent-2)" : status?.status === "done" ? "var(--positive)" : status?.status === "error" ? "var(--negative)" : "var(--surface-border)"}`,
                          color: "var(--ink)",
                        }}
                      >
                        {status && <StepStatusIcon status={status.status} />}
                        <span>{AGENT_LABELS[step.agentId]}</span>
                        {step.passOutput && i < chain.steps.length - 1 && (
                          <span
                            className="ml-1 text-[10px] px-1 py-0.5 rounded"
                            style={{ background: "var(--accent-2)", color: "#fff", opacity: 0.8 }}
                          >
                            pass
                          </span>
                        )}
                      </div>
                      {i < chain.steps.length - 1 && (
                        <ArrowRight size={14} style={{ color: "var(--ink-muted)" }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Results */}
              {statuses && statuses.some((s) => s.result) && (
                <div>
                  <button
                    onClick={() => toggleExpand(chain.id)}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: "var(--accent-2)" }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? "Hide Results" : "Show Results"}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      {statuses.map((s, i) => {
                        if (!s.result) return null;
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-lg space-y-1"
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--surface-border)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded"
                                style={{
                                  background: AGENT_COLORS[chain.steps[i].agentId],
                                  color: "#fff",
                                }}
                              >
                                {AGENT_LABELS[chain.steps[i].agentId]}
                              </span>
                            </div>
                            <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                              {s.result.summary}
                            </p>
                            <p
                              className="text-xs whitespace-pre-wrap leading-relaxed"
                              style={{ color: "var(--ink-muted)" }}
                            >
                              {s.result.details.slice(0, 600)}
                              {s.result.details.length > 600 ? "..." : ""}
                            </p>
                            {s.result.signals.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {s.result.signals.map((sig, si) => (
                                  <span
                                    key={si}
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      background:
                                        sig.type === "bullish"
                                          ? "var(--positive)"
                                          : sig.type === "bearish"
                                          ? "var(--negative)"
                                          : "var(--accent-2)",
                                      color: "#fff",
                                    }}
                                  >
                                    {sig.symbol} {sig.type} ({sig.confidence}%)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
