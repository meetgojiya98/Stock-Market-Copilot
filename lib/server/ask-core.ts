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
  const parsed = Number(process.env.ASK_TIMEOUT_MS ?? 16000);
  if (!Number.isFinite(parsed) || parsed < 2000) return 16000;
  return Math.floor(parsed);
})();

const DIRECT_LLM_API_KEY =
  process.env.DIRECT_LLM_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
const DIRECT_LLM_BASE = normalizeBase(process.env.DIRECT_LLM_BASE) || "https://api.groq.com/openai/v1";
const DIRECT_LLM_MODEL = (process.env.DIRECT_LLM_MODEL || "llama-3.1-8b-instant").trim();

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
    .slice(0, 8)
    .map((item, index) => `- [S${index + 1}] ${item.title} (${item.source}) ${item.url || "#"}`)
    .join("\n");

  return [
    "You are an institutional-grade market research copilot.",
    "Be precise and risk-first. Do not fabricate facts.",
    "Use markdown sections:",
    "### Direct Answer",
    "### Evidence",
    "### Risks / Counterpoints",
    "### Action Plan",
    "### Source Trail",
    `Symbol: ${symbol || "N/A"}`,
    `Question: ${query || "Provide a risk-first setup."}`,
    sourceLines ? `Sources:\n${sourceLines}` : "Sources: none provided",
  ].join("\n");
}

async function fetchDirectLlmAnswer(
  query: string,
  symbol: string,
  sources: BaseSource[]
): Promise<{ answer: string; detail: string } | null> {
  if (!DIRECT_LLM_API_KEY || !DIRECT_LLM_MODEL || !DIRECT_LLM_BASE) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  try {
    const response = await fetch(`${DIRECT_LLM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECT_LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: DIRECT_LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a concise, factual financial research assistant.",
          },
          {
            role: "user",
            content: buildDirectPrompt(query, symbol, sources),
          },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload: Record<string, unknown> = contentType.includes("application/json")
      ? ((await response.json().catch(() => ({}))) as Record<string, unknown>)
      : { detail: await response.text().catch(() => "") };

    if (!response.ok) {
      const detail = String(payload?.detail ?? "").trim() || `Direct LLM request failed (${response.status}).`;
      throw new Error(detail);
    }

    const choices = Array.isArray(payload?.choices) ? payload.choices : [];
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    const answer = String(message?.content ?? "").trim();
    if (looksLikeEmptyAnswer(answer)) {
      throw new Error("Direct LLM response was empty.");
    }

    return {
      answer,
      detail: `Direct model response via ${DIRECT_LLM_MODEL}.`,
    };
  } finally {
    clearTimeout(timeout);
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

  try {
    const direct = await fetchDirectLlmAnswer(query, symbol, sources);
    if (direct?.answer) {
      return {
        answer: direct.answer,
        mode: "live" as const,
        detail: direct.detail,
      };
    }
  } catch (error) {
    lastDetail = error instanceof Error ? error.message : "Direct LLM fallback failed.";
  }

  return {
    answer: deterministicFallbackAnswer(query, symbol, lastDetail, sources),
    mode: "deterministic" as const,
    detail: lastDetail,
  };
}
