"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Copy,
  Library,
  Loader2,
  Newspaper,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const WORKSPACES_KEY = "smc_research_workspaces_v3";

type ResearchMode = "thesis" | "earnings" | "risk" | "pair-trade" | "macro";
type HorizonMode = "intraday" | "swing" | "position" | "long-term";
type RiskProfile = "defensive" | "balanced" | "aggressive";

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: number;
};

type PricePoint = {
  ts: number;
  price: number;
};

type SymbolContext = {
  symbol: string;
  mode: "remote" | "local" | "synthetic";
  price: number;
  changePct: number;
  momentumPct: number;
  volatilityPct: number;
  support: number;
  resistance: number;
  sentiment: number;
  points: PricePoint[];
  news: NewsItem[];
};

type ResearchScenario = {
  name: string;
  probability: number;
  narrative: string;
  target: string;
  invalidates: string;
};

type ActionPlan = {
  entry: string;
  stop: string;
  target: string;
  positionSizing: string;
  timeHorizon: string;
};

type ResearchReport = {
  verdict: string;
  confidence: number;
  executiveSummary: string;
  bullCase: string[];
  bearCase: string[];
  riskControls: string[];
  scenarios: ResearchScenario[];
  actionPlan: ActionPlan;
  followUps: string[];
  citations: string[];
};

type Workspace = {
  id: string;
  createdAt: string;
  title: string;
  primarySymbol: string;
  compareSymbol: string;
  question: string;
  mode: ResearchMode;
  horizon: HorizonMode;
  riskProfile: RiskProfile;
  report: ResearchReport;
};

const POSITIVE_WORDS = [
  "beat",
  "growth",
  "surge",
  "upside",
  "outperform",
  "momentum",
  "record",
  "optimism",
  "upgrade",
  "strong",
  "expansion",
  "guidance raised",
  "acceleration",
];

const NEGATIVE_WORDS = [
  "miss",
  "downgrade",
  "drop",
  "risk",
  "weak",
  "lawsuit",
  "cuts",
  "loss",
  "slowdown",
  "warning",
  "guidance cut",
  "delay",
  "pressure",
];

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function sentimentScore(text: string) {
  const lowered = text.toLowerCase();
  const positive = POSITIVE_WORDS.reduce(
    (count, keyword) => (lowered.includes(keyword) ? count + 1 : count),
    0
  );
  const negative = NEGATIVE_WORDS.reduce(
    (count, keyword) => (lowered.includes(keyword) ? count + 1 : count),
    0
  );

  if (positive === 0 && negative === 0) return 0;
  const value = (positive - negative) / Math.max(positive + negative, 1);
  return Math.max(-1, Math.min(1, value));
}

function hashSymbol(symbol: string) {
  return symbol
    .toUpperCase()
    .split("")
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 11), 0);
}

function seededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function syntheticChart(symbol: string): PricePoint[] {
  const seed = hashSymbol(symbol);
  const random = seededRandom(seed);
  let price = 60 + (seed % 240);
  const now = Date.now();

  return Array.from({ length: 130 }).map((_, index) => {
    const ts = now - (129 - index) * 24 * 60 * 60 * 1000;
    const wave = Math.sin(index / (5 + (seed % 4))) * 0.008;
    const noise = (random() - 0.5) * 0.018;
    const drift = ((seed % 9) - 4) / 1800;

    price = Math.max(3, price * (1 + drift + wave + noise));
    return { ts, price: Number(price.toFixed(2)) };
  });
}

function normalizeChart(raw: any[]): PricePoint[] {
  return raw
    .map((item) => {
      const ts =
        toNumber(item?.ts) ??
        toNumber(item?.x) ??
        (item?.date ? Date.parse(String(item.date)) : null) ??
        (item?.time ? Date.parse(String(item.time)) : null);

      const price = toNumber(item?.price) ?? toNumber(item?.close) ?? toNumber(item?.y);
      if (ts === null || price === null || !Number.isFinite(ts) || price <= 0) return null;

      return { ts, price };
    })
    .filter((item): item is PricePoint => Boolean(item))
    .sort((a, b) => a.ts - b.ts)
    .slice(-180);
}

function normalizeNews(raw: any[]): NewsItem[] {
  return raw
    .map((item) => {
      const title = String(item?.headline ?? item?.title ?? "").trim();
      if (!title) return null;

      const source = String(item?.source ?? item?.site ?? "Market Feed").trim();
      const publishedAt =
        toNumber(item?.datetime) !== null
          ? new Date(Number(item.datetime) * 1000).toISOString()
          : String(item?.publishedAt ?? item?.date ?? new Date().toISOString());
      const url = String(item?.url ?? "#");
      const summary = String(item?.summary ?? item?.description ?? "").trim();
      const sentiment = sentimentScore(`${title} ${summary}`);

      return {
        title,
        url,
        source,
        publishedAt,
        summary,
        sentiment,
      };
    })
    .filter((item): item is NewsItem => Boolean(item))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 10);
}

function fallbackNews(symbol: string): NewsItem[] {
  const templates = [
    `${symbol} options skew indicates increasing near-term directional uncertainty`,
    `${symbol} remains in institutional focus amid macro crosscurrents`,
    `${symbol} analysts debate margin durability over next two quarters`,
    `${symbol} liquidity profile supports active tactical positioning`,
  ];

  return templates.map((title, index) => ({
    title,
    url: "#",
    source: "Research Synth",
    publishedAt: new Date(Date.now() - index * 6 * 60 * 60 * 1000).toISOString(),
    summary: "Synthetic fallback context",
    sentiment: sentimentScore(title),
  }));
}

function computeMetrics(points: PricePoint[]) {
  const closes = points.map((point) => point.price);
  const returns = points.slice(1).map((point, index) => {
    const prev = points[index].price;
    return prev > 0 ? (point.price - prev) / prev : 0;
  });

  const momentumPct =
    closes.length > 20 ? ((closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21]) * 100 : 0;
  const volatilityPct = std(returns.map((value) => value * 100));
  const support = percentile(closes, 0.2);
  const resistance = percentile(closes, 0.8);

  return { momentumPct, volatilityPct, support, resistance };
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

async function fetchSymbolContext(symbol: string): Promise<SymbolContext> {
  const normalized = symbol.trim().toUpperCase();
  let mode: "remote" | "local" | "synthetic" = "synthetic";

  let quoteData: any = null;
  let chartData: any = null;
  let newsData: any = null;

  try {
    quoteData = await fetchJson(`/api/stocks/price?symbol=${normalized}`);
    mode = "local";
  } catch {
    // continue
  }

  try {
    chartData = await fetchJson(`/api/stocks/chart?symbol=${normalized}`);
    mode = "local";
  } catch {
    // continue
  }

  try {
    newsData = await fetchJson(`/api/stocks/news?symbol=${normalized}`);
    mode = "local";
  } catch {
    // continue
  }

  if (API_BASE && (!quoteData || !chartData || !newsData)) {
    try {
      const [q, c, n] = await Promise.all([
        !quoteData ? fetchJson(`${API_BASE}/price/${normalized}`) : Promise.resolve(quoteData),
        !chartData ? fetchJson(`${API_BASE}/chart/${normalized}`) : Promise.resolve(chartData),
        !newsData ? fetchJson(`${API_BASE}/news/${normalized}`) : Promise.resolve(newsData),
      ]);
      quoteData = q;
      chartData = c;
      newsData = n;
      mode = "remote";
    } catch {
      // fallback
    }
  }

  const points = normalizeChart(chartData?.data ?? chartData?.history ?? []);
  const finalPoints = points.length >= 20 ? points : syntheticChart(normalized);
  const latest = finalPoints[finalPoints.length - 1]?.price ?? 0;
  const prev = finalPoints[Math.max(finalPoints.length - 2, 0)]?.price ?? latest;

  const price = toNumber(quoteData?.price) ?? latest;
  const rawChange = toNumber(quoteData?.change);
  const changePct = rawChange !== null ? rawChange : prev > 0 ? ((price - prev) / prev) * 100 : 0;

  const news = normalizeNews(newsData?.news ?? newsData ?? []);
  const finalNews = news.length ? news : fallbackNews(normalized);
  const sentiment = avg(finalNews.map((item) => item.sentiment));

  const metrics = computeMetrics(finalPoints);

  return {
    symbol: normalized,
    mode: mode === "synthetic" && (quoteData || chartData || newsData) ? "local" : mode,
    price,
    changePct,
    momentumPct: metrics.momentumPct,
    volatilityPct: metrics.volatilityPct,
    support: metrics.support,
    resistance: metrics.resistance,
    sentiment,
    points: finalPoints,
    news: finalNews,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function heuristicsReport(
  primary: SymbolContext,
  compare: SymbolContext | null,
  question: string,
  mode: ResearchMode,
  horizon: HorizonMode,
  riskProfile: RiskProfile,
  catalyst: string
): ResearchReport {
  const trendLabel = primary.momentumPct >= 0 ? "constructive trend" : "weakening trend";
  const sentimentLabel =
    primary.sentiment > 0.18 ? "positive" : primary.sentiment < -0.18 ? "negative" : "mixed";
  const confidence = clamp(
    56 + Math.abs(primary.momentumPct) * 1.2 + Math.abs(primary.sentiment) * 20 - primary.volatilityPct * 1.5,
    32,
    92
  );

  const compareEdge = compare
    ? primary.momentumPct - compare.momentumPct
    : 0;

  const verdict =
    primary.momentumPct > 0 && primary.sentiment >= -0.1
      ? "Selective Long Bias"
      : primary.momentumPct < 0 && primary.sentiment < 0
      ? "Defensive / Risk-Off"
      : "Range / Event-Driven";

  const bullCase = [
    `${primary.symbol} maintains ${trendLabel} with ${primary.momentumPct.toFixed(2)}% 20-session momentum.`,
    `News tone is ${sentimentLabel}, supporting tactical continuation setups.`,
    `Volatility at ${primary.volatilityPct.toFixed(2)}% allows structured entries near ${primary.support.toFixed(2)}.`
  ];

  if (compare) {
    bullCase.push(
      `${primary.symbol} relative strength vs ${compare.symbol}: ${compareEdge >= 0 ? "+" : ""}${compareEdge.toFixed(2)}% momentum spread.`
    );
  }

  const bearCase = [
    `Failure to hold support around ${primary.support.toFixed(2)} could trigger fast downside repricing.`,
    `Event risk and macro-rate sensitivity may amplify drawdowns beyond baseline volatility.`,
    `Sentiment dispersion can reverse quickly on guidance cuts, legal overhang, or liquidity shocks.`
  ];

  const riskControls = [
    `Align sizing to ${riskProfile} profile: cap per-position risk at ${riskProfile === "aggressive" ? "1.5%" : riskProfile === "balanced" ? "1.0%" : "0.6%"} of equity.`,
    `Use invalidation below ${Math.max(0.01, primary.support * 0.985).toFixed(2)} for long setups; avoid widening stops post-entry.`,
    `Escalate caution into catalysts: ${catalyst || "earnings / macro print"}.`
  ];

  const scenarios: ResearchScenario[] = [
    {
      name: "Base Case",
      probability: 50,
      narrative: `Price consolidates above support and grinds toward resistance with controlled volatility.`,
      target: `${primary.resistance.toFixed(2)}-${(primary.resistance * 1.04).toFixed(2)}`,
      invalidates: `Daily close below ${primary.support.toFixed(2)}`,
    },
    {
      name: "Upside Breakout",
      probability: 30,
      narrative: `Momentum acceleration + positive catalyst drives re-rating and trend extension.`,
      target: `${(primary.resistance * 1.08).toFixed(2)}+`,
      invalidates: `Failure breakout with heavy rejection volume`,
    },
    {
      name: "Downside Shock",
      probability: 20,
      narrative: `Negative catalyst compresses risk appetite and breaks key support.`,
      target: `${(primary.support * 0.92).toFixed(2)}`,
      invalidates: `Rapid reclaim above broken support`,
    },
  ];

  const actionPlan: ActionPlan = {
    entry: `Scale into ${primary.symbol} around ${primary.support.toFixed(2)}-${(primary.support * 1.01).toFixed(2)} on confirmation candles.`,
    stop: `Hard stop near ${(primary.support * 0.985).toFixed(2)} (adjust for liquidity).`,
    target: `Primary: ${primary.resistance.toFixed(2)}, secondary: ${(primary.resistance * 1.06).toFixed(2)}.`,
    positionSizing: `Use ${riskProfile} risk bucket; split entry into 2-3 tranches.`,
    timeHorizon: `${horizon} research frame in ${mode} mode.`,
  };

  const followUps = [
    `What changes if ${primary.symbol} closes below ${primary.support.toFixed(2)}?`,
    `How should I hedge this setup around the next catalyst window?`,
    `What relative-value trade pairs best with this thesis?`,
  ];

  return {
    verdict,
    confidence,
    executiveSummary: `For ${primary.symbol}, current structure is ${trendLabel} with ${sentimentLabel} narrative flow. ${question || "Thesis is tactically favorable if risk stays defined."}`,
    bullCase,
    bearCase,
    riskControls,
    scenarios,
    actionPlan,
    followUps,
    citations: primary.news.slice(0, 6).map((item) => item.title),
  };
}

function extractJsonObject(text: string): any | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function coerceReport(candidate: any, fallback: ResearchReport): ResearchReport {
  if (!candidate || typeof candidate !== "object") return fallback;

  const scenarios: ResearchScenario[] = Array.isArray(candidate.scenarios)
    ? candidate.scenarios.slice(0, 4).map((item: any, index: number) => ({
        name: String(item?.name ?? `Scenario ${index + 1}`),
        probability: clamp(Number(item?.probability) || 0, 0, 100),
        narrative: String(item?.narrative ?? "No narrative provided."),
        target: String(item?.target ?? "N/A"),
        invalidates: String(item?.invalidates ?? "N/A"),
      }))
    : fallback.scenarios;

  const action = candidate.actionPlan && typeof candidate.actionPlan === "object" ? candidate.actionPlan : {};

  return {
    verdict: String(candidate.verdict ?? fallback.verdict),
    confidence: clamp(Number(candidate.confidence) || fallback.confidence, 1, 100),
    executiveSummary: String(candidate.executiveSummary ?? fallback.executiveSummary),
    bullCase: Array.isArray(candidate.bullCase)
      ? candidate.bullCase.slice(0, 6).map((item: unknown) => String(item))
      : fallback.bullCase,
    bearCase: Array.isArray(candidate.bearCase)
      ? candidate.bearCase.slice(0, 6).map((item: unknown) => String(item))
      : fallback.bearCase,
    riskControls: Array.isArray(candidate.riskControls)
      ? candidate.riskControls.slice(0, 6).map((item: unknown) => String(item))
      : fallback.riskControls,
    scenarios,
    actionPlan: {
      entry: String(action.entry ?? fallback.actionPlan.entry),
      stop: String(action.stop ?? fallback.actionPlan.stop),
      target: String(action.target ?? fallback.actionPlan.target),
      positionSizing: String(action.positionSizing ?? fallback.actionPlan.positionSizing),
      timeHorizon: String(action.timeHorizon ?? fallback.actionPlan.timeHorizon),
    },
    followUps: Array.isArray(candidate.followUps)
      ? candidate.followUps.slice(0, 6).map((item: unknown) => String(item))
      : fallback.followUps,
    citations: Array.isArray(candidate.citations)
      ? candidate.citations.slice(0, 10).map((item: unknown) => String(item))
      : fallback.citations,
  };
}

function workspaceTitle(primary: string, mode: ResearchMode, question: string) {
  if (question.trim()) return `${primary} · ${question.slice(0, 42)}`;
  return `${primary} · ${mode}`;
}

function markdownFromReport(report: ResearchReport, primarySymbol: string, compareSymbol: string) {
  const lines = [
    `# Research Memo - ${primarySymbol}${compareSymbol ? ` vs ${compareSymbol}` : ""}`,
    "",
    `**Verdict:** ${report.verdict}`,
    `**Confidence:** ${Math.round(report.confidence)}%`,
    "",
    "## Executive Summary",
    report.executiveSummary,
    "",
    "## Bull Case",
    ...report.bullCase.map((item) => `- ${item}`),
    "",
    "## Bear Case",
    ...report.bearCase.map((item) => `- ${item}`),
    "",
    "## Risk Controls",
    ...report.riskControls.map((item) => `- ${item}`),
    "",
    "## Scenarios",
    ...report.scenarios.map(
      (scenario) =>
        `- ${scenario.name} (${scenario.probability}%): ${scenario.narrative} | Target: ${scenario.target} | Invalidates: ${scenario.invalidates}`
    ),
    "",
    "## Action Plan",
    `- Entry: ${report.actionPlan.entry}`,
    `- Stop: ${report.actionPlan.stop}`,
    `- Target: ${report.actionPlan.target}`,
    `- Position Sizing: ${report.actionPlan.positionSizing}`,
    `- Time Horizon: ${report.actionPlan.timeHorizon}`,
  ];

  return lines.join("\n");
}

export default function ResearchPanel() {
  const [primarySymbol, setPrimarySymbol] = useState("AAPL");
  const [compareSymbol, setCompareSymbol] = useState("");
  const [question, setQuestion] = useState("");
  const [catalyst, setCatalyst] = useState("next earnings / macro print");

  const [mode, setMode] = useState<ResearchMode>("thesis");
  const [horizon, setHorizon] = useState<HorizonMode>("swing");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [includeMacro, setIncludeMacro] = useState(true);
  const [includeFlow, setIncludeFlow] = useState(true);

  const [primaryContext, setPrimaryContext] = useState<SymbolContext | null>(null);
  const [compareContext, setCompareContext] = useState<SymbolContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  const [report, setReport] = useState<ResearchReport | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const modeSummary = useMemo(() => {
    if (mode === "earnings") return "Earnings Prep";
    if (mode === "pair-trade") return "Pair Trade";
    if (mode === "risk") return "Risk Stress";
    if (mode === "macro") return "Macro-Sensitive";
    return "Thesis Builder";
  }, [mode]);

  const dataMode = useMemo(() => {
    const pool = [primaryContext?.mode, compareContext?.mode].filter(Boolean) as Array<
      "remote" | "local" | "synthetic"
    >;

    if (!pool.length) return "local";
    if (pool.includes("remote")) return "remote";
    if (pool.includes("local")) return "local";
    return "synthetic";
  }, [primaryContext, compareContext]);

  const loadContexts = useCallback(async () => {
    setContextLoading(true);
    setError("");

    try {
      const [primary, compare] = await Promise.all([
        fetchSymbolContext(primarySymbol),
        compareSymbol.trim() ? fetchSymbolContext(compareSymbol) : Promise.resolve(null),
      ]);

      setPrimaryContext(primary);
      setCompareContext(compare);
    } catch {
      setError("Unable to fetch full context. Using partial synthetic context.");
    } finally {
      setContextLoading(false);
    }
  }, [primarySymbol, compareSymbol]);

  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  useEffect(() => {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Workspace[];
      if (Array.isArray(parsed)) {
        setWorkspaces(parsed.slice(0, 20));
      }
    } catch {
      localStorage.removeItem(WORKSPACES_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces.slice(0, 20)));
  }, [workspaces]);

  const generatePrompt = () => {
    const primary = primaryContext;
    if (!primary) return "";

    const payload = {
      primarySymbol,
      compareSymbol: compareContext?.symbol || null,
      mode,
      horizon,
      riskProfile,
      includeMacro,
      includeFlow,
      catalyst,
      question,
      primaryContext: {
        price: primary.price,
        changePct: primary.changePct,
        momentumPct: primary.momentumPct,
        volatilityPct: primary.volatilityPct,
        support: primary.support,
        resistance: primary.resistance,
        sentiment: primary.sentiment,
        headlines: primary.news.slice(0, 6).map((item) => ({
          title: item.title,
          source: item.source,
          publishedAt: item.publishedAt,
          sentiment: item.sentiment,
        })),
      },
      compareContext: compareContext
        ? {
            symbol: compareContext.symbol,
            price: compareContext.price,
            changePct: compareContext.changePct,
            momentumPct: compareContext.momentumPct,
            volatilityPct: compareContext.volatilityPct,
            sentiment: compareContext.sentiment,
          }
        : null,
    };

    return [
      "You are a principal buy-side research strategist.",
      "Return ONLY JSON. No markdown.",
      "Schema:",
      '{"verdict":string,"confidence":number,"executiveSummary":string,"bullCase":string[],"bearCase":string[],"riskControls":string[],"scenarios":[{"name":string,"probability":number,"narrative":string,"target":string,"invalidates":string}],"actionPlan":{"entry":string,"stop":string,"target":string,"positionSizing":string,"timeHorizon":string},"followUps":string[],"citations":string[]}',
      "Keep output concise, specific, tactical, and risk-aware.",
      `Input: ${JSON.stringify(payload)}`,
    ].join("\n");
  };

  const handleGenerate = async () => {
    if (!primaryContext) return;

    setGenerating(true);
    setError("");
    setRawAnswer("");

    const fallback = heuristicsReport(
      primaryContext,
      compareContext,
      question,
      mode,
      horizon,
      riskProfile,
      catalyst
    );

    const prompt = generatePrompt();

    try {
      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: prompt, symbol: primarySymbol }),
        });

        if (response.ok) {
          const data = await response.json();
          const answer = String(data?.answer ?? "");
          if (answer) {
            setRawAnswer(answer);
            const json = extractJsonObject(answer);
            if (json) {
              setReport(coerceReport(json, fallback));
              return;
            }
          }
        }
      } catch {
        // fallback
      }

      if (API_BASE) {
        try {
          const response = await fetch(`${API_BASE}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: prompt, symbol: primarySymbol }),
          });

          if (response.ok) {
            const data = await response.json();
            const answer = String(data?.answer ?? "");
            if (answer) {
              setRawAnswer(answer);
              const json = extractJsonObject(answer);
              if (json) {
                setReport(coerceReport(json, fallback));
                return;
              }
            }
          }
        } catch {
          // fallback
        }
      }

      setReport(fallback);
      setRawAnswer("Heuristic fallback report generated because structured AI response was unavailable.");
    } finally {
      setGenerating(false);
    }
  };

  const saveWorkspace = () => {
    if (!report || !primaryContext) return;

    const entry: Workspace = {
      id: `${primarySymbol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      title: workspaceTitle(primarySymbol, mode, question),
      primarySymbol,
      compareSymbol: compareSymbol.trim().toUpperCase(),
      question,
      mode,
      horizon,
      riskProfile,
      report,
    };

    setWorkspaces((current) => [entry, ...current].slice(0, 20));
  };

  const loadWorkspace = (workspace: Workspace) => {
    setPrimarySymbol(workspace.primarySymbol);
    setCompareSymbol(workspace.compareSymbol);
    setQuestion(workspace.question);
    setMode(workspace.mode);
    setHorizon(workspace.horizon);
    setRiskProfile(workspace.riskProfile);
    setReport(workspace.report);
    setRawAnswer("Loaded from workspace archive.");
  };

  const deleteWorkspace = (id: string) => {
    setWorkspaces((current) => current.filter((workspace) => workspace.id !== id));
  };

  const copyMemo = async () => {
    if (!report) return;

    const markdown = markdownFromReport(report, primarySymbol, compareSymbol.trim().toUpperCase());
    await navigator.clipboard.writeText(markdown);
    setRawAnswer("Research memo copied to clipboard.");
  };

  const primarySentimentLabel = primaryContext
    ? primaryContext.sentiment > 0.2
      ? "Positive"
      : primaryContext.sentiment < -0.2
      ? "Cautious"
      : "Mixed"
    : "Mixed";

  const feed = useMemo(() => {
    const list = [...(primaryContext?.news ?? [])];
    if (compareContext) list.push(...compareContext.news.slice(0, 4));
    return list
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, 12);
  }, [primaryContext, compareContext]);

  const promptTemplates = useMemo(
    () => [
      `Build a risk-first investment memo for ${primarySymbol} with explicit invalidation triggers.`,
      `Design a catalyst-aware plan for ${primarySymbol} around ${catalyst}.`,
      `Compare ${primarySymbol}${compareSymbol ? ` and ${compareSymbol.toUpperCase()}` : " versus sector peers"} for relative strength and downside resilience.`,
    ],
    [primarySymbol, compareSymbol, catalyst]
  );

  return (
    <div className="space-y-4">
      <section className="surface-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold section-title inline-flex items-center gap-2">
            <BrainCircuit size={18} />
            Next-Gen Research Assistant
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${dataMode === "remote" ? "badge-positive" : "badge-neutral"}`}>
              Data: {dataMode === "remote" ? "Remote" : dataMode === "local" ? "Local" : "Synthetic"}
            </span>
            <span className="rounded-full px-2.5 py-1 badge-neutral">Mode: {modeSummary}</span>
          </div>
        </div>

        <div className="mt-4 grid xl:grid-cols-[1.35fr_1fr] gap-4">
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={primarySymbol}
                onChange={(event) => setPrimarySymbol(event.target.value.toUpperCase())}
                placeholder="Primary symbol"
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
              <input
                value={compareSymbol}
                onChange={(event) => setCompareSymbol(event.target.value.toUpperCase())}
                placeholder="Compare symbol (optional)"
                className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
              />
            </div>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a deep strategic question"
              className="w-full min-h-[84px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
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
              <label className="text-xs flex items-center gap-1 rounded-lg control-surface px-2.5 py-2 bg-white/75 dark:bg-black/20">
                <input
                  type="checkbox"
                  checked={includeMacro}
                  onChange={(event) => setIncludeMacro(event.target.checked)}
                />
                Macro
              </label>
              <label className="text-xs flex items-center gap-1 rounded-lg control-surface px-2.5 py-2 bg-white/75 dark:bg-black/20">
                <input
                  type="checkbox"
                  checked={includeFlow}
                  onChange={(event) => setIncludeFlow(event.target.checked)}
                />
                Flow
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {promptTemplates.map((template) => (
                <button
                  key={template}
                  onClick={() => {
                    setQuestion(template);
                  }}
                  className="text-xs rounded-full control-surface bg-white/70 dark:bg-black/20 px-3 py-1.5"
                >
                  {template.length > 70 ? `${template.slice(0, 70)}...` : template}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || contextLoading || !primaryContext}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? "Generating Memo" : "Generate Advanced Memo"}
              </button>
              <button
                onClick={saveWorkspace}
                disabled={!report}
                className="inline-flex items-center gap-2 rounded-lg control-surface px-3 py-2 text-sm"
              >
                <Save size={15} />
                Save Workspace
              </button>
              <button
                onClick={copyMemo}
                disabled={!report}
                className="inline-flex items-center gap-2 rounded-lg control-surface px-3 py-2 text-sm"
              >
                <Copy size={15} />
                Copy Memo
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {[primaryContext, compareContext].filter(Boolean).map((context) => {
              const item = context as SymbolContext;
              return (
                <div key={item.symbol} className="card-elevated rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.symbol}</span>
                    <span className="text-xs muted">{item.mode}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="muted">Last</div>
                      <div className="font-semibold metric-value">{item.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="muted">Change</div>
                      <div className={`font-semibold metric-value ${item.changePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                        {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="muted">Momentum</div>
                      <div className="font-semibold metric-value">{item.momentumPct.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="muted">Volatility</div>
                      <div className="font-semibold metric-value">{item.volatilityPct.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="muted">Support</div>
                      <div className="font-semibold metric-value">{item.support.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="muted">Resistance</div>
                      <div className="font-semibold metric-value">{item.resistance.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="card-elevated rounded-xl p-3 text-xs">
              <div className="muted">Primary Sentiment</div>
              <div className="font-semibold mt-1">{primarySentimentLabel}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1.45fr_1fr] gap-4">
        <section className="surface-glass rounded-2xl p-5 sm:p-6">
          <h3 className="font-semibold section-title text-lg inline-flex items-center gap-2">
            <Target size={16} />
            Institutional Memo Output
          </h3>

          {error && <div className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

          {!report && (
            <div className="mt-4 card-elevated rounded-xl p-4 text-sm muted">
              Generate a memo to see advanced structured analysis.
            </div>
          )}

          {report && (
            <div className="mt-4 space-y-4">
              <div className="card-elevated rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm font-semibold">{report.verdict}</div>
                  <span className="text-xs rounded-full badge-neutral px-2.5 py-1">
                    Confidence {Math.round(report.confidence)}%
                  </span>
                </div>
                <p className="text-sm mt-2 leading-relaxed">{report.executiveSummary}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-200">Bull Case</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {report.bullCase.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-200">Bear Case</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {report.bearCase.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Risk Controls</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {report.riskControls.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                {report.scenarios.map((scenario) => (
                  <div key={scenario.name} className="card-elevated rounded-xl p-3">
                    <div className="text-sm font-semibold">{scenario.name}</div>
                    <div className="text-xs muted mt-1">Probability {Math.round(scenario.probability)}%</div>
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
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Action Plan</div>
                <div className="grid sm:grid-cols-2 gap-2 mt-2 text-sm">
                  <div><span className="muted">Entry:</span> {report.actionPlan.entry}</div>
                  <div><span className="muted">Stop:</span> {report.actionPlan.stop}</div>
                  <div><span className="muted">Target:</span> {report.actionPlan.target}</div>
                  <div><span className="muted">Sizing:</span> {report.actionPlan.positionSizing}</div>
                  <div className="sm:col-span-2"><span className="muted">Horizon:</span> {report.actionPlan.timeHorizon}</div>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/25 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Suggested Follow-ups</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.followUps.map((item) => (
                    <button
                      key={item}
                      onClick={() => setQuestion(item)}
                      className="text-xs rounded-full control-surface px-3 py-1.5 bg-white/70 dark:bg-black/20"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rawAnswer && (
            <div className="mt-4 text-xs muted rounded-lg control-surface p-2 bg-white/60 dark:bg-black/20">
              {rawAnswer}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="surface-glass rounded-2xl p-4">
            <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
              <Newspaper size={15} />
              Intelligence Feed
            </h3>
            <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {feed.map((item, index) => (
                <a
                  key={`${item.title}-${index}`}
                  href={item.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg control-surface bg-white/70 dark:bg-black/20 p-3"
                >
                  <div className="text-xs font-medium leading-snug">{item.title}</div>
                  <div className="text-[11px] muted mt-1">
                    {item.source} · {new Date(item.publishedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </a>
              ))}
              {!feed.length && <div className="text-xs muted">No feed items available.</div>}
            </div>
          </section>

          <section className="surface-glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
                <Library size={15} />
                Workspace Archive
              </h3>
              <span className="text-xs muted">{workspaces.length}</span>
            </div>

            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 p-3">
                  <div className="text-xs font-semibold">{workspace.title}</div>
                  <div className="text-[11px] muted mt-1">
                    {workspace.primarySymbol}
                    {workspace.compareSymbol ? ` vs ${workspace.compareSymbol}` : ""} · {workspace.mode} · {new Date(workspace.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => loadWorkspace(workspace)}
                      className="text-[11px] inline-flex items-center gap-1 rounded-md control-surface px-2 py-1"
                    >
                      <Plus size={11} />
                      Load
                    </button>
                    <button
                      onClick={() => deleteWorkspace(workspace.id)}
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

          <section className="surface-glass rounded-2xl p-4 text-xs muted inline-flex items-center gap-1">
            <Activity size={13} />
            This assistant is for research support. Validate every output before execution.
          </section>
        </aside>
      </div>
    </div>
  );
}
