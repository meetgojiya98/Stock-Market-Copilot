"use client";

import type { PaperOrderSide, PaperOrderType } from "./paper-trading";

export type ExecutionPlaybook = {
  id: string;
  name: string;
  side: PaperOrderSide;
  orderType: PaperOrderType;
  quantity: number;
  baseSlippageBps: number;
  stopDistancePct: number;
  takeProfitPct: number;
  riskPerTradePct: number;
  note: string;
  createdAt: string;
};

type LocalResult<T> = {
  ok: boolean;
  data: T;
  mode: "local";
  detail?: string;
};

const STORAGE_KEY = "smc_execution_playbooks_v1";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizePlaybook(raw: unknown): ExecutionPlaybook | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ExecutionPlaybook>;
  const name = String(candidate.name ?? "").trim();
  if (!name) return null;

  return {
    id: String(candidate.id ?? `playbook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name,
    side: candidate.side === "sell" ? "sell" : "buy",
    orderType: candidate.orderType === "limit" ? "limit" : "market",
    quantity: clamp(Math.floor(Number(candidate.quantity ?? 10)), 1, 100000),
    baseSlippageBps: clamp(Number(candidate.baseSlippageBps ?? 8), 0, 250),
    stopDistancePct: clamp(Number(candidate.stopDistancePct ?? 2), 0.1, 40),
    takeProfitPct: clamp(Number(candidate.takeProfitPct ?? 4), 0.1, 120),
    riskPerTradePct: clamp(Number(candidate.riskPerTradePct ?? 1), 0.1, 20),
    note: String(candidate.note ?? "").trim(),
    createdAt: String(candidate.createdAt ?? nowIso()),
  };
}

function defaultPlaybooks(): ExecutionPlaybook[] {
  return [
    {
      id: "pb-breakout",
      name: "Momentum Breakout",
      side: "buy",
      orderType: "market",
      quantity: 20,
      baseSlippageBps: 10,
      stopDistancePct: 2.5,
      takeProfitPct: 6.5,
      riskPerTradePct: 1.2,
      note: "Follow-through setup with tight invalidation below breakout candle.",
      createdAt: nowIso(),
    },
    {
      id: "pb-pullback",
      name: "Trend Pullback",
      side: "buy",
      orderType: "limit",
      quantity: 15,
      baseSlippageBps: 6,
      stopDistancePct: 1.8,
      takeProfitPct: 5.2,
      riskPerTradePct: 0.9,
      note: "Scale near support with pre-defined risk cap.",
      createdAt: nowIso(),
    },
    {
      id: "pb-riskoff",
      name: "Risk-Off Hedge",
      side: "sell",
      orderType: "market",
      quantity: 10,
      baseSlippageBps: 12,
      stopDistancePct: 3.2,
      takeProfitPct: 7.5,
      riskPerTradePct: 1.0,
      note: "Short tactical hedge during macro shock windows.",
      createdAt: nowIso(),
    },
  ];
}

function readPlaybooks() {
  const raw = safeRead<ExecutionPlaybook[]>(STORAGE_KEY, []);
  const parsed = raw
    .map((item) => sanitizePlaybook(item))
    .filter((item): item is ExecutionPlaybook => Boolean(item))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  if (parsed.length) return parsed;
  return defaultPlaybooks();
}

function writePlaybooks(playbooks: ExecutionPlaybook[]) {
  safeWrite(
    STORAGE_KEY,
    playbooks
      .map((item) => sanitizePlaybook(item))
      .filter((item): item is ExecutionPlaybook => Boolean(item))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 50)
  );
}

export async function fetchExecutionPlaybooks(): Promise<LocalResult<ExecutionPlaybook[]>> {
  const playbooks = readPlaybooks();
  if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
    writePlaybooks(playbooks);
  }
  return {
    ok: true,
    data: playbooks,
    mode: "local",
  };
}

export async function saveExecutionPlaybook(input: {
  name: string;
  side: PaperOrderSide;
  orderType: PaperOrderType;
  quantity: number;
  baseSlippageBps: number;
  stopDistancePct: number;
  takeProfitPct: number;
  riskPerTradePct: number;
  note?: string;
}): Promise<LocalResult<ExecutionPlaybook[]> & { playbook?: ExecutionPlaybook }> {
  const name = input.name.trim();
  const current = readPlaybooks();
  if (!name) {
    return {
      ok: false,
      data: current,
      mode: "local",
      detail: "Playbook name is required.",
    };
  }

  const playbook: ExecutionPlaybook = {
    id: `playbook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    side: input.side === "sell" ? "sell" : "buy",
    orderType: input.orderType === "limit" ? "limit" : "market",
    quantity: clamp(Math.floor(Number(input.quantity || 1)), 1, 100000),
    baseSlippageBps: clamp(Number(input.baseSlippageBps || 0), 0, 250),
    stopDistancePct: clamp(Number(input.stopDistancePct || 1), 0.1, 40),
    takeProfitPct: clamp(Number(input.takeProfitPct || 1), 0.1, 120),
    riskPerTradePct: clamp(Number(input.riskPerTradePct || 1), 0.1, 20),
    note: String(input.note || "").trim(),
    createdAt: nowIso(),
  };

  const next = [playbook, ...current].slice(0, 50);
  writePlaybooks(next);
  return {
    ok: true,
    data: next,
    mode: "local",
    playbook,
  };
}

export async function deleteExecutionPlaybook(
  playbookId: string
): Promise<LocalResult<ExecutionPlaybook[]>> {
  const next = readPlaybooks().filter((item) => item.id !== playbookId);
  writePlaybooks(next);
  return {
    ok: true,
    data: next,
    mode: "local",
  };
}
