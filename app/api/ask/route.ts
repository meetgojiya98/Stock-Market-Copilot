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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let lastDetail = "AI service is unavailable.";

  for (const base of BACKEND_BASES) {
    try {
      const res = await fetch(`${base}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  return NextResponse.json(
    {
      answer: "",
      detail: lastDetail,
    },
    { status: 503 }
  );
}
