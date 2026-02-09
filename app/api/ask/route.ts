import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (!API_BASE) {
    return NextResponse.json(
      {
        answer: "",
        detail: "Backend API is not configured.",
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${API_BASE}/rag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          answer: "",
          detail: data?.detail || `RAG request failed (${res.status}).`,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        answer: "",
        detail: "RAG service is unavailable.",
      },
      { status: 502 }
    );
  }
}
