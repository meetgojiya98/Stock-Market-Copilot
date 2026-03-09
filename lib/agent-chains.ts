import type { AgentId, AgentRunResult } from "./agents/types";
import { runAgent } from "./agents/run-agent";

export type AgentChainStep = {
  agentId: AgentId;
  symbols: string[];
  passOutput: boolean;
};

export type AgentChain = {
  id: string;
  name: string;
  steps: AgentChainStep[];
  createdAt: string;
};

const STORAGE_KEY = "zentrade_agent_chains_v1";

export const PRESET_CHAINS: AgentChain[] = [
  {
    id: "preset-full-analysis",
    name: "Full Analysis",
    steps: [
      { agentId: "market-scanner", symbols: ["AAPL", "MSFT", "GOOGL"], passOutput: true },
      { agentId: "research-analyst", symbols: ["AAPL", "MSFT", "GOOGL"], passOutput: true },
      { agentId: "risk-monitor", symbols: ["AAPL", "MSFT", "GOOGL"], passOutput: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-news-to-trade",
    name: "News to Trade",
    steps: [
      { agentId: "news-sentinel", symbols: ["AAPL", "TSLA"], passOutput: true },
      { agentId: "research-analyst", symbols: ["AAPL", "TSLA"], passOutput: true },
      { agentId: "trade-executor", symbols: ["AAPL", "TSLA"], passOutput: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-portfolio-check",
    name: "Portfolio Check",
    steps: [
      { agentId: "portfolio-guardian", symbols: ["AAPL", "MSFT", "AMZN"], passOutput: true },
      { agentId: "risk-monitor", symbols: ["AAPL", "MSFT", "AMZN"], passOutput: true },
      { agentId: "market-scanner", symbols: ["AAPL", "MSFT", "AMZN"], passOutput: false },
    ],
    createdAt: new Date().toISOString(),
  },
];

export function getChains(): AgentChain[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChain(chain: AgentChain): void {
  const chains = getChains();
  const idx = chains.findIndex((c) => c.id === chain.id);
  if (idx >= 0) {
    chains[idx] = chain;
  } else {
    chains.push(chain);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chains));
}

export function deleteChain(id: string): void {
  const chains = getChains().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chains));
}

export type StepStatus = {
  stepIndex: number;
  status: "pending" | "running" | "done" | "error";
  result?: AgentRunResult;
  error?: string;
};

export async function runChain(
  chain: AgentChain,
  onStepComplete: (status: StepStatus) => void,
): Promise<AgentRunResult[]> {
  const results: AgentRunResult[] = [];
  let previousOutput = "";

  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];
    onStepComplete({ stepIndex: i, status: "running" });

    try {
      const context = step.passOutput && previousOutput ? previousOutput : undefined;
      const result = await runAgent(step.agentId, step.symbols, context);
      results.push(result);
      previousOutput = `Previous agent output:\n${result.summary}\n\n${result.details}`;
      onStepComplete({ stepIndex: i, status: "done", result });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      onStepComplete({ stepIndex: i, status: "error", error: errorMsg });
      break;
    }
  }

  return results;
}
