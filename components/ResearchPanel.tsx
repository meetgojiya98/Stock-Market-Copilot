"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  BrainCircuit,
  Compass,
  Copy,
  Eraser,
  FlaskConical,
  Library,
  Link2,
  Loader2,
  MessageSquareText,
  Plus,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { createLocalAlert } from "../lib/data-client";
import { pushResearchIdeaTicket } from "../lib/research-handoff";
import AdvancedMarketChart from "./AdvancedMarketChart";
import {
  buildResearchDecisionPacket,
  coerceDecisionPacket,
  extractJsonObject,
  fetchSymbolContext,
  markdownFromDecisionPacket,
  normalizeSymbol,
  workspaceTitle,
  type HorizonMode,
  type NewsItem,
  type ResearchDecisionPacket,
  type ResearchMode,
  type RiskProfile,
  type SymbolContext,
} from "../lib/research-engine";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const WORKSPACES_KEY = "smc_research_workspaces_v4";
const COPILOT_STORAGE_PREFIX = "smc_research_copilot_thread_v2";

type Workspace = {
  id: string;
  createdAt: string;
  title: string;
  primarySymbol: string;
  compareSymbol: string;
  benchmarkSymbol: string;
  question: string;
  catalyst: string;
  mode: ResearchMode;
  horizon: HorizonMode;
  riskProfile: RiskProfile;
  includeMacro: boolean;
  includeFlow: boolean;
  packet: ResearchDecisionPacket;
};

type CopilotSource = {
  id?: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  relevance: number;
  authority?: number;
  snippet?: string;
  channel?: string;
};

type CopilotMetrics = {
  groundingConfidence: number;
  citationVerificationScore: number;
  sourceAuthorityScore?: number;
  citationUsage: {
    used: number;
    verified: number;
    total: number;
  };
};

type CopilotTurn = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  mode: "live" | "deterministic";
  sources: CopilotSource[];
  metrics?: CopilotMetrics;
  detail?: string;
  streaming?: boolean;
};

type CopilotDepth = "fast" | "balanced" | "deep";
type CopilotStyle = "concise" | "balanced" | "deep";
type WorkspaceView = "command" | "synthesis" | "forensics";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceDomain(url: string) {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function extractUrlFromText(value: string) {
  const match = value.match(/https?:\/\/[^\s)]+/i);
  if (!match) return "";
  try {
    const parsed = new URL(match[0]);
    return parsed.toString();
  } catch {
    return "";
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function buildSearchUrl(query: string) {
  const cleaned = query
    .replace(/\[(s\d+)\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`;
}

function resolveSourceLink(url: string, fallbackQuery: string) {
  if (isHttpUrl(url)) return url.trim();
  return buildSearchUrl(fallbackQuery);
}

function normalizeCitationKey(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/\[(s\d+)\]/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSourceId(value: string) {
  const withBrackets = value.match(/\[(S\d+)\]/i);
  if (withBrackets?.[1]) return withBrackets[1].toUpperCase();
  const bare = value.match(/\b(S\d+)\b/i);
  if (bare?.[1]) return bare[1].toUpperCase();
  return "";
}

function extractSourceIdsFromAnswer(value: string) {
  return Array.from(new Set([...value.matchAll(/\[(S\d+)\]/gi)].map((match) => match[1].toUpperCase())));
}

function scoreClass(score: number) {
  if (score >= 70) return "text-[var(--positive)]";
  if (score <= 40) return "text-[var(--negative)]";
  return "text-[var(--warning)]";
}

function summarizeAnswer(value: string, limit = 760) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).trimEnd()}...`;
}

function convictionClass(conviction: ResearchDecisionPacket["conviction"]) {
  if (conviction === "high") return "badge-positive";
  if (conviction === "low") return "badge-negative";
  return "badge-neutral";
}

function modeLabel(mode: ResearchMode) {
  if (mode === "pair-trade") return "Pair Trade";
  if (mode === "earnings") return "Earnings Prep";
  if (mode === "risk") return "Risk Stress";
  if (mode === "macro") return "Macro";
  return "Thesis";
}

function sourceLimitForDepth(depth: CopilotDepth) {
  if (depth === "fast") return 6;
  if (depth === "deep") return 12;
  return 8;
}

function dataModeLabel(
  primary: SymbolContext | null,
  compare: SymbolContext | null,
  benchmark: SymbolContext | null
) {
  const modes = [primary?.mode, compare?.mode, benchmark?.mode].filter(Boolean) as Array<
    "remote" | "local" | "synthetic"
  >;
  if (!modes.length) return "Local";
  if (modes.includes("remote")) return "Remote";
  if (modes.includes("local")) return "Local";
  return "Synthetic";
}

function aiPrompt(input: {
  primarySymbol: string;
  compareSymbol: string;
  benchmarkSymbol: string;
  mode: ResearchMode;
  horizon: HorizonMode;
  riskProfile: RiskProfile;
  includeMacro: boolean;
  includeFlow: boolean;
  catalyst: string;
  question: string;
  fallback: ResearchDecisionPacket;
  primaryContext: SymbolContext;
  compareContext: SymbolContext | null;
  benchmarkContext: SymbolContext | null;
}) {
  const payload = {
    symbols: {
      primary: input.primarySymbol,
      compare: input.compareSymbol || null,
      benchmark: input.benchmarkSymbol,
    },
    mode: input.mode,
    horizon: input.horizon,
    riskProfile: input.riskProfile,
    includeMacro: input.includeMacro,
    includeFlow: input.includeFlow,
    catalyst: input.catalyst,
    question: input.question,
    primaryContext: {
      price: input.primaryContext.price,
      changePct: input.primaryContext.changePct,
      momentum20Pct: input.primaryContext.momentum20Pct,
      momentum60Pct: input.primaryContext.momentum60Pct,
      volatilityPct: input.primaryContext.volatilityPct,
      support: input.primaryContext.support,
      resistance: input.primaryContext.resistance,
      sentiment: input.primaryContext.sentiment,
      liquidityScore: input.primaryContext.liquidityScore,
      newsVelocity: input.primaryContext.newsVelocity,
      headlines: input.primaryContext.news.slice(0, 8).map((item) => ({
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment,
      })),
    },
    compareContext: input.compareContext
      ? {
          symbol: input.compareContext.symbol,
          momentum20Pct: input.compareContext.momentum20Pct,
          volatilityPct: input.compareContext.volatilityPct,
          sentiment: input.compareContext.sentiment,
        }
      : null,
    benchmarkContext: input.benchmarkContext
      ? {
          symbol: input.benchmarkContext.symbol,
          momentum20Pct: input.benchmarkContext.momentum20Pct,
          volatilityPct: input.benchmarkContext.volatilityPct,
          sentiment: input.benchmarkContext.sentiment,
        }
      : null,
    deterministicFallback: input.fallback,
  };

  return [
    "You are a principal multi-asset research strategist.",
    "Return ONLY JSON with this exact schema and no markdown.",
    '{"verdict":string,"confidence":number,"signalScore":number,"conviction":"low|medium|high","regime":string,"executiveSummary":string,"setupChecklist":string[],"bullCase":string[],"bearCase":string[],"counterThesis":string[],"keyLevels":{"support":string,"resistance":string,"breakout":string,"breakdown":string},"scenarios":[{"name":string,"probability":number,"narrative":string,"target":string,"invalidates":string}],"factorExposure":[{"name":string,"score":number,"rationale":string}],"shocks":[{"name":string,"shock":string,"expectedMovePct":number,"impact":string,"response":string}],"actionPlan":{"entry":string,"stop":string,"target":string,"sizing":string,"hedge":string,"invalidation":string},"followUps":string[],"citations":string[]}',
    "Be tactical, specific, and risk-first. Keep each bullet concise.",
    `Input: ${JSON.stringify(payload)}`,
  ].join("\n");
}

function buildUnifiedFeed(
  primary: SymbolContext | null,
  compare: SymbolContext | null,
  benchmark: SymbolContext | null
) {
  const items = [
    ...(primary?.news ?? []),
    ...(compare?.news.slice(0, 6) ?? []),
    ...(benchmark?.news.slice(0, 6) ?? []),
  ];
  const deduped = new Map<string, (typeof items)[number]>();
  items.forEach((item) => {
    if (!deduped.has(item.title)) {
      deduped.set(item.title, item);
    }
  });

  return [...deduped.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 20);
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((item) => item.length > 2);
}

function rankCopilotSources(
  query: string,
  feed: NewsItem[],
  packet: ResearchDecisionPacket | null,
  limit = 6
): CopilotSource[] {
  const queryTokens = new Set(tokenize(query));
  const cited = new Set((packet?.citations ?? []).map((item) => item.toLowerCase().trim()));

  return feed
    .map((item) => {
      const title = item.title || "";
      const blob = `${title} ${item.summary || ""}`;
      const tokens = tokenize(blob);
      const overlap = tokens.reduce((count, token) => (queryTokens.has(token) ? count + 1 : count), 0);
      const overlapScore = queryTokens.size ? overlap / queryTokens.size : 0;
      const citationBoost = cited.has(title.toLowerCase().trim()) ? 0.35 : 0;
      const freshnessHours = Math.max(0, (Date.now() - Date.parse(item.publishedAt)) / 3_600_000);
      const freshnessScore = Math.max(0, 1 - freshnessHours / 72);
      const sentimentScore = Math.min(0.2, Math.abs(item.sentiment) * 0.2);
      const relevance = Math.min(
        1,
        overlapScore * 0.55 + freshnessScore * 0.25 + citationBoost + sentimentScore
      );

      return {
        title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        relevance,
      };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

function buildCopilotPrompt(input: {
  query: string;
  primarySymbol: string;
  compareSymbol: string;
  benchmarkSymbol: string;
  mode: ResearchMode;
  horizon: HorizonMode;
  riskProfile: RiskProfile;
  includeMacro: boolean;
  includeFlow: boolean;
  catalyst: string;
  packet: ResearchDecisionPacket | null;
  sources: CopilotSource[];
  history: CopilotTurn[];
  webDepth: CopilotDepth;
  citationStrict: boolean;
  style: CopilotStyle;
}) {
  const payload = {
    query: input.query,
    symbols: {
      primary: input.primarySymbol,
      compare: input.compareSymbol || null,
      benchmark: input.benchmarkSymbol,
    },
    controls: {
      mode: input.mode,
      horizon: input.horizon,
      riskProfile: input.riskProfile,
      includeMacro: input.includeMacro,
      includeFlow: input.includeFlow,
      catalyst: input.catalyst,
    },
    decisionPacket: input.packet
      ? {
          verdict: input.packet.verdict,
          confidence: input.packet.confidence,
          signalScore: input.packet.signalScore,
          conviction: input.packet.conviction,
          regime: input.packet.regime,
          executiveSummary: input.packet.executiveSummary,
          keyLevels: input.packet.keyLevels,
          actionPlan: input.packet.actionPlan,
        }
      : null,
    conversationTail: input.history.slice(0, 4).map((item) => ({
      q: item.question,
      a: item.answer.slice(0, 700),
      mode: item.mode,
    })),
    qualityControls: {
      webDepth: input.webDepth,
      citationStrict: input.citationStrict,
      style: input.style,
    },
    sources: input.sources.map((item, index) => ({
      id: `S${index + 1}`,
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      url: item.url,
      relevance: Number(item.relevance.toFixed(3)),
    })),
  };

  return [
    "You are Zentrade Alpha Copilot, an institutional-grade equity research assistant.",
    "Prioritize factual correctness over fluency. Be direct, tactical, and risk-first.",
    "Use ONLY provided context and sources. Never fabricate data. If evidence is weak, explicitly say insufficient evidence.",
    "Every factual claim must include source IDs like [S1], [S2].",
    "Output markdown using exact sections:",
    "### Direct Answer",
    "### Evidence",
    "### Risks / Counterpoints",
    "### Action Plan",
    "### Verification",
    "### Source Trail",
    "In Verification include: confidence (0-100), what is uncertain, and what to verify next.",
    "In Source Trail include full URL for each citation used.",
    `Context: ${JSON.stringify(payload)}`,
  ].join("\n");
}

function deterministicCopilotFallback(input: {
  query: string;
  symbol: string;
  packet: ResearchDecisionPacket | null;
  sources: CopilotSource[];
}) {
  const packet = input.packet;
  const sourceLines = input.sources.slice(0, 3).map((item, index) => {
    const link = item.url || "#";
    return `- [S${index + 1}] ${item.title} (${item.source}) ${link}`;
  });

  return [
    "### Direct Answer",
    packet
      ? `${input.symbol} currently maps to **${packet.verdict}** (${packet.signalScore}/100 signal, ${Math.round(
          packet.confidence
        )}% confidence).`
      : `Use a risk-first posture on ${input.symbol} until stronger confirmation appears.`,
    "",
    "### Evidence",
    packet
      ? `- Regime: ${packet.regime}\n- Key levels: support ${packet.keyLevels.support}, resistance ${packet.keyLevels.resistance}\n- Query: ${input.query}`
      : `- Query: ${input.query}\n- Decision packet not available, so this answer is conservative.`,
    "",
    "### Risks / Counterpoints",
    packet
      ? `- Thesis invalidation: ${packet.actionPlan.invalidation}\n- Counter-thesis: ${packet.counterThesis.slice(0, 2).join(" ")}`
      : "- No packet-derived invalidation is available yet.",
    "",
    "### Action Plan",
    packet
      ? `- Entry: ${packet.actionPlan.entry}\n- Stop: ${packet.actionPlan.stop}\n- Target: ${packet.actionPlan.target}\n- Sizing: ${packet.actionPlan.sizing}`
      : `- Refresh context for ${input.symbol}\n- Generate decision pack\n- Re-ask this question with updated evidence`,
    "",
    "### Source Trail",
    sourceLines.length ? sourceLines.join("\n") : "- No source links available in current context.",
  ].join("\n");
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCopilotSources(raw: unknown): CopilotSource[] {
  if (!Array.isArray(raw)) return [];
  const parsed: Array<CopilotSource | null> = raw.map((item, index) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = String(row.title ?? "").trim();
    if (!title) return null;
    const url = String(row.url ?? "").trim();
    const source = String(row.source ?? "Unknown").trim() || "Unknown";
    const publishedAtRaw = String(row.publishedAt ?? "").trim();
    const publishedAt = !Number.isNaN(Date.parse(publishedAtRaw))
      ? new Date(publishedAtRaw).toISOString()
      : new Date().toISOString();
    return {
      id: String(row.id ?? `S${index + 1}`),
      title,
      url,
      source,
      publishedAt,
      relevance: Math.max(0, Math.min(1, toFiniteNumber(row.relevance))),
      authority: Math.max(0, Math.min(1, toFiniteNumber(row.authority))),
      snippet: String(row.snippet ?? "").trim(),
      channel: String(row.channel ?? "").trim() || undefined,
    };
  });

  return parsed.filter((item): item is CopilotSource => item !== null).slice(0, 12);
}

function parseCopilotMetrics(raw: unknown): CopilotMetrics | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const citationUsageRaw =
    row.citationUsage && typeof row.citationUsage === "object"
      ? (row.citationUsage as Record<string, unknown>)
      : {};
  return {
    groundingConfidence: Math.max(0, Math.min(100, toFiniteNumber(row.groundingConfidence))),
    citationVerificationScore: Math.max(0, Math.min(100, toFiniteNumber(row.citationVerificationScore))),
    sourceAuthorityScore: Math.max(0, Math.min(100, toFiniteNumber(row.sourceAuthorityScore))),
    citationUsage: {
      used: Math.max(0, Math.floor(toFiniteNumber(citationUsageRaw.used))),
      verified: Math.max(0, Math.floor(toFiniteNumber(citationUsageRaw.verified))),
      total: Math.max(0, Math.floor(toFiniteNumber(citationUsageRaw.total))),
    },
  };
}

function parseCopilotTurns(raw: string | null): CopilotTurn[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    const turns: Array<CopilotTurn | null> = parsed.map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = String(row.question ?? "").trim();
      const answer = String(row.answer ?? "");
      if (!question) return null;
      const mode: CopilotTurn["mode"] = row.mode === "live" ? "live" : "deterministic";
      const createdAtRaw = String(row.createdAt ?? "").trim();
      const createdAt = !Number.isNaN(Date.parse(createdAtRaw))
        ? new Date(createdAtRaw).toISOString()
        : new Date().toISOString();
      return {
        id: String(row.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        question,
        answer,
        createdAt,
        mode,
        sources: parseCopilotSources(row.sources),
        metrics: parseCopilotMetrics(row.metrics),
        detail: String(row.detail ?? "").trim(),
        streaming: false,
      } satisfies CopilotTurn;
    });

    return turns.filter((item): item is CopilotTurn => item !== null).slice(0, 30);
  } catch {
    return [];
  }
}

function formatRelativeAge(value: string) {
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86_400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  return `${Math.floor(deltaSeconds / 86_400)}d ago`;
}

export default function ResearchPanel() {
  const [primarySymbol, setPrimarySymbol] = useState("AAPL");
  const [compareSymbol, setCompareSymbol] = useState("");
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("QQQ");
  const [question, setQuestion] = useState("");
  const [catalyst, setCatalyst] = useState("next earnings / macro print");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("synthesis");

  const [mode, setMode] = useState<ResearchMode>("thesis");
  const [horizon, setHorizon] = useState<HorizonMode>("swing");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [includeMacro, setIncludeMacro] = useState(true);
  const [includeFlow, setIncludeFlow] = useState(true);

  const [primaryContext, setPrimaryContext] = useState<SymbolContext | null>(null);
  const [compareContext, setCompareContext] = useState<SymbolContext | null>(null);
  const [benchmarkContext, setBenchmarkContext] = useState<SymbolContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  const [packet, setPacket] = useState<ResearchDecisionPacket | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotTurns, setCopilotTurns] = useState<CopilotTurn[]>([]);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotAutoRefresh, setCopilotAutoRefresh] = useState(true);
  const [copilotDeepMode, setCopilotDeepMode] = useState(true);
  const [copilotDepth, setCopilotDepth] = useState<CopilotDepth>("balanced");
  const [copilotStyle, setCopilotStyle] = useState<CopilotStyle>("balanced");
  const [copilotStrictCitations, setCopilotStrictCitations] = useState(true);
  const [copilotError, setCopilotError] = useState("");
  const [copilotNotice, setCopilotNotice] = useState("");

  const loadContexts = useCallback(async () => {
    setContextLoading(true);
    setError("");

    try {
      const [primary, compare, benchmark] = await Promise.all([
        fetchSymbolContext(primarySymbol),
        compareSymbol.trim() ? fetchSymbolContext(compareSymbol) : Promise.resolve(null),
        fetchSymbolContext(benchmarkSymbol || "QQQ"),
      ]);

      setPrimaryContext(primary);
      setCompareContext(compare);
      setBenchmarkContext(benchmark);
    } catch {
      setError("Failed to load one or more contexts. Retry in a few seconds.");
    } finally {
      setContextLoading(false);
    }
  }, [primarySymbol, compareSymbol, benchmarkSymbol]);

  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  useEffect(() => {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Workspace[];
      if (Array.isArray(parsed)) {
        setWorkspaces(parsed.slice(0, 40));
      }
    } catch {
      localStorage.removeItem(WORKSPACES_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces.slice(0, 40)));
  }, [workspaces]);

  const copilotThreadKey = useMemo(
    () =>
      [
        normalizeSymbol(primarySymbol || "AAPL"),
        normalizeSymbol(compareSymbol || "NONE"),
        normalizeSymbol(benchmarkSymbol || "QQQ"),
        mode,
        horizon,
        riskProfile,
      ].join("|"),
    [benchmarkSymbol, compareSymbol, horizon, mode, primarySymbol, riskProfile]
  );

  useEffect(() => {
    const raw = localStorage.getItem(`${COPILOT_STORAGE_PREFIX}:${copilotThreadKey}`);
    setCopilotTurns(parseCopilotTurns(raw));
  }, [copilotThreadKey]);

  useEffect(() => {
    localStorage.setItem(
      `${COPILOT_STORAGE_PREFIX}:${copilotThreadKey}`,
      JSON.stringify(
        copilotTurns.slice(0, 30).map(({ streaming: _streaming, ...turn }) => turn)
      )
    );
  }, [copilotThreadKey, copilotTurns]);

  const quickPrompts = useMemo(
    () => [
      `Build a risk-first action plan for ${normalizeSymbol(primarySymbol)} with explicit invalidation triggers.`,
      `Stress test ${normalizeSymbol(primarySymbol)} under a Nasdaq -8% scenario and propose hedges.`,
      `Run a relative-strength comparison: ${normalizeSymbol(primarySymbol)}${
        compareSymbol ? ` vs ${normalizeSymbol(compareSymbol)}` : " vs sector peer"
      } with execution timing rules.`,
      `What must be true for this thesis to fail within the next ${horizon} horizon?`,
    ],
    [primarySymbol, compareSymbol, horizon]
  );

  const signalRows = useMemo(() => {
    if (!packet || !primaryContext || !benchmarkContext) return [];
    const relativeStrength = primaryContext.momentum20Pct - benchmarkContext.momentum20Pct;

    return [
      {
        name: "Trend Persistence",
        score: Math.max(0, Math.min(100, 50 + primaryContext.momentum20Pct * 2.2 + primaryContext.momentum60Pct * 0.8)),
        detail: `20D ${formatPct(primaryContext.momentum20Pct)} · 60D ${formatPct(primaryContext.momentum60Pct)}`,
      },
      {
        name: `Relative Strength vs ${benchmarkContext.symbol}`,
        score: Math.max(0, Math.min(100, 50 + relativeStrength * 2.4)),
        detail: `${relativeStrength >= 0 ? "+" : ""}${relativeStrength.toFixed(2)}% spread`,
      },
      {
        name: "Sentiment Quality",
        score: Math.max(0, Math.min(100, 50 + primaryContext.sentiment * 45)),
        detail: `Score ${primaryContext.sentiment.toFixed(2)} · Velocity ${primaryContext.newsVelocity}`,
      },
      {
        name: "Volatility Regime",
        score: Math.max(0, Math.min(100, 100 - primaryContext.volatilityPct * 18)),
        detail: `Realized vol ${primaryContext.volatilityPct.toFixed(2)}%`,
      },
      {
        name: "Liquidity / Execution",
        score: primaryContext.liquidityScore,
        detail: `ATR ${primaryContext.atrPct.toFixed(2)}%`,
      },
      {
        name: "Composite Decision",
        score: packet.signalScore,
        detail: `${packet.regime} · ${packet.conviction.toUpperCase()} conviction`,
      },
    ];
  }, [packet, primaryContext, benchmarkContext]);

  const feed = useMemo(() => {
    return buildUnifiedFeed(primaryContext, compareContext, benchmarkContext);
  }, [primaryContext, compareContext, benchmarkContext]);

  const primarySeries = useMemo(
    () =>
      primaryContext
        ? primaryContext.points.map((item) => ({
            date: new Date(item.ts).toISOString().slice(0, 10),
            close: item.price,
          }))
        : [],
    [primaryContext]
  );

  const benchmarkSeries = useMemo(
    () =>
      benchmarkContext
        ? benchmarkContext.points.map((item) => ({
            date: new Date(item.ts).toISOString().slice(0, 10),
            close: item.price,
          }))
        : [],
    [benchmarkContext]
  );

  const handleGenerate = async (
    overrideQuestion?: string,
    source: "manual" | "followup" = "manual"
  ) => {
    setGenerating(true);
    setError("");
    setNotice("");
    setRawAnswer("");

    const effectiveQuestion = (overrideQuestion ?? question).trim();
    if (overrideQuestion) {
      setQuestion(overrideQuestion);
    }

    let nextPrimary = primaryContext;
    let nextCompare = compareContext;
    let nextBenchmark = benchmarkContext;

    if (!nextPrimary) {
      try {
        const [primary, compare, benchmark] = await Promise.all([
          fetchSymbolContext(primarySymbol),
          compareSymbol.trim() ? fetchSymbolContext(compareSymbol) : Promise.resolve(null),
          fetchSymbolContext(benchmarkSymbol || "QQQ"),
        ]);
        nextPrimary = primary;
        nextCompare = compare;
        nextBenchmark = benchmark;
        setPrimaryContext(primary);
        setCompareContext(compare);
        setBenchmarkContext(benchmark);
      } catch {
        setError("Primary symbol context is not available yet.");
        setGenerating(false);
        return;
      }
    }

    const fallback = buildResearchDecisionPacket({
      primary: nextPrimary,
      compare: nextCompare,
      benchmark: nextBenchmark,
      question: effectiveQuestion,
      catalyst,
      mode,
      horizon,
      riskProfile,
      includeMacro,
      includeFlow,
    });

    const prompt = aiPrompt({
      primarySymbol: normalizeSymbol(primarySymbol),
      compareSymbol: normalizeSymbol(compareSymbol),
      benchmarkSymbol: normalizeSymbol(benchmarkSymbol),
      mode,
      horizon,
      riskProfile,
      includeMacro,
      includeFlow,
      catalyst,
      question: effectiveQuestion,
      fallback,
      primaryContext: nextPrimary,
      compareContext: nextCompare,
      benchmarkContext: nextBenchmark,
    });

    try {
      const candidates: string[] = [];

      try {
        const localResponse = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: prompt, symbol: normalizeSymbol(primarySymbol) }),
        });

        if (localResponse.ok) {
          const data = await localResponse.json();
          const answer = String(data?.answer ?? "").trim();
          if (answer) {
            candidates.push(answer);
          }
        }
      } catch {
        // keep fallback path
      }

      if (API_BASE) {
        try {
          const remoteResponse = await fetch(`${API_BASE}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: prompt, symbol: normalizeSymbol(primarySymbol) }),
          });

          if (remoteResponse.ok) {
            const data = await remoteResponse.json();
            const answer = String(data?.answer ?? "").trim();
            if (answer) {
              candidates.push(answer);
            }
          }
        } catch {
          // keep fallback path
        }
      }

      for (const answer of candidates) {
        const json = extractJsonObject(answer);
        if (json) {
          setPacket(coerceDecisionPacket(json, fallback));
          setRawAnswer(answer);
          setNotice(
            source === "followup"
              ? "Follow-up generated with AI + deterministic risk engine."
              : "Decision pack generated with AI + deterministic risk engine."
          );
          return;
        }
      }

      if (candidates.length > 0) {
        setPacket(fallback);
        setRawAnswer(candidates[0]);
        setNotice(
          source === "followup"
            ? "Follow-up generated. Deterministic engine normalized the AI output."
            : "AI response received. Deterministic engine normalized the decision packet."
        );
        return;
      }

      setPacket(fallback);
      setRawAnswer("No AI response received. Deterministic decision engine output generated.");
      setNotice(
        source === "followup"
          ? "Follow-up generated in deterministic mode."
          : "Decision pack generated in deterministic mode."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!packet) return;

    try {
      const memo = markdownFromDecisionPacket(
        packet,
        normalizeSymbol(primarySymbol),
        normalizeSymbol(compareSymbol)
      );
      await navigator.clipboard.writeText(memo);
      setNotice("Decision memo copied to clipboard.");
    } catch {
      setError("Unable to access clipboard in this browser context.");
    }
  };

  const handleSaveWorkspace = () => {
    if (!packet) return;

    const entry: Workspace = {
      id: `${normalizeSymbol(primarySymbol)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      title: workspaceTitle(primarySymbol, mode, question),
      primarySymbol: normalizeSymbol(primarySymbol),
      compareSymbol: normalizeSymbol(compareSymbol),
      benchmarkSymbol: normalizeSymbol(benchmarkSymbol || "QQQ"),
      question,
      catalyst,
      mode,
      horizon,
      riskProfile,
      includeMacro,
      includeFlow,
      packet,
    };

    setWorkspaces((current) => [entry, ...current].slice(0, 40));
    setNotice("Workspace saved.");
  };

  const handleLoadWorkspace = (workspace: Workspace) => {
    setPrimarySymbol(workspace.primarySymbol);
    setCompareSymbol(workspace.compareSymbol);
    setBenchmarkSymbol(workspace.benchmarkSymbol || "QQQ");
    setQuestion(workspace.question);
    setCatalyst(workspace.catalyst);
    setMode(workspace.mode);
    setHorizon(workspace.horizon);
    setRiskProfile(workspace.riskProfile);
    setIncludeMacro(workspace.includeMacro);
    setIncludeFlow(workspace.includeFlow);
    setPacket(workspace.packet);
    setRawAnswer("Loaded from workspace archive.");
  };

  const handleDeleteWorkspace = (id: string) => {
    setWorkspaces((current) => current.filter((item) => item.id !== id));
  };

  const handleShipToExecution = async () => {
    if (!packet) return;

    const suggestedSide: "buy" | "sell" = packet.signalScore >= 50 ? "buy" : "sell";
    const result = await pushResearchIdeaTicket({
      symbol: normalizeSymbol(primarySymbol),
      compareSymbol: normalizeSymbol(compareSymbol),
      mode,
      verdict: packet.verdict,
      confidence: packet.confidence,
      signalScore: packet.signalScore,
      question,
      catalyst,
      entry: packet.actionPlan.entry,
      stop: packet.actionPlan.stop,
      target: packet.actionPlan.target,
      suggestedSide,
    });

    if (!result.ok) {
      setError(result.detail || "Unable to queue research idea for execution.");
      return;
    }

    const message = `Research handoff queued: ${normalizeSymbol(primarySymbol)} (${suggestedSide.toUpperCase()})`;
    createLocalAlert("EXEC", message, "execution");
    setNotice(message);
  };

  const copilotQuickPrompts = useMemo(
    () => [
      `What is the highest-conviction setup for ${normalizeSymbol(primarySymbol)} in the next ${horizon}?`,
      `Give me a skeptical bear-case stress test for ${normalizeSymbol(primarySymbol)}.`,
      `What are the top 3 invalidation triggers before committing capital?`,
      `Compare ${normalizeSymbol(primarySymbol)}${
        compareSymbol ? ` vs ${normalizeSymbol(compareSymbol)}` : " against a sector peer"
      } and propose a paired hedge.`,
    ],
    [compareSymbol, horizon, primarySymbol]
  );

  const sourceRankPreview = useMemo(
    () =>
      rankCopilotSources(
        (copilotQuestion || question || packet?.executiveSummary || "").trim(),
        feed,
        packet,
        sourceLimitForDepth(copilotDepth)
      ),
    [copilotDepth, copilotQuestion, feed, packet, question]
  );

  const latestCopilotTurn = copilotTurns[0] ?? null;
  const latestTurnSources = latestCopilotTurn?.sources ?? [];

  const followUpAnswerMap = useMemo(() => {
    const map = new Map<string, CopilotTurn>();
    if (!packet?.followUps.length) return map;

    packet.followUps.forEach((followUp) => {
      const target = followUp.trim().toLowerCase();
      const match = copilotTurns.find((turn) => {
        const turnQuestion = turn.question.trim().toLowerCase();
        return turnQuestion === target || turnQuestion.includes(target) || target.includes(turnQuestion);
      });
      if (match) {
        map.set(followUp, match);
      }
    });

    return map;
  }, [copilotTurns, packet?.followUps]);

  const citationTrail = useMemo(() => {
    const sourceCandidates = [
      ...latestTurnSources,
      ...sourceRankPreview,
      ...feed.map((item) => ({
        id: "",
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        relevance: 0.5,
        authority: 0.6,
      })),
    ];

    const sourcesById = new Map<string, (typeof sourceCandidates)[number]>();
    sourceCandidates.forEach((item) => {
      const id = String(item.id ?? "").trim().toUpperCase();
      if (id && !sourcesById.has(id)) {
        sourcesById.set(id, item);
      }
    });

    const citationInputs = packet?.citations.slice(0, 10) ?? [];
    const answerSourceIds = extractSourceIdsFromAnswer(latestCopilotTurn?.answer ?? "");
    answerSourceIds.forEach((id) => {
      if (!citationInputs.some((item) => item.toUpperCase().includes(id))) {
        citationInputs.push(`[${id}]`);
      }
    });

    if (!citationInputs.length) return [];

    const resolveLinkedSource = (citation: string) => {
      const sourceId = extractSourceId(citation);
      if (sourceId && sourcesById.has(sourceId)) {
        const source = sourcesById.get(sourceId)!;
        return {
          title: source.title,
          source: source.source,
          url: source.url,
          publishedAt: source.publishedAt,
        };
      }

      const citationKey = normalizeCitationKey(citation);
      if (!citationKey) return null;
      const fuzzyMatch = sourceCandidates.find((item) => {
        const titleKey = normalizeCitationKey(item.title || "");
        return Boolean(titleKey) && (titleKey.includes(citationKey) || citationKey.includes(titleKey));
      });
      if (!fuzzyMatch) return null;
      return {
        title: fuzzyMatch.title,
        source: fuzzyMatch.source,
        url: fuzzyMatch.url,
        publishedAt: fuzzyMatch.publishedAt,
      };
    };

    return citationInputs.slice(0, 12).map((citation) => {
      const directUrl = extractUrlFromText(citation);
      const linked = resolveLinkedSource(citation);
      const resolvedUrl = (linked?.url && isHttpUrl(linked.url) ? linked.url : "") || directUrl;
      const fallbackUrl = resolvedUrl
        ? ""
        : buildSearchUrl(linked?.title || linked?.source || citation);
      const externalUrl = resolvedUrl || fallbackUrl;

      return {
        citation,
        linked: externalUrl
          ? {
              title: linked?.title || citation,
              source: linked?.source || sourceDomain(externalUrl),
              url: externalUrl,
              publishedAt: linked?.publishedAt || new Date().toISOString(),
              fallback: !resolvedUrl,
            }
          : null,
      };
    });
  }, [feed, latestCopilotTurn?.answer, latestTurnSources, packet?.citations, sourceRankPreview]);

  const handleClearCopilotThread = () => {
    setCopilotTurns([]);
    setCopilotNotice("Copilot thread cleared.");
    setCopilotError("");
    localStorage.removeItem(`${COPILOT_STORAGE_PREFIX}:${copilotThreadKey}`);
  };

  const scrollCopilotIntoView = () => {
    requestAnimationFrame(() => {
      document.getElementById("research-copilot-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleAskCopilot = async (overrideQuestion?: string) => {
    const userQuestion = (overrideQuestion ?? copilotQuestion).trim();
    if (!userQuestion) {
      setCopilotError("Enter a copilot question first.");
      return;
    }

    setCopilotBusy(true);
    setCopilotError("");
    setCopilotNotice("");

    let nextPrimary = primaryContext;
    let nextCompare = compareContext;
    let nextBenchmark = benchmarkContext;

    const needsRefresh =
      copilotAutoRefresh ||
      !nextPrimary ||
      !nextBenchmark ||
      (copilotDeepMode && Boolean(compareSymbol.trim()) && !nextCompare);

    if (needsRefresh) {
      try {
        const [primary, compare, benchmark] = await Promise.all([
          fetchSymbolContext(primarySymbol),
          compareSymbol.trim() ? fetchSymbolContext(compareSymbol) : Promise.resolve(null),
          fetchSymbolContext(benchmarkSymbol || "QQQ"),
        ]);
        nextPrimary = primary;
        nextCompare = compare;
        nextBenchmark = benchmark;
        setPrimaryContext(primary);
        setCompareContext(compare);
        setBenchmarkContext(benchmark);
      } catch {
        // Fall through with existing state.
      }
    }

    if (!nextPrimary) {
      const fallbackSources = rankCopilotSources(
        userQuestion,
        feed,
        packet,
        sourceLimitForDepth(copilotDepth)
      );
      const fallbackAnswer = deterministicCopilotFallback({
        query: userQuestion,
        symbol: normalizeSymbol(primarySymbol),
        packet,
        sources: fallbackSources,
      });
      const fallbackTurn: CopilotTurn = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question: userQuestion,
        answer: fallbackAnswer,
        createdAt: new Date().toISOString(),
        mode: "deterministic",
        sources: fallbackSources,
        detail: "Primary context unavailable. Deterministic follow-up answer generated.",
      };

      setCopilotTurns((current) => [fallbackTurn, ...current].slice(0, 30));
      setCopilotBusy(false);
      setCopilotQuestion("");
      setCopilotError("Primary context unavailable. Returned deterministic answer.");
      return;
    }

    const effectivePacket =
      packet ||
      buildResearchDecisionPacket({
        primary: nextPrimary,
        compare: nextCompare,
        benchmark: nextBenchmark,
        question: userQuestion,
        catalyst,
        mode,
        horizon,
        riskProfile,
        includeMacro,
        includeFlow,
      });

    const effectiveFeed = buildUnifiedFeed(nextPrimary, nextCompare, nextBenchmark);
    const rankedSources = rankCopilotSources(
      userQuestion,
      effectiveFeed,
      effectivePacket,
      sourceLimitForDepth(copilotDepth)
    );
    const prompt = buildCopilotPrompt({
      query: userQuestion,
      primarySymbol: normalizeSymbol(primarySymbol),
      compareSymbol: normalizeSymbol(compareSymbol),
      benchmarkSymbol: normalizeSymbol(benchmarkSymbol || "QQQ"),
      mode,
      horizon,
      riskProfile,
      includeMacro,
      includeFlow,
      catalyst,
      packet: copilotDeepMode ? effectivePacket : null,
      sources: rankedSources,
      history: copilotTurns,
      webDepth: copilotDepth,
      citationStrict: copilotStrictCitations,
      style: copilotStyle,
    });

    const turnId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const patchTurn = (patch: Partial<CopilotTurn>) => {
      setCopilotTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                ...patch,
              }
            : turn
        )
      );
    };

    const pendingTurn: CopilotTurn = {
      id: turnId,
      question: userQuestion,
      answer: "",
      createdAt,
      mode: "deterministic",
      sources: rankedSources,
      streaming: true,
    };

    setCopilotTurns((current) => [pendingTurn, ...current].slice(0, 30));

    let answer = "";
    let responseMode: CopilotTurn["mode"] = "deterministic";
    let responseSources = rankedSources;
    let responseMetrics: CopilotMetrics | undefined;
    let responseDetail = "";
    const requestPayload = {
      query: prompt,
      retrievalQuery: userQuestion,
      symbol: normalizeSymbol(primarySymbol),
      sources: rankedSources,
      webDepth: copilotDepth,
      citationStrict: copilotStrictCitations,
    };
    const streamController = new AbortController();
    const streamTimeout = setTimeout(() => streamController.abort(), 35_000);

    try {
      const streamResponse = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: streamController.signal,
      });

      if (!streamResponse.ok || !streamResponse.body) {
        const payload = await streamResponse.json().catch(() => ({}));
        const detail =
          typeof payload?.detail === "string" && payload.detail.trim()
            ? payload.detail
            : `Copilot stream failed (${streamResponse.status}).`;
        throw new Error(detail);
      }

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      const consumeSseEvent = (rawEvent: string) => {
        if (!rawEvent.trim()) return false;
        const lines = rawEvent.split(/\r?\n/);
        let event = "message";
        const dataLines: string[] = [];

        lines.forEach((line) => {
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
            return;
          }
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        });

        if (!dataLines.length) return false;
        const dataText = dataLines.join("\n");
        let payload: unknown = {};
        try {
          payload = JSON.parse(dataText);
        } catch {
          payload = {};
        }

        if (event === "chunk") {
          const text = String((payload as Record<string, unknown>)?.text ?? "");
          if (!text) return false;
          answer += text;
          patchTurn({ answer });
          return false;
        }

        if (event === "sources") {
          const nextSources = parseCopilotSources((payload as Record<string, unknown>)?.sources ?? payload);
          if (nextSources.length) {
            responseSources = nextSources;
            patchTurn({ sources: nextSources });
          }
          return false;
        }

        if (event === "meta") {
          const row = payload as Record<string, unknown>;
          responseMode = row?.mode === "deterministic" ? "deterministic" : "live";
          responseDetail = String(row?.detail ?? "").trim();
          const metrics = parseCopilotMetrics(row);
          if (metrics) {
            responseMetrics = metrics;
            patchTurn({ metrics });
          }
          return false;
        }

        if (event === "error") {
          const detail = String((payload as Record<string, unknown>)?.detail ?? "Copilot stream error.");
          throw new Error(detail);
        }

        if (event === "done") {
          return true;
        }

        return false;
      };

      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          if (consumeSseEvent(rawEvent)) {
            done = true;
            break;
          }
        }
      }

      if (buffer.trim()) {
        consumeSseEvent(buffer);
      }

      if (!answer.trim()) {
        throw new Error("Copilot stream returned an empty response.");
      }
    } catch (copilotFailure) {
      const streamFailureDetail =
        copilotFailure instanceof Error
          ? copilotFailure.name === "AbortError"
            ? "Copilot stream timed out."
            : copilotFailure.message
          : "Copilot streaming failed.";
      let recoveredViaJson = false;

      try {
        const jsonResponse = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });
        const data = (await jsonResponse.json().catch(() => ({}))) as Record<string, unknown>;
        const jsonAnswer = String(data?.answer ?? "").trim();
        if (jsonResponse.ok && jsonAnswer) {
          answer = jsonAnswer;
          responseMode = data?.mode === "deterministic" ? "deterministic" : "live";
          const nextSources = parseCopilotSources(data?.sources);
          if (nextSources.length) {
            responseSources = nextSources;
          }
          const metrics = parseCopilotMetrics(data);
          if (metrics) {
            responseMetrics = metrics;
          } else {
            responseMetrics = undefined;
          }
          responseDetail = String(data?.detail ?? streamFailureDetail).trim() || streamFailureDetail;
          recoveredViaJson = true;
        }
      } catch {
        // Fallback to deterministic mode below.
      }

      if (!recoveredViaJson) {
        answer = deterministicCopilotFallback({
          query: userQuestion,
          symbol: normalizeSymbol(primarySymbol),
          packet: effectivePacket,
          sources: responseSources,
        });
        responseMode = "deterministic";
        responseMetrics = undefined;
        responseDetail = streamFailureDetail;
        setCopilotError(responseDetail);
      }
    } finally {
      clearTimeout(streamTimeout);
      setCopilotBusy(false);
    }

    patchTurn({
      answer,
      mode: responseMode,
      sources: responseSources,
      metrics: responseMetrics,
      detail: responseDetail,
      streaming: false,
    });
    setCopilotQuestion("");
    setCopilotNotice(
      responseMode === "live"
        ? "Copilot streamed a live response with web retrieval and source verification scores."
        : "Copilot generated a deterministic fallback response."
    );
  };

  const handleRunFollowUp = (followUp: string) => {
    setQuestion(followUp);
    setCopilotQuestion(followUp);
    setCopilotNotice("Running follow-up in Research Copilot...");
    scrollCopilotIntoView();
    void handleAskCopilot(followUp);
  };

  const handleAskFollowUp = (followUp: string) => {
    setCopilotQuestion(followUp);
    scrollCopilotIntoView();
    void handleAskCopilot(followUp);
  };

  const modeSummary = modeLabel(mode);
  const dataMode = dataModeLabel(primaryContext, compareContext, benchmarkContext);
  const viewSummary =
    workspaceView === "command"
      ? "Set symbols, risk posture, and generation controls."
      : workspaceView === "forensics"
      ? "Audit citations, source authority, and evidence quality."
      : "Run streaming copilot analysis with grounded web retrieval.";

  return (
    <div className="space-y-4 research-shell research-vx-shell research-lab-shell">
      <section className="surface-glass dynamic-surface rounded-2xl p-5 sm:p-6 fade-up research-hero quantum-surface research-command-shell">
        <div className="research-hero-glow" />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold section-title inline-flex items-center gap-2">
            <BrainCircuit size={18} />
            Research Command Center
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${dataMode === "Remote" ? "badge-positive" : "badge-neutral"}`}>
              Data: {dataMode}
            </span>
            <span className="rounded-full px-2.5 py-1 badge-neutral">Mode: {modeSummary}</span>
          </div>
        </div>
        <p className="mt-2 text-xs muted">{viewSummary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="holo-chip">Web Depth: {copilotDepth}</span>
          <span className="holo-chip">Style: {copilotStyle}</span>
          <span className={`holo-chip ${copilotStrictCitations ? "holo-chip-live" : ""}`}>
            Citations: {copilotStrictCitations ? "Strict" : "Flexible"}
          </span>
          <span className="holo-chip">Source Pool: {sourceRankPreview.length}</span>
        </div>

        <div className="mt-3 mission-nav">
          <button
            onClick={() => setWorkspaceView("command")}
            className={`mission-tab ${workspaceView === "command" ? "mission-tab-active" : ""}`}
          >
            Setup
          </button>
          <button
            onClick={() => setWorkspaceView("synthesis")}
            className={`mission-tab ${workspaceView === "synthesis" ? "mission-tab-active" : ""}`}
          >
            Copilot
          </button>
          <button
            onClick={() => setWorkspaceView("forensics")}
            className={`mission-tab ${workspaceView === "forensics" ? "mission-tab-active" : ""}`}
          >
            Evidence
          </button>
        </div>

        <div className="mt-4 grid xl:grid-cols-[1.35fr_1fr] gap-4">
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={primarySymbol}
                onChange={(event) => setPrimarySymbol(event.target.value.toUpperCase())}
                placeholder="Primary symbol"
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
              <input
                value={compareSymbol}
                onChange={(event) => setCompareSymbol(event.target.value.toUpperCase())}
                placeholder="Compare symbol"
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
              <input
                value={benchmarkSymbol}
                onChange={(event) => setBenchmarkSymbol(event.target.value.toUpperCase())}
                placeholder="Benchmark"
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </div>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a high-conviction strategic question"
              className="w-full min-h-[90px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            />

            <div className="grid sm:grid-cols-3 gap-2">
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ResearchMode)}
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-2.5 py-2 text-xs"
              >
                <option value="thesis">Thesis</option>
                <option value="earnings">Earnings</option>
                <option value="risk">Risk Stress</option>
                <option value="pair-trade">Pair Trade</option>
                <option value="macro">Macro</option>
              </select>

              <select
                value={horizon}
                onChange={(event) => setHorizon(event.target.value as HorizonMode)}
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-2.5 py-2 text-xs"
              >
                <option value="intraday">Intraday</option>
                <option value="swing">Swing</option>
                <option value="position">Position</option>
                <option value="long-term">Long-Term</option>
              </select>

              <select
                value={riskProfile}
                onChange={(event) => setRiskProfile(event.target.value as RiskProfile)}
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-2.5 py-2 text-xs"
              >
                <option value="defensive">Defensive</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
              <input
                value={catalyst}
                onChange={(event) => setCatalyst(event.target.value)}
                placeholder="Catalyst focus"
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              />
              <label className="text-xs inline-flex items-center gap-1 rounded-lg control-surface px-2.5 py-2 bg-white/75 dark:bg-black/20">
                <input
                  type="checkbox"
                  checked={includeMacro}
                  onChange={(event) => setIncludeMacro(event.target.checked)}
                />
                Macro
              </label>
              <label className="text-xs inline-flex items-center gap-1 rounded-lg control-surface px-2.5 py-2 bg-white/75 dark:bg-black/20">
                <input
                  type="checkbox"
                  checked={includeFlow}
                  onChange={(event) => setIncludeFlow(event.target.checked)}
                />
                Flow
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setQuestion(prompt)}
                  className="text-xs rounded-full control-surface bg-white/70 dark:bg-black/20 px-3 py-1.5"
                >
                  {prompt.length > 72 ? `${prompt.slice(0, 72)}...` : prompt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => void handleGenerate()}
                disabled={generating || contextLoading || !primaryContext}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? "Compiling Decision Pack" : "Generate Decision Pack"}
              </button>

              <button
                onClick={loadContexts}
                className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              >
                <Activity size={13} />
                Refresh Context
              </button>

              <button
                onClick={handleSaveWorkspace}
                disabled={!packet}
                className="inline-flex items-center gap-1 rounded-lg control-surface px-3 py-2 text-xs disabled:opacity-60"
              >
                <Save size={13} />
                Save
              </button>

              <button
                onClick={handleCopy}
                disabled={!packet}
                className="inline-flex items-center gap-1 rounded-lg control-surface px-3 py-2 text-xs disabled:opacity-60"
              >
                <Copy size={13} />
                Copy
              </button>

              <button
                onClick={handleShipToExecution}
                disabled={!packet}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                <Send size={13} />
                Send To Execution
              </button>
            </div>

            {(notice || error) && (
              <div
                className={`rounded-lg px-3 py-2 text-xs ${
                  error
                    ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
                    : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {error || notice}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="card-elevated rounded-xl p-3">
                <div className="muted">Primary</div>
                <div className="mt-1 text-sm font-semibold">{primaryContext?.symbol || "-"}</div>
                <div className="metric-value mt-0.5">
                  {primaryContext ? formatMoney(primaryContext.price) : "-"}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    (primaryContext?.changePct ?? 0) >= 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                  }`}
                >
                  {primaryContext ? formatPct(primaryContext.changePct) : "-"}
                </div>
              </div>
              <div className="card-elevated rounded-xl p-3">
                <div className="muted">Benchmark</div>
                <div className="mt-1 text-sm font-semibold">{benchmarkContext?.symbol || "-"}</div>
                <div className="metric-value mt-0.5">
                  {benchmarkContext ? formatMoney(benchmarkContext.price) : "-"}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    (benchmarkContext?.changePct ?? 0) >= 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                  }`}
                >
                  {benchmarkContext ? formatPct(benchmarkContext.changePct) : "-"}
                </div>
              </div>
            </div>

            <AdvancedMarketChart
              title={`${primaryContext?.symbol || normalizeSymbol(primarySymbol)} Advanced Structure`}
              subtitle={`Updated ${primaryContext ? formatDate(primaryContext.asOf) : "—"} • RSI/EMA/Bollinger/Relative overlays`}
              data={primarySeries}
              benchmark={benchmarkSeries}
              support={primaryContext?.support}
              resistance={primaryContext?.resistance}
              compact
            />
          </div>
        </div>
      </section>

      <div
        className={`grid gap-4 ${
          workspaceView === "command" ? "xl:grid-cols-[1.34fr_1fr]" : "xl:grid-cols-1"
        }`}
      >
        {workspaceView === "command" && (
          <section className="surface-glass dynamic-surface rounded-2xl p-5 sm:p-6 fade-in research-card quantum-surface">
          <h3 className="font-semibold section-title text-lg inline-flex items-center gap-2">
            <Target size={16} />
            Decision Pack
          </h3>

          {!packet && (
            <div className="mt-4 card-elevated rounded-xl p-4 text-sm muted">
              Generate a decision pack to unlock signal matrix, factor decomposition, and stress action maps.
            </div>
          )}

          {packet && (
            <div className="mt-4 space-y-4">
              <div className="card-elevated rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold">{packet.verdict}</div>
                    <div className="text-xs muted mt-0.5">{packet.regime}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${convictionClass(packet.conviction)}`}>
                      {packet.conviction.toUpperCase()} Conviction
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-xs badge-neutral">
                      Confidence {Math.round(packet.confidence)}%
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs badge-neutral ${scoreClass(packet.signalScore)}`}>
                      Signal {packet.signalScore}/100
                    </span>
                  </div>
                </div>
                <p className="text-sm mt-2 leading-relaxed">{packet.executiveSummary}</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {packet.setupChecklist.map((item) => (
                  <div key={item} className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs">
                    {item}
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-200">
                    Bull Case
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {packet.bullCase.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-200">
                    Bear Case
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {packet.bearCase.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[var(--surface-border)] bg-white/75 dark:bg-black/25 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">
                    Counter Thesis
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {packet.counterThesis.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Key Levels</div>
                <div className="mt-2 grid sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-white/70 dark:bg-black/25 px-2.5 py-2">
                    <div className="muted">Support</div>
                    <div className="metric-value font-semibold">{packet.keyLevels.support}</div>
                  </div>
                  <div className="rounded-lg bg-white/70 dark:bg-black/25 px-2.5 py-2">
                    <div className="muted">Resistance</div>
                    <div className="metric-value font-semibold">{packet.keyLevels.resistance}</div>
                  </div>
                  <div className="rounded-lg bg-white/70 dark:bg-black/25 px-2.5 py-2">
                    <div className="muted">Breakout</div>
                    <div className="metric-value font-semibold">{packet.keyLevels.breakout}</div>
                  </div>
                  <div className="rounded-lg bg-white/70 dark:bg-black/25 px-2.5 py-2">
                    <div className="muted">Breakdown</div>
                    <div className="metric-value font-semibold">{packet.keyLevels.breakdown}</div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                {packet.scenarios.map((scenario) => (
                  <div key={scenario.name} className="card-elevated rounded-xl p-3">
                    <div className="text-sm font-semibold">{scenario.name}</div>
                    <div className="text-xs muted mt-1">{Math.round(scenario.probability)}% probability</div>
                    <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 mt-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)]"
                        style={{ width: `${scenario.probability}%` }}
                      />
                    </div>
                    <div className="text-xs mt-2">{scenario.narrative}</div>
                    <div className="text-[11px] muted mt-2">Target: {scenario.target}</div>
                    <div className="text-[11px] muted">Invalidates: {scenario.invalidates}</div>
                  </div>
                ))}
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Execution Plan</div>
                <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="muted">Entry:</span> {packet.actionPlan.entry}
                  </div>
                  <div>
                    <span className="muted">Stop:</span> {packet.actionPlan.stop}
                  </div>
                  <div>
                    <span className="muted">Target:</span> {packet.actionPlan.target}
                  </div>
                  <div>
                    <span className="muted">Sizing:</span> {packet.actionPlan.sizing}
                  </div>
                  <div>
                    <span className="muted">Hedge:</span> {packet.actionPlan.hedge}
                  </div>
                  <div>
                    <span className="muted">Invalidation:</span> {packet.actionPlan.invalidation}
                  </div>
                </div>
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Follow-Ups</div>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {packet.followUps.map((item) => (
                    <div
                      key={item}
                      className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2.5 py-2 text-xs"
                    >
                      <div className="font-medium leading-snug">{item}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleRunFollowUp(item)}
                          disabled={generating || copilotBusy}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] text-white px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
                        >
                          <Sparkles size={11} />
                          Run Follow-Up
                        </button>
                        <button
                          onClick={() => handleAskFollowUp(item)}
                          disabled={copilotBusy}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-white/80 dark:bg-black/20 px-2 py-1 text-[11px] disabled:opacity-60"
                        >
                          <MessageSquareText size={11} />
                          Ask Copilot
                        </button>
                      </div>
                      {followUpAnswerMap.has(item) && (
                        <div className="mt-2 rounded-md border border-[var(--surface-border)] bg-white/70 dark:bg-black/20 px-2 py-1.5">
                          <div className="text-[11px] leading-relaxed">
                            {summarizeAnswer(followUpAnswerMap.get(item)?.answer ?? "", 220)}
                          </div>
                          <div className="mt-1 text-[10px] muted">
                            {followUpAnswerMap.get(item)?.mode === "live" ? "Live answer" : "Deterministic"} ·{" "}
                            {formatRelativeAge(followUpAnswerMap.get(item)?.createdAt ?? new Date().toISOString())}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Citation Trail</div>
                <div className="mt-2 space-y-1.5">
                  {citationTrail.length === 0 && <div className="text-xs muted">No citations available.</div>}
                  {citationTrail.map((item, index) => (
                    <div
                      key={`${item.citation}-${index}`}
                      className="rounded-md control-surface bg-white/70 dark:bg-black/20 px-2.5 py-2 text-xs"
                    >
                      <div className="font-medium">{item.citation}</div>
                      {item.linked ? (
                        <a
                          href={item.linked.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
                        >
                          <Link2 size={10} />
                          {item.linked.fallback ? "Search likely source" : "Open original source"} ({item.linked.source}{" "}
                          · {formatDate(item.linked.publishedAt)})
                        </a>
                      ) : (
                        <div className="mt-1 text-[11px] muted">Original source URL unavailable for this citation.</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          </section>
        )}

        <aside className="space-y-4">
          {workspaceView === "command" && (
            <section className="surface-glass dynamic-surface rounded-2xl p-4 research-card quantum-surface">
            <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
              <Zap size={15} />
              Signal Matrix
            </h3>
            <div className="mt-3 space-y-2">
              {signalRows.length === 0 && <div className="text-xs muted">Generate a pack to populate matrix.</div>}
              {signalRows.map((row) => (
                <div key={row.name} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{row.name}</span>
                    <span className={`text-xs metric-value ${scoreClass(row.score)}`}>{Math.round(row.score)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)]"
                      style={{ width: `${Math.max(0, Math.min(100, row.score))}%` }}
                    />
                  </div>
                  <div className="text-[11px] muted mt-1">{row.detail}</div>
                </div>
              ))}
            </div>
            </section>
          )}

          {workspaceView === "command" && (
            <section className="surface-glass dynamic-surface rounded-2xl p-4 research-card quantum-surface">
            <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
              <ArrowRightLeft size={15} />
              Factor Decomposition
            </h3>

            <div className="mt-3 space-y-2">
              {!packet && <div className="text-xs muted">No factor decomposition yet.</div>}

              {packet?.factorExposure.map((factor) => (
                <div key={factor.name} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{factor.name}</span>
                    <span className={`text-xs metric-value ${scoreClass(factor.score)}`}>{Math.round(factor.score)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)]"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <div className="text-[11px] muted mt-1">{factor.rationale}</div>
                </div>
              ))}
            </div>
            </section>
          )}

          {workspaceView === "command" && (
            <section className="surface-glass dynamic-surface rounded-2xl p-4 research-card quantum-surface">
            <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
              <FlaskConical size={15} />
              Shock Lab
            </h3>

            <div className="mt-3 space-y-2">
              {!packet && <div className="text-xs muted">No shock scenarios yet.</div>}
              {packet?.shocks.map((shock) => (
                <div key={shock.name} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{shock.name}</span>
                    <span
                      className={`text-xs metric-value ${
                        shock.expectedMovePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                      }`}
                    >
                      {formatPct(shock.expectedMovePct)}
                    </span>
                  </div>
                  <div className="text-[11px] muted mt-1">Shock: {shock.shock}</div>
                  <div className="text-xs mt-1">{shock.impact}</div>
                  <div className="text-[11px] muted mt-1">Response: {shock.response}</div>
                </div>
              ))}
            </div>
            </section>
          )}

          <section
            className="surface-glass dynamic-surface rounded-2xl p-4 research-card quantum-surface"
            id="research-copilot-panel"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
                <MessageSquareText size={15} />
                Research Copilot
              </h3>
              <span className="text-[11px] muted">{copilotTurns.length} turns</span>
            </div>

            <p className="text-[11px] muted mt-1">
              Streaming responses, web retrieval depth control, source-grounding scores, and citation verification.
            </p>

            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[11px]">
              <label className="inline-flex items-center gap-1.5 rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={copilotAutoRefresh}
                  onChange={(event) => setCopilotAutoRefresh(event.target.checked)}
                />
                Auto Refresh Context
              </label>
              <label className="inline-flex items-center gap-1.5 rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={copilotDeepMode}
                  onChange={(event) => setCopilotDeepMode(event.target.checked)}
                />
                Deep Packet Context
              </label>
            </div>

            <div className="mt-2 grid sm:grid-cols-3 gap-2 text-[11px]">
              <label className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <div className="muted">Web Depth</div>
                <select
                  value={copilotDepth}
                  onChange={(event) => setCopilotDepth(event.target.value as CopilotDepth)}
                  className="mt-1 w-full rounded-md border border-[var(--surface-border)] bg-white/80 dark:bg-black/25 px-2 py-1"
                >
                  <option value="fast">Fast</option>
                  <option value="balanced">Balanced</option>
                  <option value="deep">Deep Retrieval</option>
                </select>
              </label>
              <label className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <div className="muted">Answer Style</div>
                <select
                  value={copilotStyle}
                  onChange={(event) => setCopilotStyle(event.target.value as CopilotStyle)}
                  className="mt-1 w-full rounded-md border border-[var(--surface-border)] bg-white/80 dark:bg-black/25 px-2 py-1"
                >
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="deep">Deep Dive</option>
                </select>
              </label>
              <label className="inline-flex items-center justify-between gap-2 rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <span>Citation Guard</span>
                <input
                  type="checkbox"
                  checked={copilotStrictCitations}
                  onChange={(event) => setCopilotStrictCitations(event.target.checked)}
                />
              </label>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <div className="muted">Runtime</div>
                <div className="mt-0.5 font-semibold">
                  {copilotBusy
                    ? "Streaming"
                    : latestCopilotTurn
                    ? latestCopilotTurn.mode === "live"
                      ? "Live AI"
                      : "Deterministic"
                    : "Idle"}
                </div>
              </div>
              <div className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <div className="muted">Source Pool</div>
                <div className="mt-0.5 font-semibold">{sourceRankPreview.length}</div>
              </div>
              <div className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <div className="muted">Grounding</div>
                <div className={`mt-0.5 font-semibold ${scoreClass(latestCopilotTurn?.metrics?.groundingConfidence ?? 0)}`}>
                  {Math.round(latestCopilotTurn?.metrics?.groundingConfidence ?? 0)}%
                </div>
              </div>
              <div className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2 py-1.5">
                <div className="muted">Citation Verify</div>
                <div
                  className={`mt-0.5 font-semibold ${scoreClass(
                    latestCopilotTurn?.metrics?.citationVerificationScore ?? 0
                  )}`}
                >
                  {Math.round(latestCopilotTurn?.metrics?.citationVerificationScore ?? 0)}%
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {copilotQuickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setCopilotQuestion(prompt);
                    void handleAskCopilot(prompt);
                  }}
                  disabled={copilotBusy}
                  className="text-[11px] rounded-full control-surface bg-white/70 dark:bg-black/20 px-2.5 py-1 disabled:opacity-60"
                >
                  {prompt.length > 84 ? `${prompt.slice(0, 84)}...` : prompt}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                value={copilotQuestion}
                onChange={(event) => setCopilotQuestion(event.target.value)}
                placeholder="Ask copilot to challenge, validate, or optimize this thesis..."
                className="flex-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              />
              <button
                onClick={() => void handleAskCopilot()}
                disabled={copilotBusy}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {copilotBusy ? <Loader2 size={13} className="animate-spin" /> : <Compass size={13} />}
                Ask
              </button>
              <button
                onClick={handleClearCopilotThread}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-white/80 dark:bg-black/20 px-2.5 py-2 text-xs"
              >
                <Eraser size={12} />
                Clear
              </button>
            </div>

            {(copilotNotice || copilotError) && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${
                  copilotError
                    ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
                    : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {copilotError || copilotNotice}
              </div>
            )}

            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] muted">Source Match Engine</div>
              {sourceRankPreview.slice(0, 3).map((source, index) => (
                <div key={`${source.title}-${index}`} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium line-clamp-2">{source.title}</div>
                    <span className="text-[11px] muted">{Math.round(source.relevance * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)]"
                      style={{ width: `${Math.max(4, Math.round(source.relevance * 100))}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] muted">
                    <span>{source.source}</span>
                    <span>{formatDate(source.publishedAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {!copilotTurns.length && <div className="text-xs muted">No copilot turns yet.</div>}
              {copilotTurns.map((turn) => (
                <div key={turn.id} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 p-2.5">
                  <div className="text-xs font-semibold break-words">{turn.question}</div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed">
                    {turn.answer || (turn.streaming ? "Streaming response..." : "No response text available.")}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] muted">
                    <span>{formatRelativeAge(turn.createdAt)}</span>
                    <div className="inline-flex items-center gap-1.5">
                      {turn.streaming && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-200 px-2 py-0.5">
                          <Loader2 size={10} className="animate-spin" />
                          Streaming
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          turn.mode === "live"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-200"
                        }`}
                      >
                        {turn.mode === "live" ? "Live AI" : "Deterministic"}
                      </span>
                    </div>
                  </div>
                  {turn.metrics && (
                    <div className="mt-2 rounded-lg border border-[var(--surface-border)] bg-white/75 dark:bg-black/20 p-2">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="muted">Grounding</span>
                            <span className={`font-semibold ${scoreClass(turn.metrics.groundingConfidence)}`}>
                              {Math.round(turn.metrics.groundingConfidence)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)]"
                              style={{ width: `${Math.max(0, Math.min(100, turn.metrics.groundingConfidence))}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="muted">Citation Verify</span>
                            <span
                              className={`font-semibold ${scoreClass(turn.metrics.citationVerificationScore)}`}
                            >
                              {Math.round(turn.metrics.citationVerificationScore)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)]"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, turn.metrics.citationVerificationScore)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] muted">
                        Citations used: {turn.metrics.citationUsage.used} · Verified:{" "}
                        {turn.metrics.citationUsage.verified} · Source pool: {turn.metrics.citationUsage.total}
                      </div>
                    </div>
                  )}
                  {turn.detail && turn.mode === "deterministic" && (
                    <div className="mt-2 text-[11px] muted">Fallback detail: {turn.detail}</div>
                  )}
                  {turn.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {turn.sources.slice(0, 3).map((source) => (
                        <a
                          key={`${turn.id}-${source.id || source.title}`}
                          href={resolveSourceLink(source.url, `${source.title} ${source.source}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-border)] bg-white/75 dark:bg-black/20 px-2 py-0.5 text-[11px]"
                        >
                          <Link2 size={10} />
                          {source.source}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {workspaceView === "command" && (
            <section className="surface-glass dynamic-surface rounded-2xl p-4 research-card quantum-surface">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
                <Library size={15} />
                Workspace Archive
              </h3>
              <span className="text-xs muted">{workspaces.length}</span>
            </div>

            <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 p-2.5">
                  <div className="text-xs font-semibold">{workspace.title}</div>
                  <div className="text-[11px] muted mt-1">
                    {workspace.primarySymbol}
                    {workspace.compareSymbol ? ` vs ${workspace.compareSymbol}` : ""} · {workspace.mode} ·{" "}
                    {new Date(workspace.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleLoadWorkspace(workspace)}
                      className="text-[11px] inline-flex items-center gap-1 rounded-md control-surface px-2 py-1"
                    >
                      <Plus size={11} />
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteWorkspace(workspace.id)}
                      className="text-[11px] inline-flex items-center gap-1 rounded-md border border-red-400/40 text-red-500 px-2 py-1"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!workspaces.length && <div className="text-xs muted">No saved workspaces yet.</div>}
            </div>
            </section>
          )}

          <section className="surface-glass dynamic-surface rounded-2xl p-4 research-card quantum-surface text-xs muted inline-flex items-center gap-1">
            <ShieldAlert size={13} />
            Validate every output before execution. This workspace is decision support, not financial advice.
          </section>
        </aside>
      </div>
    </div>
  );
}
