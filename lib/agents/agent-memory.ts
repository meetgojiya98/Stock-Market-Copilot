export type MemoryEntry = {
  id: string;
  timestamp: string;
  symbol: string;
  prediction: "bullish" | "bearish" | "neutral";
  confidence: number;
  targetPrice?: number;
  timeframe?: string;
  actualOutcome?: "correct" | "incorrect" | "pending";
  resolvedAt?: string;
  context: string;
};

export type AgentMemory = {
  agentId: string;
  memories: MemoryEntry[];
};

export type AgentAccuracy = {
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracyPercent: number;
};

const STORAGE_KEY = "zentrade_agent_memory_v1";
const MAX_MEMORIES = 1000;

function loadAllAgentMemories(): AgentMemory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveAllAgentMemories(agents: AgentMemory[]) {
  try {
    // Enforce total memory cap across all agents
    let totalCount = agents.reduce((sum, a) => sum + a.memories.length, 0);
    while (totalCount > MAX_MEMORIES && agents.length > 0) {
      // Remove oldest memories first (last in each agent's array)
      let oldestAgent: AgentMemory | null = null;
      let oldestTime = Infinity;
      for (const agent of agents) {
        if (agent.memories.length === 0) continue;
        const last = agent.memories[agent.memories.length - 1];
        const t = new Date(last.timestamp).getTime();
        if (t < oldestTime) {
          oldestTime = t;
          oldestAgent = agent;
        }
      }
      if (oldestAgent) {
        oldestAgent.memories.pop();
        totalCount--;
        if (oldestAgent.memories.length === 0) {
          agents = agents.filter((a) => a.agentId !== oldestAgent!.agentId);
        }
      } else {
        break;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch { /* ignore */ }
}

export function saveMemory(agentId: string, memory: MemoryEntry) {
  const all = loadAllAgentMemories();
  let agent = all.find((a) => a.agentId === agentId);
  if (!agent) {
    agent = { agentId, memories: [] };
    all.push(agent);
  }
  const idx = agent.memories.findIndex((m) => m.id === memory.id);
  if (idx >= 0) {
    agent.memories[idx] = memory;
  } else {
    agent.memories.unshift(memory);
  }
  saveAllAgentMemories(all);
}

export function loadMemories(agentId: string): MemoryEntry[] {
  const agent = loadAllAgentMemories().find((a) => a.agentId === agentId);
  return agent ? agent.memories : [];
}

export function loadAllMemories(): AgentMemory[] {
  return loadAllAgentMemories();
}

export function resolveMemory(
  memoryId: string,
  outcome: "correct" | "incorrect"
) {
  const all = loadAllAgentMemories();
  for (const agent of all) {
    const memory = agent.memories.find((m) => m.id === memoryId);
    if (memory) {
      memory.actualOutcome = outcome;
      memory.resolvedAt = new Date().toISOString();
      saveAllAgentMemories(all);
      return;
    }
  }
}

export function getAgentAccuracy(agentId: string): AgentAccuracy {
  const memories = loadMemories(agentId);
  const total = memories.length;
  const correct = memories.filter((m) => m.actualOutcome === "correct").length;
  const incorrect = memories.filter((m) => m.actualOutcome === "incorrect").length;
  const pending = memories.filter(
    (m) => !m.actualOutcome || m.actualOutcome === "pending"
  ).length;
  const resolved = correct + incorrect;
  const accuracyPercent = resolved > 0 ? (correct / resolved) * 100 : 0;

  return { total, correct, incorrect, pending, accuracyPercent };
}

export function getTopPredictors(): (AgentMemory & { accuracy: AgentAccuracy })[] {
  const all = loadAllAgentMemories();
  return all
    .map((agent) => ({
      ...agent,
      accuracy: getAgentAccuracy(agent.agentId),
    }))
    .filter((a) => a.accuracy.correct + a.accuracy.incorrect > 0)
    .sort((a, b) => b.accuracy.accuracyPercent - a.accuracy.accuracyPercent);
}

export function pruneOldMemories(daysOld: number) {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const all = loadAllAgentMemories();
  for (const agent of all) {
    agent.memories = agent.memories.filter((m) => {
      if (!m.resolvedAt) return true;
      return new Date(m.resolvedAt).getTime() >= cutoff;
    });
  }
  // Remove agents with no remaining memories
  const filtered = all.filter((a) => a.memories.length > 0);
  saveAllAgentMemories(filtered);
}
