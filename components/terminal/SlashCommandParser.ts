import type { AgentId } from "../../lib/agents/types";

export type ParsedCommand = {
  type: "agent" | "chat";
  agentId?: AgentId;
  symbols: string[];
  query: string;
};

const COMMAND_MAP: Record<string, AgentId> = {
  "/scan": "market-scanner",
  "/guard": "portfolio-guardian",
  "/research": "research-analyst",
  "/risk": "risk-monitor",
  "/news": "news-sentinel",
  "/trade": "trade-executor",
};

export const AVAILABLE_COMMANDS = Object.entries(COMMAND_MAP).map(([cmd, agentId]) => ({
  command: cmd,
  agentId,
  description: {
    "/scan": "Scan market for technical setups",
    "/guard": "Check portfolio risk exposure",
    "/research": "Deep research on a symbol",
    "/risk": "Analyze volatility and risk metrics",
    "/news": "Monitor news and sentiment",
    "/trade": "Plan entry/exit strategy",
  }[cmd] || "",
}));

export function parseSlashCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { type: "chat", symbols: [], query: trimmed };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (COMMAND_MAP[cmd]) {
    const rest = parts.slice(1);
    const symbols: string[] = [];
    const queryParts: string[] = [];

    for (const part of rest) {
      if (/^[A-Z]{1,5}$/i.test(part) && symbols.length < 5) {
        symbols.push(part.toUpperCase());
      } else {
        queryParts.push(part);
      }
    }

    return {
      type: "agent",
      agentId: COMMAND_MAP[cmd],
      symbols: symbols.length ? symbols : ["AAPL"],
      query: queryParts.join(" "),
    };
  }

  return { type: "chat", symbols: [], query: trimmed };
}
