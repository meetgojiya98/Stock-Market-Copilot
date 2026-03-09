"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { useState, useEffect } from "react";
import { Play, Plus, Trash2, ChevronRight, Check, Loader2, Zap, GitBranch, ArrowRight } from "lucide-react";
import { AGENT_CONFIGS } from "../../lib/agents/configs";
import type { AgentId } from "../../lib/agents/types";
import { useAgents } from "../../lib/agents/agent-store";

type WorkflowStep = {
  agentId: AgentId;
  symbolSource: "input" | "previous-signals";
  label?: string;
};

type Workflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
};

type StepResult = {
  agentId: AgentId;
  summary: string;
  details: string;
  status: "pending" | "running" | "completed" | "error";
};

const STORAGE_KEY = "zentrade_workflows_v1";

const PRESETS: Omit<Workflow, "id" | "createdAt">[] = [
  {
    name: "Full Analysis Pipeline",
    description: "Scan → Research → Trade Plan",
    steps: [
      { agentId: "market-scanner", symbolSource: "input", label: "Scan Markets" },
      { agentId: "research-analyst", symbolSource: "input", label: "Deep Research" },
      { agentId: "trade-executor", symbolSource: "input", label: "Plan Trades" },
    ],
  },
  {
    name: "Risk-First Trading",
    description: "Risk Check → News → Trade",
    steps: [
      { agentId: "risk-monitor", symbolSource: "input", label: "Assess Risk" },
      { agentId: "news-sentinel", symbolSource: "input", label: "Check News" },
      { agentId: "trade-executor", symbolSource: "input", label: "Plan Entry" },
    ],
  },
  {
    name: "Portfolio Health Check",
    description: "Guardian → Risk → Scan",
    steps: [
      { agentId: "portfolio-guardian", symbolSource: "input", label: "Review Portfolio" },
      { agentId: "risk-monitor", symbolSource: "input", label: "Risk Analysis" },
      { agentId: "market-scanner", symbolSource: "previous-signals", label: "Scan Flagged" },
    ],
  },
];

function loadWorkflows(): Workflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveWorkflows(workflows: Workflow[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows)); } catch {}
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [symbols, setSymbols] = useState("AAPL, MSFT");
  const [running, setRunning] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const { addSignals } = useAgents();

  useEffect(() => {
    const saved = loadWorkflows();
    if (saved.length === 0) {
      const defaults = PRESETS.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }));
      saveWorkflows(defaults);
      setWorkflows(defaults);
    } else {
      setWorkflows(saved);
    }
  }, []);

  const addPreset = (preset: typeof PRESETS[0]) => {
    const wf: Workflow = { ...preset, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const next = [wf, ...workflows];
    setWorkflows(next);
    saveWorkflows(next);
  };

  const deleteWorkflow = (id: string) => {
    const next = workflows.filter((w) => w.id !== id);
    setWorkflows(next);
    saveWorkflows(next);
  };

  const runWorkflow = async (workflow: Workflow) => {
    if (running) return;
    setRunning(workflow.id);
    const syms = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const results: StepResult[] = workflow.steps.map((s) => ({
      agentId: s.agentId,
      summary: "",
      details: "",
      status: "pending" as const,
    }));
    setStepResults(results);
    setExpandedResult(null);

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      results[i] = { ...results[i], status: "running" };
      setStepResults([...results]);

      try {
        const context = i > 0
          ? `Previous analysis from ${AGENT_CONFIGS.find((c) => c.id === results[i - 1].agentId)?.name}:\n${results[i - 1].summary}\n\n${results[i - 1].details?.slice(0, 500)}`
          : undefined;

        const res = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: step.agentId,
            symbols: syms,
            toolData: `Symbols: ${syms.join(", ")}`,
            systemPrompt: AGENT_CONFIGS.find((c) => c.id === step.agentId)?.systemPrompt || "",
            context,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.text || "";
          let summary = text.slice(0, 120);
          let signals: any[] = [];
          try {
            const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
            summary = json.summary || summary;
            signals = json.signals || [];
          } catch {}
          results[i] = { ...results[i], summary, details: text, status: "completed" };
          if (signals.length) addSignals(signals.map((s: any) => ({ ...s, timestamp: new Date().toISOString(), agentId: step.agentId })));
        } else {
          results[i] = { ...results[i], status: "error", summary: "Agent failed" };
        }
      } catch {
        results[i] = { ...results[i], status: "error", summary: "Network error" };
      }

      setStepResults([...results]);
    }

    setRunning(null);
  };

  const getAgentConfig = (id: AgentId) => AGENT_CONFIGS.find((c) => c.id === id);

  return (
    <AuthGuard>
      <PageShell title="Workflows" subtitle="Chain multiple agents together for comprehensive analysis">
        <div className="space-y-4">
          {/* Symbol input */}
          <div className="glass-card p-4">
            <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1.5 block">Symbols to Analyze</label>
            <input
              type="text"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value.toUpperCase())}
              placeholder="AAPL, MSFT, NVDA"
              className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-[var(--ink)] border border-[var(--border)] outline-none focus:border-[var(--accent-2)]"
            />
          </div>

          {/* Workflow cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {workflows.map((wf) => (
              <div key={wf.id} className="glass-card p-4 relative group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <GitBranch size={14} className="text-[var(--accent-2)]" />
                      <span className="text-sm font-bold text-[var(--ink)]">{wf.name}</span>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">{wf.description}</p>
                  </div>
                  <button
                    onClick={() => deleteWorkflow(wf.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--ink-muted)] hover:text-[var(--negative)] transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Steps visualization */}
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {wf.steps.map((step, i) => {
                    const config = getAgentConfig(step.agentId);
                    return (
                      <div key={i} className="flex items-center gap-1">
                        <span
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                          style={{
                            background: `color-mix(in srgb, ${config?.color || "var(--accent-2)"} 10%, transparent)`,
                            color: config?.color || "var(--accent-2)",
                          }}
                        >
                          {step.label || config?.name}
                        </span>
                        {i < wf.steps.length - 1 && <ArrowRight size={10} className="text-[var(--ink-muted)]" />}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => runWorkflow(wf)}
                  disabled={running !== null}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: "var(--accent-2)" }}
                >
                  {running === wf.id ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  {running === wf.id ? "Running..." : "Run Workflow"}
                </button>
              </div>
            ))}
          </div>

          {/* Run Results */}
          {stepResults.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-[var(--accent-2)]" />
                <span className="text-sm font-bold text-[var(--ink)]">Workflow Results</span>
              </div>
              <div className="space-y-2">
                {stepResults.map((sr, i) => {
                  const config = getAgentConfig(sr.agentId);
                  return (
                    <div key={i} className="border border-[var(--border)] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]"
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${config?.color} 12%, transparent)` }}>
                          {sr.status === "running" && <Loader2 size={12} className="animate-spin" style={{ color: config?.color }} />}
                          {sr.status === "completed" && <Check size={12} className="text-[var(--positive)]" />}
                          {sr.status === "pending" && <span className="w-2 h-2 rounded-full bg-[var(--ink-muted)] opacity-30" />}
                          {sr.status === "error" && <span className="text-[var(--negative)] text-xs font-bold">!</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-[var(--ink)]">{config?.name}</span>
                          {sr.summary && <p className="text-[11px] text-[var(--ink-muted)] truncate">{sr.summary}</p>}
                        </div>
                        <ChevronRight size={14} className={`text-[var(--ink-muted)] transition-transform ${expandedResult === i ? "rotate-90" : ""}`} />
                      </button>
                      {expandedResult === i && sr.details && (
                        <div className="px-4 pb-3 text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border-t border-[var(--border)] pt-3">
                          {sr.details}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  );
}
