import type { AgentId, AgentRunResult, AgentSignal } from "./types";
import { runAgent } from "./run-agent";

export type WorkflowStep = {
  agentId: AgentId;
  symbolSource: "input" | "previous-signals";
  label?: string;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
};

export type WorkflowRunStatus = {
  currentStep: number;
  totalSteps: number;
  stepResults: { agentId: AgentId; result: AgentRunResult; status: "pending" | "running" | "completed" | "error" }[];
  status: "running" | "completed" | "error";
};

const STORAGE_KEY = "zentrade_workflows_v1";

function loadWorkflows(): Workflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveWorkflows(workflows: Workflow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  } catch { /* ignore */ }
}

export function getWorkflows(): Workflow[] {
  return loadWorkflows();
}

export function saveWorkflow(workflow: Workflow) {
  const all = loadWorkflows();
  const idx = all.findIndex((w) => w.id === workflow.id);
  if (idx >= 0) all[idx] = workflow;
  else all.unshift(workflow);
  saveWorkflows(all);
}

export function deleteWorkflow(id: string) {
  saveWorkflows(loadWorkflows().filter((w) => w.id !== id));
}

export const PRESET_WORKFLOWS: Omit<Workflow, "id" | "createdAt">[] = [
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
    description: "Guardian → Risk → Rebalance",
    steps: [
      { agentId: "portfolio-guardian", symbolSource: "input", label: "Portfolio Review" },
      { agentId: "risk-monitor", symbolSource: "input", label: "Risk Analysis" },
      { agentId: "market-scanner", symbolSource: "previous-signals", label: "Scan Flagged" },
    ],
  },
];

export async function runWorkflow(
  workflow: Workflow,
  inputSymbols: string[],
  onProgress: (status: WorkflowRunStatus) => void,
  onSignals?: (signals: AgentSignal[]) => void,
): Promise<WorkflowRunStatus> {
  const status: WorkflowRunStatus = {
    currentStep: 0,
    totalSteps: workflow.steps.length,
    stepResults: workflow.steps.map((s) => ({
      agentId: s.agentId,
      result: { timestamp: "", summary: "", details: "", signals: [] },
      status: "pending" as const,
    })),
    status: "running",
  };

  let currentSymbols = inputSymbols;
  let allSignals: AgentSignal[] = [];

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    status.currentStep = i;
    status.stepResults[i].status = "running";
    onProgress({ ...status });

    const symbols = step.symbolSource === "previous-signals" && allSignals.length
      ? [...new Set(allSignals.map((s) => s.symbol).filter(Boolean))]
      : currentSymbols;

    if (symbols.length === 0) {
      symbols.push(...inputSymbols);
    }

    try {
      const context = i > 0
        ? `Previous analysis:\n${status.stepResults[i - 1].result.summary}\n\nKey findings:\n${status.stepResults[i - 1].result.details?.slice(0, 500)}`
        : undefined;

      const result = await runAgent(step.agentId, symbols, context);
      status.stepResults[i] = { agentId: step.agentId, result, status: "completed" };
      allSignals = [...allSignals, ...result.signals];
      if (result.signals.length && onSignals) onSignals(result.signals);
    } catch {
      status.stepResults[i].status = "error";
      status.status = "error";
      onProgress({ ...status });
      return status;
    }

    onProgress({ ...status });
  }

  status.status = "completed";
  onProgress({ ...status });
  return status;
}
