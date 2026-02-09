import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      news: [],
      detail: "FINNHUB_API_KEY is not configured.",
    });
  }

  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 21);
  const fmt = (value: Date) => value.toISOString().slice(0, 10);

  const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({
        news: [],
        detail: `Finnhub request failed (${response.status}).`,
      });
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return NextResponse.json({
        news: [],
        detail: payload?.error || "No news payload was returned.",
      });
    }

    return NextResponse.json({
      news: payload.slice(0, 30),
      from: fmt(from),
      to: fmt(to),
    });
  } catch {
    return NextResponse.json({
      news: [],
      detail: "Unable to fetch company news from Finnhub.",
    });
  }
}
