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

const BACKEND_BASES = Array.from(
  new Set(
    [
      normalizeBase(process.env.API_BASE),
      normalizeBase(process.env.NEXT_PUBLIC_API_BASE),
      "http://127.0.0.1:8000",
      "http://localhost:8000",
    ].filter(Boolean)
  )
);

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

export async function fetchAskAnswer(
  payload: Record<string, unknown>,
  query: string,
  symbol: string,
  sources: BaseSource[] = []
) {
  let lastDetail = "AI service is unavailable.";

  for (const base of BACKEND_BASES) {
    try {
      const res = await fetch(`${base}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastDetail = data?.detail || `AI request failed (${res.status}).`;
        continue;
      }

      const answer = String(data?.answer ?? "").trim();
      if (!answer) {
        lastDetail = "AI response was empty.";
        continue;
      }

      return {
        answer,
        mode: (data?.mode === "deterministic" ? "deterministic" : "live") as
          | "live"
          | "deterministic",
        detail: String(data?.detail ?? ""),
      };
    } catch (error) {
      lastDetail = error instanceof Error ? error.message : "AI service is unavailable.";
    }
  }

  return {
    answer: deterministicFallbackAnswer(query, symbol, lastDetail, sources),
    mode: "deterministic" as const,
    detail: lastDetail,
  };
}
