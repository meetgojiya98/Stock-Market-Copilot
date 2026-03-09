import Anthropic from "@anthropic-ai/sdk";

type BaseSource = {
  id?: string;
  title: string;
  source: string;
  url: string;
};

function normalizeBase(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
}

const CONFIGURED_BACKEND_BASES = [
  normalizeBase(process.env.API_BASE),
  normalizeBase(process.env.NEXT_PUBLIC_API_BASE),
].filter(Boolean);

const LOCAL_BACKEND_BASES = ["http://127.0.0.1:8000", "http://localhost:8000"];

const BACKEND_BASES = Array.from(
  new Set(
    process.env.NODE_ENV === "production"
      ? CONFIGURED_BACKEND_BASES
      : [...CONFIGURED_BACKEND_BASES, ...LOCAL_BACKEND_BASES]
  )
);

const ASK_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.ASK_TIMEOUT_MS ?? 30000);
  if (!Number.isFinite(parsed) || parsed < 2000) return 30000;
  return Math.floor(parsed);
})();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514").trim();

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export function normalizeSymbol(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

export function normalizeQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function deterministicFallbackAnswer(
  query: string,
  symbol: string,
  detail: string,
  sources: BaseSource[] = []
) {
  const activeSymbol = symbol || "the selected symbol";
  const focus = query || `Build a risk-first trade plan for ${activeSymbol}.`;
  const sourceTrail = sources
    .slice(0, 4)
    .map((item, index) => `- [S${index + 1}] ${item.title} (${item.source}) ${item.url || "#"}`)
    .join("\n");

  return [
    `Live AI endpoint is currently unavailable (${detail}). Deterministic mode is active.`,
    "",
    "### Direct Answer",
    `${activeSymbol} should be approached with a risk-first setup until live model inference resumes.`,
    "",
    "### Evidence",
    `- Focus: ${focus}`,
    `- Symbol: ${activeSymbol}`,
    "",
    "### Risks / Counterpoints",
    "- News regime can change faster than static assumptions.",
    "- Event risk can invalidate short-term technical structures quickly.",
    "",
    "### Action Plan",
    `1. Confirm trend and liquidity for ${activeSymbol} before entry.`,
    "2. Use staged entry sizing with max risk <= 1% portfolio equity.",
    "3. Define invalidation first, then set stop and target levels.",
    "4. Track catalyst timing and avoid holding through unknown event risk.",
    "5. Reassess if volume drops or price closes beyond invalidation level.",
    "",
    "### Source Trail",
    sourceTrail || "- No verified sources were supplied in this response.",
  ].join("\n");
}

function looksLikeEmptyAnswer(answer: string) {
  const text = answer.trim().toLowerCase();
  return !text || text === "no answer." || text === "no answer";
}

function buildDirectPrompt(query: string, symbol: string, sources: BaseSource[]) {
  const sourceLines = sources
    .slice(0, 10)
    .map((item, index) => `- [S${index + 1}] ${item.title} (${item.source}) ${item.url || "#"}`)
    .join("\n");

  return [
    `Symbol: ${symbol || "N/A"}`,
    `Question: ${query || "Provide a risk-first setup."}`,
    sourceLines ? `\nSources:\n${sourceLines}` : "\nSources: none provided",
  ].join("\n");
}

const SYSTEM_PROMPT = `You are an institutional-grade market research copilot powered by Claude. You provide precise, risk-first financial analysis.

Key principles:
- Be precise, evidence-driven, and risk-aware
- Never fabricate data or statistics
- Cite sources using [S1], [S2] notation for every factual claim
- If you don't have enough information, say so clearly
- Consider both bull and bear perspectives

Structure your response with these markdown sections:
### Direct Answer
### Evidence
### Risks / Counterpoints
### Action Plan
### Source Trail`;

async function fetchClaudeAnswer(
  query: string,
  symbol: string,
  sources: BaseSource[]
): Promise<{ answer: string; detail: string } | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  try {
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildDirectPrompt(query, symbol, sources),
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const answer = textBlock?.text?.trim() ?? "";

    if (looksLikeEmptyAnswer(answer)) {
      throw new Error("Claude response was empty.");
    }

    return {
      answer,
      detail: `Response via Claude (${ANTHROPIC_MODEL}).`,
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${error.message} (${error.status})`);
    }
    throw error;
  }
}

export async function fetchAskAnswer(
  payload: Record<string, unknown>,
  query: string,
  symbol: string,
  sources: BaseSource[] = []
) {
  let lastDetail = "AI service is unavailable.";
  const body = JSON.stringify(payload);

  // Try configured backend bases first
  for (const base of BACKEND_BASES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = res.headers.get("content-type") || "";
      const data: Record<string, unknown> = contentType.includes("application/json")
        ? ((await res.json().catch(() => ({}))) as Record<string, unknown>)
        : { detail: await res.text().catch(() => "") };
      if (!res.ok) {
        const detail = String(data?.detail ?? "").trim();
        lastDetail = detail || `AI request failed (${res.status}).`;
        continue;
      }

      const answer = String(data?.answer ?? "").trim();
      if (looksLikeEmptyAnswer(answer)) {
        lastDetail = "AI response was empty.";
        continue;
      }
      const responseMode =
        (data?.mode === "deterministic" ? "deterministic" : "live") as "live" | "deterministic";
      if (responseMode === "deterministic") {
        lastDetail = String(data?.detail ?? "").trim() || "Remote backend returned deterministic mode.";
        continue;
      }
      return {
        answer,
        mode: responseMode,
        detail: String(data?.detail ?? ""),
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        lastDetail = `AI request timed out after ${Math.round(ASK_TIMEOUT_MS / 1000)}s.`;
        continue;
      }
      lastDetail = error instanceof Error ? error.message : "AI service is unavailable.";
    }
  }

  // Fallback to Claude (Anthropic API) directly
  try {
    const claude = await fetchClaudeAnswer(query, symbol, sources);
    if (claude?.answer) {
      return {
        answer: claude.answer,
        mode: "live" as const,
        detail: claude.detail,
      };
    }
  } catch (error) {
    lastDetail = error instanceof Error ? error.message : "Claude API fallback failed.";
  }

  return {
    answer: deterministicFallbackAnswer(query, symbol, lastDetail, sources),
    mode: "deterministic" as const,
    detail: lastDetail,
  };
}

// Streaming support for Claude
export async function* streamClaudeAnswer(
  query: string,
  symbol: string,
  sources: BaseSource[],
  systemPrompt?: string
): AsyncGenerator<{ type: "text" | "done" | "error"; content: string }> {
  const client = getAnthropicClient();
  if (!client) {
    yield { type: "error", content: "Anthropic API key not configured." };
    return;
  }

  const sourceLines = sources
    .slice(0, 10)
    .map((item, index) => `- [S${index + 1}] ${item.title} (${item.source}) ${item.url || "#"}`)
    .join("\n");

  // Fetch live price data for the symbol if available
  let liveData = "";
  if (symbol && symbol !== "N/A") {
    try {
      const priceRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002"}/api/stocks/price?symbol=${symbol}`);
      if (priceRes.ok) {
        const p = await priceRes.json();
        if (p.price != null) {
          liveData = `\n### Live Market Data\n**${symbol}:** $${p.price} | Change: ${p.change || "N/A"} (${p.changePercent || "N/A"})`;
          if (p.high) liveData += ` | Day Range: $${p.low}-$${p.high}`;
          if (p.volume) liveData += ` | Volume: ${Number(p.volume).toLocaleString()}`;
          if (p["52WeekHigh"]) liveData += `\n**52W Range:** $${p["52WeekLow"]}-$${p["52WeekHigh"]}`;
          if (p.marketCap) liveData += ` | **Market Cap:** $${(p.marketCap / 1e9).toFixed(1)}B`;
          if (p.pe) liveData += ` | **P/E:** ${p.pe}`;
        }
      }
    } catch { /* skip if unavailable */ }
  }

  const userContent = [
    `Symbol: ${symbol || "N/A"}`,
    `Question: ${query || "Provide a risk-first setup."}`,
    liveData,
    sourceLines ? `\nSources:\n${sourceLines}` : "\nSources: none provided",
    `\nIMPORTANT: Reference the live market data with specific prices and numbers in your analysis.`,
  ].filter(Boolean).join("\n");

  try {
    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: systemPrompt || SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", content: event.delta.text };
      }
    }

    yield { type: "done", content: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claude streaming failed.";
    yield { type: "error", content: message };
  }
}
