"use client";

import { AgentContext, useAgentProvider } from "../lib/agents/agent-store";

export function AgentProviderWrapper({ children }: { children: React.ReactNode }) {
  const value = useAgentProvider();
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}
