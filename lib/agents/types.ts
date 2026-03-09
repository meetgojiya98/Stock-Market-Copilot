export type AgentId =
  | "market-scanner"
  | "portfolio-guardian"
  | "research-analyst"
  | "risk-monitor"
  | "news-sentinel"
  | "trade-executor";

export type SignalType = "bullish" | "bearish" | "neutral" | "alert" | "action";

export type AgentTool = {
  id: string;
  name: string;
  endpoint: string;
  description: string;
};

export type AgentConfig = {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  tools: AgentTool[];
  defaultInterval: number;
};

export type AgentSignal = {
  type: SignalType;
  symbol: string;
  message: string;
  confidence: number;
  timestamp: string;
  agentId: AgentId;
};

export type AgentRunResult = {
  timestamp: string;
  summary: string;
  details: string;
  signals: AgentSignal[];
};

export type AgentInstance = {
  id: string;
  configId: AgentId;
  status: "idle" | "running" | "completed" | "error";
  symbols: string[];
  lastRun: string | null;
  lastResult: AgentRunResult | null;
  enabled: boolean;
  createdAt: string;
};

export type AgentState = {
  instances: AgentInstance[];
  signals: AgentSignal[];
};
