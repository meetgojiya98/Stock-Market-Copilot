export type CopilotSource = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
  relevance: number;
  authority: number;
  channel: "local" | "google-news" | "duckduckgo" | "finnhub";
};

type SourceInput = {
  title?: unknown;
  source?: unknown;
  url?: unknown;
  publishedAt?: unknown;
  snippet?: unknown;
  relevance?: unknown;
  channel?: unknown;
};

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function safeUrl(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw;
}

function normalizeDate(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return new Date().toISOString();
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function toFinite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((item) => item.length > 2);
}

function recencyScore(publishedAt: string) {
  const ageHours = Math.max(0, (Date.now() - Date.parse(publishedAt)) / 3_600_000);
  return Math.max(0, 1 - ageHours / 72);
}

function sourceKey(source: { title: string; url: string }) {
  return `${source.title.toLowerCase().trim()}|${source.url.toLowerCase().trim()}`;
}

const TRUSTED_HOST_SCORES: Array<[RegExp, number]> = [
  [/reuters\.com$/i, 0.96],
  [/bloomberg\.com$/i, 0.95],
  [/wsj\.com$/i, 0.94],
  [/ft\.com$/i, 0.92],
  [/sec\.gov$/i, 0.99],
  [/(finance|markets)\.yahoo\.com$/i, 0.83],
  [/marketwatch\.com$/i, 0.82],
  [/fool\.com$/i, 0.73],
  [/investing\.com$/i, 0.76],
  [/cnbc\.com$/i, 0.85],
  [/duckduckgo\.com$/i, 0.62],
  [/news\.google\.com$/i, 0.62],
  [/finnhub\.io$/i, 0.84],
];

const TRUSTED_SOURCE_SCORES: Array<[RegExp, number]> = [
  [/reuters/i, 0.96],
  [/bloomberg/i, 0.95],
  [/wall street journal|wsj/i, 0.94],
  [/financial times|ft/i, 0.92],
  [/sec/i, 0.99],
  [/yahoo/i, 0.83],
  [/marketwatch/i, 0.82],
  [/cnbc/i, 0.85],
  [/finnhub/i, 0.84],
  [/duckduckgo/i, 0.62],
  [/google news/i, 0.62],
];

function extractHostname(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function authorityScore(source: string, url: string) {
  const host = extractHostname(url);
  const sourceName = normalizeText(source).toLowerCase();
  const hostMatch = TRUSTED_HOST_SCORES.find(([pattern]) => pattern.test(host));
  const sourceMatch = TRUSTED_SOURCE_SCORES.find(([pattern]) => pattern.test(sourceName));
  const hostScore = hostMatch ? hostMatch[1] : 0.58;
  const sourceScore = sourceMatch ? sourceMatch[1] : 0.58;
  return Math.max(0.4, Math.min(1, hostScore * 0.62 + sourceScore * 0.38));
}

function asSource(entry: SourceInput, channel: CopilotSource["channel"]): CopilotSource | null {
  const title = normalizeText(entry.title);
  const url = safeUrl(entry.url);
  if (!title) return null;
  const source = normalizeText(entry.source) || "Unknown";
  return {
    id: "",
    title,
    source,
    url,
    publishedAt: normalizeDate(entry.publishedAt),
    snippet: normalizeText(entry.snippet),
    relevance: Math.max(0, Math.min(1, toFinite(entry.relevance) || 0)),
    authority: authorityScore(source, url),
    channel,
  };
}

export function sanitizeLocalSources(raw: unknown) {
  if (!Array.isArray(raw)) return [] as CopilotSource[];
  const sources = raw
    .map((item) => asSource(item as SourceInput, "local"))
    .filter((item): item is CopilotSource => Boolean(item));
  return sources.slice(0, 12);
}

async function fetchGoogleNews(query: string) {
  const q = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [] as CopilotSource[];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12);
    return items
      .map((match) => {
        const block = match[1];
        const tag = (name: string) => {
          const found = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
          return decodeHtml(
            normalizeText(found?.[1]).replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "")
          );
        };
        return asSource(
          {
            title: tag("title"),
            url: tag("link"),
            source: tag("source") || "Google News",
            publishedAt: tag("pubDate"),
            snippet: tag("description"),
            relevance: 0.5,
          },
          "google-news"
        );
      })
      .filter((item): item is CopilotSource => Boolean(item));
  } catch {
    return [];
  }
}

function flattenDuckTopic(item: unknown): Array<{ text: string; firstUrl: string }> {
  if (!item || typeof item !== "object") return [];
  const row = item as Record<string, unknown>;
  if (Array.isArray(row.Topics)) {
    return row.Topics.flatMap((entry) => flattenDuckTopic(entry));
  }
  const text = normalizeText(row.Text);
  const firstUrl = safeUrl(row.FirstURL);
  if (!text) return [];
  return [{ text, firstUrl }];
}

async function fetchDuckDuckGo(query: string) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_html=1&skip_disambig=1&no_redirect=1`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [] as CopilotSource[];
    const payload = await response.json();
    const aggregate: CopilotSource[] = [];

    const abstractText = normalizeText(payload?.AbstractText);
    const abstractUrl = safeUrl(payload?.AbstractURL);
    if (abstractText) {
      aggregate.push({
        id: "",
        title: abstractText.split(".")[0] || abstractText,
        source: normalizeText(payload?.AbstractSource) || "DuckDuckGo",
        url: abstractUrl,
        publishedAt: new Date().toISOString(),
        snippet: abstractText,
        relevance: 0.45,
        authority: authorityScore(normalizeText(payload?.AbstractSource) || "DuckDuckGo", abstractUrl),
        channel: "duckduckgo",
      });
    }

    const related: Array<{ text: string; firstUrl: string }> = Array.isArray(payload?.RelatedTopics)
      ? payload.RelatedTopics.flatMap((item: unknown) => flattenDuckTopic(item))
      : [];

    related.slice(0, 8).forEach((item) => {
      aggregate.push({
        id: "",
        title: item.text.split("-")[0].trim() || item.text,
        source: "DuckDuckGo",
        url: item.firstUrl,
        publishedAt: new Date().toISOString(),
        snippet: item.text,
        relevance: 0.35,
        authority: authorityScore("DuckDuckGo", item.firstUrl),
        channel: "duckduckgo",
      });
    });

    return aggregate;
  } catch {
    return [];
  }
}

async function fetchFinnhubSymbolNews(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || !symbol) return [] as CopilotSource[];

  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 10);
  const fmt = (value: Date) => value.toISOString().slice(0, 10);

  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
    symbol
  )}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [] as CopilotSource[];
    const payload = await response.json();
    if (!Array.isArray(payload)) return [] as CopilotSource[];

    return payload
      .slice(0, 14)
      .map((item) =>
        asSource(
          {
            title: item?.headline,
            source: item?.source || "Finnhub",
            url: item?.url,
            publishedAt:
              typeof item?.datetime === "number"
                ? new Date(item.datetime * 1000).toISOString()
                : new Date().toISOString(),
            snippet: item?.summary,
            relevance: 0.6,
          },
          "finnhub"
        )
      )
      .filter((item): item is CopilotSource => Boolean(item));
  } catch {
    return [];
  }
}

export async function retrieveWebSources(query: string, symbol: string) {
  const searchQuery = `${query} ${symbol} stock`;
  const [google, duck, finnhub] = await Promise.all([
    fetchGoogleNews(searchQuery),
    fetchDuckDuckGo(searchQuery),
    fetchFinnhubSymbolNews(symbol),
  ]);
  return [...finnhub, ...google, ...duck];
}

export function mergeAndRankSources(
  query: string,
  localSources: CopilotSource[],
  webSources: CopilotSource[],
  limit = 10
) {
  const all = [...localSources, ...webSources];
  const deduped = new Map<string, CopilotSource>();
  all.forEach((item) => {
    const key = sourceKey(item);
    const existing = deduped.get(key);
    if (
      !existing ||
      item.relevance + item.authority * 0.35 > existing.relevance + existing.authority * 0.35
    ) {
      deduped.set(key, item);
    }
  });

  const queryTokens = new Set(tokenize(query));
  const ranked = [...deduped.values()]
    .map((item) => {
      const baseTokens = tokenize(`${item.title} ${item.snippet}`);
      const overlap = baseTokens.reduce((count, token) => (queryTokens.has(token) ? count + 1 : count), 0);
      const overlapScore = queryTokens.size ? overlap / queryTokens.size : 0;
      const score =
        item.relevance * 0.36 +
        overlapScore * 0.34 +
        recencyScore(item.publishedAt) * 0.12 +
        item.authority * 0.18;
      return {
        ...item,
        relevance: Math.max(0, Math.min(1, score)),
        authority: Math.max(0, Math.min(1, item.authority)),
      };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      id: `S${index + 1}`,
    }));

  return ranked;
}

function uniqueCitations(answer: string) {
  return Array.from(new Set([...answer.matchAll(/\[(S\d+)\]/g)].map((match) => match[1])));
}

export function ensureSourceTrail(answer: string, sources: CopilotSource[]) {
  if (!sources.length) return answer;
  const hasTrail = answer.includes("### Source Trail");
  const hasCitation = /\[S\d+\]/.test(answer);
  if (hasTrail && hasCitation) return answer;

  const lines = sources.slice(0, 5).map((item) => {
    const link = item.url || "#";
    return `- [${item.id}] ${item.title} (${item.source}) ${link}`;
  });

  return [answer.trim(), "", "### Source Trail", ...lines].join("\n");
}

export function computeGroundingMetrics(answer: string, sources: CopilotSource[]) {
  if (!sources.length) {
    return {
      groundingConfidence: 0,
      citationVerificationScore: 0,
      sourceAuthorityScore: 0,
      citationUsage: { used: 0, verified: 0, total: 0 },
    };
  }

  const answerTokens = tokenize(answer);
  const answerSet = new Set(answerTokens);
  const supportScores = sources.map((source) => {
    const tokens = tokenize(`${source.title} ${source.snippet}`);
    if (!tokens.length) return 0;
    const overlap = tokens.reduce((count, token) => (answerSet.has(token) ? count + 1 : count), 0);
    return overlap / tokens.length;
  });

  const topSupport = supportScores.sort((a, b) => b - a).slice(0, 3);
  const supportScore =
    topSupport.length > 0
      ? topSupport.reduce((sum, value) => sum + value, 0) / topSupport.length
      : 0;

  const cited = uniqueCitations(answer);
  const sourceIdSet = new Set(sources.map((source) => source.id));
  const verified = cited.filter((id) => sourceIdSet.has(id)).length;
  const citationCoverage = cited.length / Math.max(1, Math.min(5, sources.length));
  const citationPrecision = verified / Math.max(1, cited.length);
  const urlValidity =
    sources.filter((source) => /^https?:\/\//i.test(source.url)).length / Math.max(1, sources.length);
  const freshness =
    sources.reduce((sum, source) => sum + recencyScore(source.publishedAt), 0) /
    Math.max(1, sources.length);
  const authority =
    sources.reduce((sum, source) => sum + Math.max(0, Math.min(1, source.authority)), 0) /
    Math.max(1, sources.length);

  const citationVerificationScore = Math.min(
    1,
    citationCoverage * 0.3 + citationPrecision * 0.25 + urlValidity * 0.2 + authority * 0.25
  );
  const groundingConfidence = Math.min(
    1,
    supportScore * 0.45 + citationVerificationScore * 0.25 + freshness * 0.15 + authority * 0.15
  );

  return {
    groundingConfidence: Number((groundingConfidence * 100).toFixed(1)),
    citationVerificationScore: Number((citationVerificationScore * 100).toFixed(1)),
    sourceAuthorityScore: Number((authority * 100).toFixed(1)),
    citationUsage: {
      used: cited.length,
      verified,
      total: sources.length,
    },
  };
}
