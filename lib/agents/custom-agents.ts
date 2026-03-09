import type { AgentConfig, AgentTool } from "./types";
import { AGENT_CONFIGS } from "./configs";

const STORAGE_KEY = "zentrade_custom_agents_v1";

export type CustomAgentConfig = AgentConfig & {
  isCustom: true;
};

const DEFAULT_TOOLS: AgentTool[] = [
  { id: "price", name: "Live Price", endpoint: "/api/stocks/price", description: "Fetch current price and change" },
  { id: "chart", name: "Price History", endpoint: "/api/stocks/chart", description: "Fetch OHLC chart data" },
  { id: "news", name: "News Feed", endpoint: "/api/stocks/news", description: "Recent news articles" },
];

function loadCustomAgents(): CustomAgentConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveCustomAgents(agents: CustomAgentConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch { /* ignore */ }
}

export function getCustomAgents(): CustomAgentConfig[] {
  return loadCustomAgents();
}

export function saveCustomAgent(agent: CustomAgentConfig) {
  const all = loadCustomAgents();
  const idx = all.findIndex((a) => a.id === agent.id);
  if (idx >= 0) all[idx] = agent;
  else all.unshift(agent);
  saveCustomAgents(all);
}

export function deleteCustomAgent(id: string) {
  saveCustomAgents(loadCustomAgents().filter((a) => a.id !== id));
}

export function getAllAgentConfigs(): (AgentConfig | CustomAgentConfig)[] {
  return [...AGENT_CONFIGS, ...loadCustomAgents()];
}

export function getAvailableTools(): AgentTool[] {
  return DEFAULT_TOOLS;
}

export function createBlankCustomAgent(): CustomAgentConfig {
  return {
    id: `custom-${Date.now()}` as never,
    name: "",
    description: "",
    icon: "Bot",
    color: "#6366f1",
    systemPrompt: `You are a custom trading analysis agent. Analyze the given symbols and provide insights.

Return your analysis as JSON:
{
  "summary": "one-line overview",
  "signals": [
    { "type": "bullish|bearish|neutral|alert", "symbol": "TICKER", "message": "insight", "confidence": 0-100 }
  ],
  "details": "full markdown analysis"
}`,
    tools: [DEFAULT_TOOLS[0], DEFAULT_TOOLS[1]],
    defaultInterval: 0,
    isCustom: true,
  };
}
