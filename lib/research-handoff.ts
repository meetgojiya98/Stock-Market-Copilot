"use client";

export type ResearchIdeaTicket = {
  id: string;
  createdAt: string;
  symbol: string;
  compareSymbol?: string;
  mode: string;
  verdict: string;
  confidence: number;
  signalScore: number;
  question: string;
  catalyst: string;
  entry: string;
  stop: string;
  target: string;
  suggestedSide: "buy" | "sell";
};

type LocalResult<T> = {
  ok: boolean;
  data: T;
  mode: "local";
  detail?: string;
};

const STORAGE_KEY = "smc_research_handoff_v1";

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
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

function sanitizeTicket(raw: unknown): ResearchIdeaTicket | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ResearchIdeaTicket>;
  const symbol = normalizeSymbol(String(candidate.symbol ?? ""));
  if (!symbol) return null;

  return {
    id: String(candidate.id ?? `idea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    createdAt: String(candidate.createdAt ?? new Date().toISOString()),
    symbol,
    ...(candidate.compareSymbol
      ? { compareSymbol: normalizeSymbol(String(candidate.compareSymbol)) }
      : {}),
    mode: String(candidate.mode ?? "thesis"),
    verdict: String(candidate.verdict ?? "Tactical setup"),
    confidence: Number.isFinite(Number(candidate.confidence)) ? Number(candidate.confidence) : 50,
    signalScore: Number.isFinite(Number(candidate.signalScore)) ? Number(candidate.signalScore) : 50,
    question: String(candidate.question ?? ""),
    catalyst: String(candidate.catalyst ?? ""),
    entry: String(candidate.entry ?? "Entry not provided."),
    stop: String(candidate.stop ?? "Stop not provided."),
    target: String(candidate.target ?? "Target not provided."),
    suggestedSide: candidate.suggestedSide === "sell" ? "sell" : "buy",
  };
}

function readTickets() {
  const raw = safeRead<ResearchIdeaTicket[]>(STORAGE_KEY, []);
  return raw
    .map((ticket) => sanitizeTicket(ticket))
    .filter((ticket): ticket is ResearchIdeaTicket => Boolean(ticket))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 80);
}

function writeTickets(tickets: ResearchIdeaTicket[]) {
  safeWrite(
    STORAGE_KEY,
    tickets
      .map((ticket) => sanitizeTicket(ticket))
      .filter((ticket): ticket is ResearchIdeaTicket => Boolean(ticket))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 80)
  );
}

export async function fetchResearchIdeaTickets(): Promise<LocalResult<ResearchIdeaTicket[]>> {
  return {
    ok: true,
    data: readTickets(),
    mode: "local",
  };
}

export async function pushResearchIdeaTicket(input: {
  symbol: string;
  compareSymbol?: string;
  mode: string;
  verdict: string;
  confidence: number;
  signalScore: number;
  question: string;
  catalyst: string;
  entry: string;
  stop: string;
  target: string;
  suggestedSide: "buy" | "sell";
}): Promise<LocalResult<ResearchIdeaTicket[]> & { ticket?: ResearchIdeaTicket }> {
  const symbol = normalizeSymbol(input.symbol);
  if (!symbol) {
    return {
      ok: false,
      data: readTickets(),
      mode: "local",
      detail: "A valid symbol is required.",
    };
  }

  const ticket: ResearchIdeaTicket = {
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    symbol,
    ...(input.compareSymbol ? { compareSymbol: normalizeSymbol(input.compareSymbol) } : {}),
    mode: input.mode,
    verdict: input.verdict,
    confidence: Number.isFinite(input.confidence) ? input.confidence : 50,
    signalScore: Number.isFinite(input.signalScore) ? input.signalScore : 50,
    question: input.question,
    catalyst: input.catalyst,
    entry: input.entry,
    stop: input.stop,
    target: input.target,
    suggestedSide: input.suggestedSide,
  };

  const next = [ticket, ...readTickets()];
  writeTickets(next);
  return {
    ok: true,
    data: next,
    mode: "local",
    ticket,
  };
}

export async function consumeResearchIdeaTicket(
  ticketId: string
): Promise<LocalResult<ResearchIdeaTicket[]>> {
  const next = readTickets().filter((ticket) => ticket.id !== ticketId);
  writeTickets(next);
  return {
    ok: true,
    data: next,
    mode: "local",
  };
}
