import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      price: null,
      change: null,
      detail: "ALPHA_VANTAGE_API_KEY is not configured.",
    });
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({
        price: null,
        change: null,
        detail: `Alpha Vantage request failed (${response.status}).`,
      });
    }

    const data = await response.json();
    const quote = data?.["Global Quote"];
    const price = Number(quote?.["05. price"]);
    const prevClose = Number(quote?.["08. previous close"]);
    const rawChange = Number(quote?.["10. change percent"]?.toString().replace("%", ""));
    const change = Number.isFinite(rawChange)
      ? rawChange
      : Number.isFinite(prevClose) && prevClose > 0 && Number.isFinite(price)
      ? ((price - prevClose) / prevClose) * 100
      : null;

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({
        price: null,
        change,
        detail:
          data?.Information || data?.Note || "No usable quote payload was returned for this symbol.",
      });
    }

    return NextResponse.json({
      price,
      change,
      asOf: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      price: null,
      change: null,
      detail: "Unable to fetch quote data from Alpha Vantage.",
    });
  }
}
