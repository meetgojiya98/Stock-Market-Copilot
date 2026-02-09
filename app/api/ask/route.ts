import { NextRequest, NextResponse } from "next/server";

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

function normalizeSymbol(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function normalizeQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function deterministicFallbackAnswer(query: string, symbol: string, detail: string) {
  const activeSymbol = symbol || "the selected symbol";
  const focus = query || `Build a risk-first trade plan for ${activeSymbol}.`;

  return [
    `Live AI endpoint is currently unavailable (${detail}). Deterministic mode is active.`,
    `Focus: ${focus}`,
    `Plan:`,
    `1. Confirm trend and liquidity for ${activeSymbol} before entry.`,
    `2. Use staged entry sizing with max risk <= 1% portfolio equity.`,
    `3. Define invalidation first, then set stop and target levels.`,
    `4. Track catalyst timing and avoid holding through unknown event risk.`,
    `5. Reassess if volume drops or price closes beyond invalidation level.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = normalizeQuery(body?.query) || normalizeQuery(body?.question);
  const symbol = normalizeSymbol(body?.symbol);
  const payload = {
    ...body,
    query,
    ...(symbol ? { symbol } : {}),
  };

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

      return NextResponse.json({
        ...data,
        answer,
      });
    } catch (error) {
      lastDetail = error instanceof Error ? error.message : "AI service is unavailable.";
    }
  }

  return NextResponse.json({
    answer: deterministicFallbackAnswer(query, symbol, lastDetail),
    detail: lastDetail,
    mode: "deterministic",
  });
}
