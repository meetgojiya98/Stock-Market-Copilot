"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

export type ResearchMode = "thesis" | "earnings" | "risk" | "pair-trade" | "macro";
export type HorizonMode = "intraday" | "swing" | "position" | "long-term";
export type RiskProfile = "defensive" | "balanced" | "aggressive";

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: number;
};

export type PricePoint = {
  ts: number;
  price: number;
};

export type SymbolContext = {
  symbol: string;
  mode: "remote" | "local" | "synthetic";
  price: number;
  changePct: number;
  momentum20Pct: number;
  momentum60Pct: number;
  volatilityPct: number;
  atrPct: number;
  support: number;
  resistance: number;
  sentiment: number;
  newsVelocity: number;
  liquidityScore: number;
  points: PricePoint[];
  news: NewsItem[];
  asOf: string;
};

export type ResearchScenario = {
  name: string;
  probability: number;
  narrative: string;
  target: string;
  invalidates: string;
};

export type FactorExposure = {
  name: string;
  score: number;
  rationale: string;
};

export type ShockScenario = {
  name: string;
  shock: string;
  expectedMovePct: number;
  impact: string;
  response: string;
};

export type ResearchDecisionPacket = {
  verdict: string;
  confidence: number;
  signalScore: number;
  conviction: "low" | "medium" | "high";
  regime: string;
  executiveSummary: string;
  setupChecklist: string[];
  bullCase: string[];
  bearCase: string[];
  counterThesis: string[];
  keyLevels: {
    support: string;
    resistance: string;
    breakout: string;
    breakdown: string;
  };
  scenarios: ResearchScenario[];
  factorExposure: FactorExposure[];
  shocks: ShockScenario[];
  actionPlan: {
    entry: string;
    stop: string;
    target: string;
    sizing: string;
    hedge: string;
    invalidation: string;
  };
  followUps: string[];
  citations: string[];
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
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
  return clamp(value, -1, 1);
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
  let price = 40 + (seed % 260);
  const now = Date.now();

  return Array.from({ length: 252 }).map((_, index) => {
    const ts = now - (251 - index) * 24 * 60 * 60 * 1000;
    const wave = Math.sin(index / (5 + (seed % 5))) * 0.0075;
    const noise = (random() - 0.5) * 0.017;
    const drift = ((seed % 11) - 5) / 2000;

    price = Math.max(2, price * (1 + drift + wave + noise));
    return { ts, price: Number(price.toFixed(2)) };
  });
}

function normalizeChart(raw: unknown[]): PricePoint[] {
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const ts =
        toNumber(row?.ts) ??
        toNumber(row?.x) ??
        (row?.date ? Date.parse(String(row.date)) : null) ??
        (row?.time ? Date.parse(String(row.time)) : null);

      const price = toNumber(row?.price) ?? toNumber(row?.close) ?? toNumber(row?.y);
      if (ts === null || price === null || !Number.isFinite(ts) || price <= 0) return null;
      return { ts, price };
    })
    .filter((item): item is PricePoint => Boolean(item))
    .sort((a, b) => a.ts - b.ts)
    .slice(-252);
}

function normalizeNews(raw: unknown[]): NewsItem[] {
  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const title = String(row?.headline ?? row?.title ?? "").trim();
      if (!title) return null;

      const source = String(row?.source ?? row?.site ?? "Market Feed").trim();
      const publishedAt =
        toNumber(row?.datetime) !== null
          ? new Date(Number(row.datetime) * 1000).toISOString()
          : String(row?.publishedAt ?? row?.date ?? new Date().toISOString());
      const url = String(row?.url ?? "#");
      const summary = String(row?.summary ?? row?.description ?? "").trim();
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
    .slice(0, 16);
}

function fallbackNews(symbol: string): NewsItem[] {
  const templates = [
    `${symbol} remains a high-conviction battleground for growth versus valuation`,
    `${symbol} catalyst path now tied to earnings quality and forward guide confidence`,
    `${symbol} positioning appears crowded into key macro prints`,
    `${symbol} cross-asset volatility can reprice risk quickly`,
  ];

  return templates.map((title, index) => ({
    title,
    url: "#",
    source: "Research Synth",
    publishedAt: new Date(Date.now() - index * 4 * 60 * 60 * 1000).toISOString(),
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

  const momentum20Pct =
    closes.length > 20
      ? ((closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21]) * 100
      : 0;
  const momentum60Pct =
    closes.length > 60
      ? ((closes[closes.length - 1] - closes[closes.length - 61]) / closes[closes.length - 61]) * 100
      : momentum20Pct;
  const volatilityPct = std(returns.map((value) => value * 100));
  const atrPct = avg(returns.map((value) => Math.abs(value))) * 100;
  const support = percentile(closes, 0.2);
  const resistance = percentile(closes, 0.8);

  return { momentum20Pct, momentum60Pct, volatilityPct, atrPct, support, resistance, returns };
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSymbolContext(symbol: string): Promise<SymbolContext> {
  const normalized = normalizeSymbol(symbol || "AAPL");
  let mode: "remote" | "local" | "synthetic" = "synthetic";

  let quoteData: Record<string, unknown> | null = null;
  let chartData: Record<string, unknown> | null = null;
  let newsData: Record<string, unknown> | null = null;

  const localResults = await Promise.allSettled([
    fetchJson(`/api/stocks/price?symbol=${normalized}`),
    fetchJson(`/api/stocks/chart?symbol=${normalized}`),
    fetchJson(`/api/stocks/news?symbol=${normalized}`),
  ]);

  if (localResults[0].status === "fulfilled") {
    quoteData = localResults[0].value as Record<string, unknown>;
    mode = "local";
  }
  if (localResults[1].status === "fulfilled") {
    chartData = localResults[1].value as Record<string, unknown>;
    mode = "local";
  }
  if (localResults[2].status === "fulfilled") {
    newsData = localResults[2].value as Record<string, unknown>;
    mode = "local";
  }

  if (API_BASE && (!quoteData || !chartData || !newsData)) {
    const remoteResults = await Promise.allSettled([
      quoteData ? Promise.resolve(quoteData) : fetchJson(`${API_BASE}/price/${normalized}`),
      chartData ? Promise.resolve(chartData) : fetchJson(`${API_BASE}/chart/${normalized}`),
      newsData ? Promise.resolve(newsData) : fetchJson(`${API_BASE}/news/${normalized}`),
    ]);

    if (remoteResults[0].status === "fulfilled") {
      quoteData = remoteResults[0].value as Record<string, unknown>;
      mode = "remote";
    }
    if (remoteResults[1].status === "fulfilled") {
      chartData = remoteResults[1].value as Record<string, unknown>;
      mode = "remote";
    }
    if (remoteResults[2].status === "fulfilled") {
      newsData = remoteResults[2].value as Record<string, unknown>;
      mode = "remote";
    }
  }

  const chartRaw = Array.isArray(chartData?.data)
    ? (chartData.data as unknown[])
    : Array.isArray(chartData?.history)
    ? (chartData.history as unknown[])
    : Array.isArray(chartData)
    ? chartData
    : [];
  const points = normalizeChart(chartRaw);
  const finalPoints = points.length >= 40 ? points : syntheticChart(normalized);
  const latest = finalPoints[finalPoints.length - 1]?.price ?? 0;
  const prev = finalPoints[Math.max(finalPoints.length - 2, 0)]?.price ?? latest;

  const quotePrice = toNumber(quoteData?.price);
  const price = quotePrice !== null && quotePrice > 0 ? quotePrice : latest;
  const rawChange = toNumber(quoteData?.change);
  const changePct = rawChange !== null ? rawChange : prev > 0 ? ((price - prev) / prev) * 100 : 0;

  const newsRaw = Array.isArray(newsData?.news)
    ? (newsData.news as unknown[])
    : Array.isArray(newsData)
    ? newsData
    : [];
  const normalizedNews = normalizeNews(newsRaw);
  const news = normalizedNews.length ? normalizedNews : fallbackNews(normalized);
  const sentiment = avg(news.map((item) => item.sentiment));
  const newsVelocity = news.filter((item) => Date.now() - Date.parse(item.publishedAt) <= 48 * 60 * 60 * 1000)
    .length;

  const metrics = computeMetrics(finalPoints);
  const liquidityScore = clamp(100 - metrics.atrPct * 7, 5, 95);

  return {
    symbol: normalized,
    mode: mode === "synthetic" && (quoteData || chartData || newsData) ? "local" : mode,
    price,
    changePct,
    momentum20Pct: metrics.momentum20Pct,
    momentum60Pct: metrics.momentum60Pct,
    volatilityPct: metrics.volatilityPct,
    atrPct: metrics.atrPct,
    support: metrics.support,
    resistance: metrics.resistance,
    sentiment,
    newsVelocity,
    liquidityScore,
    points: finalPoints,
    news,
    asOf: new Date().toISOString(),
  };
}

function returnsFromPoints(points: PricePoint[]) {
  return points.slice(1).map((point, index) => {
    const prev = points[index]?.price ?? 0;
    return prev > 0 ? (point.price - prev) / prev : 0;
  });
}

function correlation(a: number[], b: number[]) {
  const size = Math.min(a.length, b.length);
  if (size < 12) return 0;
  const left = a.slice(-size);
  const right = b.slice(-size);
  const meanA = avg(left);
  const meanB = avg(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - meanA) * (right[index] - meanB), 0);
  const denominator = Math.sqrt(
    left.reduce((sum, value) => sum + (value - meanA) ** 2, 0) *
      right.reduce((sum, value) => sum + (value - meanB) ** 2, 0)
  );
  if (!denominator) return 0;
  return clamp(numerator / denominator, -1, 1);
}

function convictionFromScore(score: number, volatilityPct: number): "low" | "medium" | "high" {
  if (score >= 72 && volatilityPct <= 2.6) return "high";
  if (score <= 46 || volatilityPct >= 4.1) return "low";
  return "medium";
}

function riskPerTrade(profile: RiskProfile) {
  if (profile === "aggressive") return 1.5;
  if (profile === "defensive") return 0.6;
  return 1.0;
}

function modeName(mode: ResearchMode) {
  if (mode === "pair-trade") return "pair-trade";
  return mode;
}

export function buildResearchDecisionPacket(input: {
  primary: SymbolContext;
  compare?: SymbolContext | null;
  benchmark?: SymbolContext | null;
  question: string;
  catalyst: string;
  mode: ResearchMode;
  horizon: HorizonMode;
  riskProfile: RiskProfile;
  includeMacro: boolean;
  includeFlow: boolean;
}): ResearchDecisionPacket {
  const { primary, compare, benchmark, question, catalyst, mode, horizon, riskProfile, includeMacro, includeFlow } =
    input;

  const benchmarkMomentum = benchmark?.momentum20Pct ?? 0;
  const relativeStrength = primary.momentum20Pct - benchmarkMomentum;

  const trendScore = clamp(50 + primary.momentum20Pct * 2.1 + primary.momentum60Pct * 0.8, 0, 100);
  const sentimentScorePct = clamp(50 + primary.sentiment * 45, 0, 100);
  const volatilityScore = clamp(100 - primary.volatilityPct * 18, 0, 100);
  const relativeScore = clamp(50 + relativeStrength * 2.3, 0, 100);
  const liquidityScore = clamp(primary.liquidityScore, 0, 100);

  const signalScore = Math.round(
    trendScore * 0.3 +
      sentimentScorePct * 0.18 +
      volatilityScore * 0.2 +
      relativeScore * 0.2 +
      liquidityScore * 0.12
  );
  const confidence = clamp(
    Math.round(signalScore * 0.86 + (includeMacro ? 4 : 0) + (includeFlow ? 3 : -1) - primary.atrPct * 3),
    22,
    96
  );
  const conviction = convictionFromScore(signalScore, primary.volatilityPct);

  const regime =
    primary.momentum20Pct > 3 && primary.volatilityPct < 2.8
      ? "Trend Expansion"
      : primary.momentum20Pct < -3 && primary.volatilityPct > 3.1
      ? "Risk Compression / Drawdown"
      : primary.volatilityPct > 3.8
      ? "High-Vol Mean Reversion"
      : "Balanced Rotation";

  const verdict =
    signalScore >= 65
      ? "Pro-Risk Long Bias"
      : signalScore <= 43
      ? "Defensive / Hedge Bias"
      : "Selective Tactical Exposure";

  const support = Math.max(0.01, primary.support);
  const resistance = Math.max(support * 1.01, primary.resistance);
  const breakout = resistance * 1.015;
  const breakdown = support * 0.985;

  const benchmarkReturns = benchmark ? returnsFromPoints(benchmark.points) : [];
  const primaryReturns = returnsFromPoints(primary.points);
  const betaProxy = benchmarkReturns.length
    ? correlation(primaryReturns, benchmarkReturns) * (std(primaryReturns) / Math.max(0.0001, std(benchmarkReturns)))
    : 0.8;
  const compareSpread = compare ? primary.momentum20Pct - compare.momentum20Pct : 0;

  const rateSensitivity = clamp(
    (mode === "macro" ? 35 : 22) + (primary.atrPct > 2.3 ? 15 : 6) + (primary.sentiment < -0.1 ? 8 : 0),
    0,
    100
  );
  const momentumExposure = clamp(50 + primary.momentum20Pct * 2.8, 0, 100);
  const idioRisk = clamp(45 + (primary.volatilityPct - (benchmark?.volatilityPct ?? 1.8)) * 14, 0, 100);

  const positionRisk = riskPerTrade(riskProfile);
  const bearishTilt = signalScore < 50;

  const setups = [
    `Regime: ${regime} with ${signalScore}/100 composite signal score.`,
    `Price structure: support ${support.toFixed(2)}, resistance ${resistance.toFixed(2)}.`,
    `Relative strength vs ${benchmark?.symbol || "benchmark"}: ${relativeStrength >= 0 ? "+" : ""}${relativeStrength.toFixed(2)}% (20-session).`,
    `Catalyst window: ${catalyst || "next key event"} within ${horizon} horizon.`,
  ];

  const bullCase = [
    `${primary.symbol} carries ${primary.momentum20Pct.toFixed(2)}% short-term momentum with ${signalScore >= 60 ? "statistically constructive" : "recovering"} breadth.`,
    `Headline sentiment is ${primary.sentiment >= 0.16 ? "supportive" : primary.sentiment <= -0.16 ? "fragile" : "mixed"} and can amplify continuation if catalyst resolves positively.`,
    `Liquidity score ${liquidityScore.toFixed(0)}/100 supports tactical scaling instead of single-leg entries.`,
  ];
  if (compare) {
    bullCase.push(
      `Pair spread vs ${compare.symbol} is ${compareSpread >= 0 ? "+" : ""}${compareSpread.toFixed(2)}%, favoring relative-strength rotation.`
    );
  }

  const bearCase = [
    `Breakdown below ${breakdown.toFixed(2)} risks fast repricing through weak hands and stop cascades.`,
    `Volatility regime (${primary.volatilityPct.toFixed(2)}%) can invalidate stale stops during macro prints.`,
    `${includeMacro ? "Rates/FX crosscurrents remain a primary tail-risk amplifier." : "Macro blind spots remain if external conditions shift quickly."}`,
  ];

  const counterThesis = [
    `Current signal may be a late-cycle continuation trap if breadth narrows further.`,
    `Sentiment and price can diverge; a positive headline tape does not guarantee post-event drift.`,
    `${primary.symbol} may underperform if market leadership rotates into lower-beta sectors.`,
  ];

  const scenarios: ResearchScenario[] = [
    {
      name: "Base Continuation",
      probability: 52,
      narrative: `${primary.symbol} holds above support and rotates toward breakout with controlled realized vol.`,
      target: `${resistance.toFixed(2)}-${(resistance * 1.04).toFixed(2)}`,
      invalidates: `Daily close below ${support.toFixed(2)}`,
    },
    {
      name: "Catalyst Breakout",
      probability: 28,
      narrative: `Catalyst surprise drives trend acceleration and higher valuation tolerance.`,
      target: `${(resistance * 1.08).toFixed(2)}+`,
      invalidates: `Failed break above ${breakout.toFixed(2)} with high sell volume`,
    },
    {
      name: "Risk-Off Unwind",
      probability: 20,
      narrative: `Macro/rates shock triggers de-risking and correlation spike.`,
      target: `${(support * 0.92).toFixed(2)}`,
      invalidates: `Session reclaim above ${support.toFixed(2)} after washout`,
    },
  ];

  const factorExposure: FactorExposure[] = [
    {
      name: "Market Beta",
      score: clamp(50 + betaProxy * 24, 0, 100),
      rationale: `Return correlation proxy implies beta ${betaProxy.toFixed(2)} vs ${benchmark?.symbol || "benchmark"}.`,
    },
    {
      name: "Rates Sensitivity",
      score: rateSensitivity,
      rationale: "Derived from mode, volatility regime, and sentiment fragility.",
    },
    {
      name: "Momentum Factor",
      score: momentumExposure,
      rationale: `20/60-session drift profile = ${primary.momentum20Pct.toFixed(2)}% / ${primary.momentum60Pct.toFixed(2)}%.`,
    },
    {
      name: "Idiosyncratic Risk",
      score: idioRisk,
      rationale: "Residual volatility above benchmark blend and catalyst uncertainty.",
    },
  ];

  const nasdaqShock = -8;
  const rateShockBps = 50;
  const volShock = 35;
  const usdShock = 2;

  const shocks: ShockScenario[] = [
    {
      name: "Index Shock",
      shock: `Nasdaq ${nasdaqShock}%`,
      expectedMovePct: Number((nasdaqShock * betaProxy).toFixed(2)),
      impact: bearishTilt ? "Could accelerate downside extension." : "Could force position de-grossing.",
      response: "Reduce gross by 30-40% and tighten invalidation to prior day low.",
    },
    {
      name: "Rates Repricing",
      shock: `Rates +${rateShockBps}bps`,
      expectedMovePct: Number((-0.045 * rateSensitivity).toFixed(2)),
      impact: "Valuation compression risk rises, especially if guidance confidence is weak.",
      response: "Pair with rate-hedge sleeve or lower multiple names; cap overnight exposure.",
    },
    {
      name: "Volatility Spike",
      shock: `VIX +${volShock}%`,
      expectedMovePct: Number((-0.6 * primary.atrPct).toFixed(2)),
      impact: "Execution quality deteriorates and stop-outs increase.",
      response: "Use smaller clips, wider but pre-defined stops, and avoid chasing breakouts.",
    },
    {
      name: "USD Strength",
      shock: `DXY +${usdShock}%`,
      expectedMovePct: Number((-0.24 * (includeMacro ? 1.2 : 0.8) * usdShock).toFixed(2)),
      impact: "Can pressure globally sensitive revenue assumptions.",
      response: "Review geographic revenue mix and adjust sector hedges.",
    },
  ];

  const actionPlan = {
    entry:
      signalScore >= 55
        ? `Scale in near ${support.toFixed(2)}-${(support * 1.01).toFixed(2)} and add only on close above ${breakout.toFixed(2)}.`
        : `Prefer reactive entries only after reclaim above ${support.toFixed(2)} with improving breadth.`,
    stop: `Hard invalidation at ${breakdown.toFixed(2)}; do not widen after entry.`,
    target: `Initial target ${resistance.toFixed(2)}, stretch target ${(resistance * 1.07).toFixed(2)} if momentum persists.`,
    sizing: `Risk ${positionRisk.toFixed(1)}% of equity per trade. Build in ${conviction === "high" ? "3 tranches" : "2 tranches"}.`,
    hedge:
      mode === "pair-trade" && compare
        ? `Hedge beta by pairing ${primary.symbol} vs ${compare.symbol} using spread discipline.`
        : `Use index puts or inverse ETF micro-hedge into catalyst/event windows.`,
    invalidation: `Thesis invalid if ${primary.symbol} closes below ${support.toFixed(2)} and sentiment remains deteriorating.`,
  };

  const followUps = [
    `How does this thesis change if ${primary.symbol} gaps through ${support.toFixed(2)} pre-market?`,
    `What hedge ratio minimizes drawdown under Nasdaq ${nasdaqShock}% shock?`,
    `Which peer offers the strongest relative hedge against this view?`,
  ];

  const executiveSummary = `${verdict}. ${primary.symbol} scores ${signalScore}/100 with ${conviction} conviction in a ${regime} regime. ${
    question || "Setup favors disciplined risk-first execution."
  }`;

  return {
    verdict,
    confidence,
    signalScore,
    conviction,
    regime,
    executiveSummary,
    setupChecklist: setups,
    bullCase,
    bearCase,
    counterThesis,
    keyLevels: {
      support: support.toFixed(2),
      resistance: resistance.toFixed(2),
      breakout: breakout.toFixed(2),
      breakdown: breakdown.toFixed(2),
    },
    scenarios,
    factorExposure,
    shocks,
    actionPlan,
    followUps,
    citations: primary.news.slice(0, 8).map((item) => item.title),
  };
}

export function extractJsonObject(text: string): unknown | null {
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

export function coerceDecisionPacket(
  candidate: unknown,
  fallback: ResearchDecisionPacket
): ResearchDecisionPacket {
  if (!candidate || typeof candidate !== "object") return fallback;
  const row = candidate as Record<string, unknown>;
  const action = (row.actionPlan || {}) as Record<string, unknown>;
  const keyLevels = (row.keyLevels || {}) as Record<string, unknown>;

  return {
    verdict: String(row.verdict ?? fallback.verdict),
    confidence: clamp(Number(row.confidence) || fallback.confidence, 1, 100),
    signalScore: clamp(Number(row.signalScore) || fallback.signalScore, 0, 100),
    conviction:
      row.conviction === "high" || row.conviction === "low" || row.conviction === "medium"
        ? row.conviction
        : fallback.conviction,
    regime: String(row.regime ?? fallback.regime),
    executiveSummary: String(row.executiveSummary ?? fallback.executiveSummary),
    setupChecklist: Array.isArray(row.setupChecklist)
      ? row.setupChecklist.slice(0, 8).map((item) => String(item))
      : fallback.setupChecklist,
    bullCase: Array.isArray(row.bullCase)
      ? row.bullCase.slice(0, 8).map((item) => String(item))
      : fallback.bullCase,
    bearCase: Array.isArray(row.bearCase)
      ? row.bearCase.slice(0, 8).map((item) => String(item))
      : fallback.bearCase,
    counterThesis: Array.isArray(row.counterThesis)
      ? row.counterThesis.slice(0, 8).map((item) => String(item))
      : fallback.counterThesis,
    keyLevels: {
      support: String(keyLevels.support ?? fallback.keyLevels.support),
      resistance: String(keyLevels.resistance ?? fallback.keyLevels.resistance),
      breakout: String(keyLevels.breakout ?? fallback.keyLevels.breakout),
      breakdown: String(keyLevels.breakdown ?? fallback.keyLevels.breakdown),
    },
    scenarios: Array.isArray(row.scenarios)
      ? row.scenarios.slice(0, 5).map((scenario, index) => {
          const entry = scenario as Record<string, unknown>;
          return {
            name: String(entry.name ?? `Scenario ${index + 1}`),
            probability: clamp(Number(entry.probability) || 0, 0, 100),
            narrative: String(entry.narrative ?? "No narrative provided."),
            target: String(entry.target ?? "N/A"),
            invalidates: String(entry.invalidates ?? "N/A"),
          };
        })
      : fallback.scenarios,
    factorExposure: Array.isArray(row.factorExposure)
      ? row.factorExposure.slice(0, 6).map((factor, index) => {
          const entry = factor as Record<string, unknown>;
          return {
            name: String(entry.name ?? `Factor ${index + 1}`),
            score: clamp(Number(entry.score) || 0, 0, 100),
            rationale: String(entry.rationale ?? "N/A"),
          };
        })
      : fallback.factorExposure,
    shocks: Array.isArray(row.shocks)
      ? row.shocks.slice(0, 6).map((shock, index) => {
          const entry = shock as Record<string, unknown>;
          return {
            name: String(entry.name ?? `Shock ${index + 1}`),
            shock: String(entry.shock ?? "N/A"),
            expectedMovePct: Number(entry.expectedMovePct) || 0,
            impact: String(entry.impact ?? "N/A"),
            response: String(entry.response ?? "N/A"),
          };
        })
      : fallback.shocks,
    actionPlan: {
      entry: String(action.entry ?? fallback.actionPlan.entry),
      stop: String(action.stop ?? fallback.actionPlan.stop),
      target: String(action.target ?? fallback.actionPlan.target),
      sizing: String(action.sizing ?? fallback.actionPlan.sizing),
      hedge: String(action.hedge ?? fallback.actionPlan.hedge),
      invalidation: String(action.invalidation ?? fallback.actionPlan.invalidation),
    },
    followUps: Array.isArray(row.followUps)
      ? row.followUps.slice(0, 8).map((item) => String(item))
      : fallback.followUps,
    citations: Array.isArray(row.citations)
      ? row.citations.slice(0, 12).map((item) => String(item))
      : fallback.citations,
  };
}

export function workspaceTitle(primary: string, mode: ResearchMode, question: string) {
  if (question.trim()) return `${normalizeSymbol(primary)} · ${question.slice(0, 44)}`;
  return `${normalizeSymbol(primary)} · ${modeName(mode)}`;
}

export function markdownFromDecisionPacket(
  packet: ResearchDecisionPacket,
  primarySymbol: string,
  compareSymbol: string
) {
  const lines = [
    `# Research Decision Pack - ${primarySymbol}${compareSymbol ? ` vs ${compareSymbol}` : ""}`,
    "",
    `**Verdict:** ${packet.verdict}`,
    `**Confidence:** ${Math.round(packet.confidence)}%`,
    `**Signal Score:** ${Math.round(packet.signalScore)}/100`,
    `**Regime:** ${packet.regime}`,
    "",
    "## Executive Summary",
    packet.executiveSummary,
    "",
    "## Setup Checklist",
    ...packet.setupChecklist.map((item) => `- ${item}`),
    "",
    "## Bull Case",
    ...packet.bullCase.map((item) => `- ${item}`),
    "",
    "## Bear Case",
    ...packet.bearCase.map((item) => `- ${item}`),
    "",
    "## Counter-Thesis",
    ...packet.counterThesis.map((item) => `- ${item}`),
    "",
    "## Action Plan",
    `- Entry: ${packet.actionPlan.entry}`,
    `- Stop: ${packet.actionPlan.stop}`,
    `- Target: ${packet.actionPlan.target}`,
    `- Sizing: ${packet.actionPlan.sizing}`,
    `- Hedge: ${packet.actionPlan.hedge}`,
    `- Invalidation: ${packet.actionPlan.invalidation}`,
  ];

  return lines.join("\n");
}

export function sparklinePath(points: PricePoint[], width: number, height: number) {
  if (points.length < 2) return "";
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(0.0001, max - min);
  const stepX = width / Math.max(1, points.length - 1);

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point.price - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
