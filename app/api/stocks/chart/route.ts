import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || "30");
  const limit = Number.isFinite(limitRaw) ? Math.min(600, Math.max(5, Math.floor(limitRaw))) : 30;

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      data: [],
      detail: "ALPHA_VANTAGE_API_KEY is not configured.",
    });
  }

  const outputSize = limit > 100 ? "full" : "compact";
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${apiKey}&outputsize=${outputSize}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({
        data: [],
        detail: `Alpha Vantage request failed (${response.status}).`,
      });
    }

    const payload = await response.json();
    const series = payload?.["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;

    if (!series) {
      return NextResponse.json({
        data: [],
        detail:
          payload?.Information ||
          payload?.Note ||
          "No daily time-series payload was returned.",
      });
    }

    const chartData = Object.entries(series)
      .map(([date, value]) => ({
        date,
        price: Number(value?.["4. close"]),
      }))
      .filter((row) => Number.isFinite(row.price) && row.price > 0)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      .slice(-limit);

    return NextResponse.json({ data: chartData });
  } catch {
    return NextResponse.json({
      data: [],
      detail: "Unable to fetch chart data from Alpha Vantage.",
    });
  }
}
