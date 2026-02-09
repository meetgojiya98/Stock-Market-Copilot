"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  BrainCircuit,
  Copy,
  FlaskConical,
  Library,
  Loader2,
  Newspaper,
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
  type ResearchDecisionPacket,
  type ResearchMode,
  type RiskProfile,
  type SymbolContext,
} from "../lib/research-engine";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const WORKSPACES_KEY = "smc_research_workspaces_v4";

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

function scoreClass(score: number) {
  if (score >= 70) return "text-[var(--positive)]";
  if (score <= 40) return "text-[var(--negative)]";
  return "text-[var(--warning)]";
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

export default function ResearchPanel() {
  const [primarySymbol, setPrimarySymbol] = useState("AAPL");
  const [compareSymbol, setCompareSymbol] = useState("");
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("QQQ");
  const [question, setQuestion] = useState("");
  const [catalyst, setCatalyst] = useState("next earnings / macro print");

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
    const items = [
      ...(primaryContext?.news ?? []),
      ...(compareContext?.news.slice(0, 6) ?? []),
      ...(benchmarkContext?.news.slice(0, 6) ?? []),
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

  const handleGenerate = async () => {
    if (!primaryContext) {
      setError("Primary symbol context is not available yet.");
      return;
    }

    setGenerating(true);
    setError("");
    setNotice("");
    setRawAnswer("");

    const fallback = buildResearchDecisionPacket({
      primary: primaryContext,
      compare: compareContext,
      benchmark: benchmarkContext,
      question,
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
      question,
      fallback,
      primaryContext,
      compareContext,
      benchmarkContext,
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
          setNotice("Decision pack generated with AI + deterministic risk engine.");
          return;
        }
      }

      setPacket(fallback);
      setRawAnswer("AI response unavailable. Deterministic decision engine output generated.");
      setNotice("Decision pack generated in deterministic mode.");
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

  const modeSummary = modeLabel(mode);
  const dataMode = dataModeLabel(primaryContext, compareContext, benchmarkContext);

  return (
    <div className="space-y-4">
      <section className="surface-glass rounded-2xl p-5 sm:p-6 fade-up">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold section-title inline-flex items-center gap-2">
            <BrainCircuit size={18} />
            Research Decision Engine
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${dataMode === "Remote" ? "badge-positive" : "badge-neutral"}`}>
              Data: {dataMode}
            </span>
            <span className="rounded-full px-2.5 py-1 badge-neutral">Mode: {modeSummary}</span>
          </div>
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
                onClick={handleGenerate}
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

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4">
        <section className="surface-glass rounded-2xl p-5 sm:p-6 fade-in">
          <h3 className="font-semibold section-title text-lg inline-flex items-center gap-2">
            <Target size={16} />
            Institutional Decision Pack
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

              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/25 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] muted">Follow-Ups</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {packet.followUps.map((item) => (
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

          <section className="surface-glass rounded-2xl p-4">
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

          <section className="surface-glass rounded-2xl p-4">
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

          <section className="surface-glass rounded-2xl p-4">
            <h3 className="font-semibold section-title text-sm inline-flex items-center gap-2">
              <Newspaper size={15} />
              Intelligence Feed
            </h3>
            <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {feed.map((item, index) => (
                <a
                  key={`${item.title}-${index}`}
                  href={item.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg control-surface bg-white/70 dark:bg-black/20 p-2.5"
                >
                  <div className="text-xs font-medium leading-snug">{item.title}</div>
                  <div className="text-[11px] muted mt-1">
                    {item.source} · {formatDate(item.publishedAt)}
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

          <section className="surface-glass rounded-2xl p-4 text-xs muted inline-flex items-center gap-1">
            <ShieldAlert size={13} />
            Validate every output before execution. This workspace is decision support, not financial advice.
          </section>
        </aside>
      </div>
    </div>
  );
}
