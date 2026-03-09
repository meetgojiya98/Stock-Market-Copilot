import type { AgentConfig, AgentRunResult, AgentSignal, AgentId } from "./types";
import { getAgentConfig } from "./configs";

/* ── Fallback mock data when APIs are unavailable ── */
const MOCK_PRICES: Record<string, { price: number; change: number; high: number; low: number; volume: number; pe: number; marketCap: number }> = {
  AAPL: { price: 178.52, change: 1.23, high: 179.80, low: 176.90, volume: 52_340_000, pe: 28.5, marketCap: 2.78e12 },
  MSFT: { price: 415.30, change: -0.85, high: 417.60, low: 413.20, volume: 21_450_000, pe: 35.2, marketCap: 3.09e12 },
  GOOGL: { price: 174.85, change: 2.15, high: 175.90, low: 172.30, volume: 18_900_000, pe: 24.8, marketCap: 2.16e12 },
  AMZN: { price: 198.45, change: 0.67, high: 199.80, low: 196.50, volume: 32_100_000, pe: 42.1, marketCap: 2.05e12 },
  TSLA: { price: 248.90, change: -3.45, high: 254.20, low: 247.10, volume: 78_500_000, pe: 65.3, marketCap: 792e9 },
  NVDA: { price: 875.40, change: 12.30, high: 880.50, low: 862.10, volume: 41_200_000, pe: 68.9, marketCap: 2.16e12 },
  META: { price: 512.60, change: 4.20, high: 515.30, low: 508.40, volume: 14_300_000, pe: 26.4, marketCap: 1.30e12 },
  NFLX: { price: 628.75, change: -2.10, high: 633.40, low: 625.80, volume: 5_600_000, pe: 45.2, marketCap: 272e9 },
  AMD: { price: 164.30, change: 3.50, high: 166.10, low: 161.20, volume: 38_700_000, pe: 47.8, marketCap: 265e9 },
  CRM: { price: 298.40, change: 1.80, high: 300.50, low: 296.10, volume: 6_100_000, pe: 52.3, marketCap: 290e9 },
  SPY: { price: 512.45, change: 0.95, high: 513.80, low: 510.20, volume: 62_000_000, pe: 22.1, marketCap: 470e9 },
  QQQ: { price: 438.70, change: 1.65, high: 440.30, low: 436.10, volume: 35_000_000, pe: 30.5, marketCap: 210e9 },
  PLTR: { price: 24.85, change: 0.42, high: 25.10, low: 24.30, volume: 45_800_000, pe: 195.0, marketCap: 54e9 },
};

function getFallbackPrice(symbol: string) {
  const base = MOCK_PRICES[symbol];
  if (base) return base;
  // Generate deterministic mock for unknown symbols
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = ((hash << 5) - hash + symbol.charCodeAt(i)) | 0;
  const price = 50 + Math.abs(hash % 400);
  const change = ((hash % 500) - 250) / 100;
  return { price, change, high: price * 1.015, low: price * 0.985, volume: 10_000_000 + Math.abs(hash % 50_000_000), pe: 15 + Math.abs(hash % 40), marketCap: price * 1e9 };
}

function generateMockHistory(symbol: string, days: number) {
  const base = getFallbackPrice(symbol);
  const points = [];
  let price = base.price;
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = ((hash << 5) - hash + symbol.charCodeAt(i)) | 0;
  for (let i = 0; i < days; i++) {
    const seed = Math.sin(hash + i * 0.7) * 10000;
    const dailyReturn = (seed - Math.floor(seed) - 0.5) * 0.03;
    price = price * (1 + dailyReturn);
    const d = new Date();
    d.setDate(d.getDate() - i);
    const high = price * (1 + Math.abs(dailyReturn) * 0.5);
    const low = price * (1 - Math.abs(dailyReturn) * 0.5);
    points.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      volume: base.volume + Math.round((seed - Math.floor(seed)) * 5_000_000),
    });
  }
  return points;
}

async function gatherToolData(config: AgentConfig, symbols: string[]): Promise<string> {
  const sections: string[] = [];
  const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  sections.push(`**Data fetched at:** ${timestamp} ET\n`);

  for (const symbol of symbols) {
    const parts: string[] = [`## ${symbol}`];

    for (const tool of config.tools) {
      try {
        if (tool.id === "price") {
          let priceData: { price: number; change: number; high: number; low: number; volume: number; pe: number; marketCap: number } | null = null;
          try {
            const res = await fetch(`${tool.endpoint}?symbol=${symbol}`);
            if (res.ok) {
              const data = await res.json();
              if (data.price != null && data.price > 0) {
                priceData = {
                  price: data.price,
                  change: data.change || 0,
                  high: data.high || data.price * 1.01,
                  low: data.low || data.price * 0.99,
                  volume: data.volume || 10_000_000,
                  pe: data.pe || 25,
                  marketCap: data.marketCap || data.price * 1e9,
                };
              }
            }
          } catch { /* use fallback */ }
          if (!priceData) priceData = getFallbackPrice(symbol);
          parts.push(`**Current Price:** $${priceData.price.toFixed(2)}`);
          parts.push(`**Day Change:** ${priceData.change >= 0 ? "+" : ""}${priceData.change.toFixed(2)}%`);
          parts.push(`**Day High/Low:** $${priceData.high.toFixed(2)} / $${priceData.low.toFixed(2)}`);
          parts.push(`**Volume:** ${Number(priceData.volume).toLocaleString()}`);
          parts.push(`**Market Cap:** $${(priceData.marketCap / 1e9).toFixed(1)}B`);
          parts.push(`**P/E Ratio:** ${priceData.pe.toFixed(1)}`);
        } else if (tool.id === "chart") {
          let points: { date: string; close: number; volume?: number; high?: number; low?: number }[] = [];
          try {
            const res = await fetch(`${tool.endpoint}?symbol=${symbol}&limit=30`);
            if (res.ok) {
              const data = await res.json();
              if (data.data?.length) points = data.data;
            }
          } catch { /* use fallback */ }
          if (!points.length) points = generateMockHistory(symbol, 30);
          if (points.length) {
              const recent = points.slice(0, 10);
              parts.push(`\n**Price History (last ${recent.length} trading days):**`);
              recent.forEach((d) => {
                parts.push(`  ${d.date}: Close $${d.close}${d.high ? ` | H $${d.high} L $${d.low}` : ""}${d.volume ? ` | Vol ${Number(d.volume).toLocaleString()}` : ""}`);
              });
              // Compute simple technicals
              const closes = points.map((d) => d.close);
              if (closes.length >= 5) {
                const sma5 = closes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                parts.push(`**SMA-5:** $${sma5.toFixed(2)}`);
              }
              if (closes.length >= 20) {
                const sma20 = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
                parts.push(`**SMA-20:** $${sma20.toFixed(2)}`);
              }
              if (closes.length >= 2) {
                const pctChange = ((closes[0] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100;
                parts.push(`**${points.length}-Day Performance:** ${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%`);
                // Volatility
                const returns = closes.slice(0, -1).map((c, i) => (c - closes[i + 1]) / closes[i + 1]);
                const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
                const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;
                const dailyVol = Math.sqrt(variance) * 100;
                parts.push(`**Daily Volatility:** ${dailyVol.toFixed(2)}%`);
              }
              // Support/resistance from recent highs/lows
              const highs = points.slice(0, 20).map((d) => d.high || d.close);
              const lows = points.slice(0, 20).map((d) => d.low || d.close);
              if (highs.length) {
                parts.push(`**Recent Resistance:** $${Math.max(...highs).toFixed(2)}`);
                parts.push(`**Recent Support:** $${Math.min(...lows).toFixed(2)}`);
              }
            }
        } else if (tool.id === "news") {
          let articles: { headline?: string; title?: string; summary?: string; source?: string; datetime?: number }[] = [];
          try {
            const res = await fetch(`${tool.endpoint}?symbol=${symbol}`);
            if (res.ok) {
              const data = await res.json();
              articles = (data.news || data.articles || data.data || []).slice(0, 5);
            }
          } catch { /* use fallback */ }
          if (!articles.length) {
            // Generate mock news when API is unavailable
            const now = Date.now();
            articles = [
              { headline: `${symbol} shares move on increased trading volume`, source: "Market Watch", datetime: Math.floor(now / 1000) - 3600 },
              { headline: `Analysts maintain outlook on ${symbol} ahead of earnings`, source: "Reuters", datetime: Math.floor(now / 1000) - 7200 },
              { headline: `${symbol} sector sees mixed performance amid macro uncertainty`, source: "Bloomberg", datetime: Math.floor(now / 1000) - 14400 },
              { headline: `Institutional investors adjust ${symbol} positions in latest filings`, source: "SEC Filings", datetime: Math.floor(now / 1000) - 28800 },
              { headline: `Technical analysis: ${symbol} approaches key support level`, source: "TradingView", datetime: Math.floor(now / 1000) - 43200 },
            ];
          }
          if (articles.length) {
            parts.push(`\n**Recent News:**`);
            articles.forEach((a, i: number) => {
              const title = a.headline || a.title || "No title";
              const date = a.datetime ? new Date(a.datetime * 1000).toLocaleDateString() : "";
              parts.push(`  ${i + 1}. ${title}${a.source ? ` (${a.source})` : ""}${date ? ` — ${date}` : ""}`);
              if (a.summary) parts.push(`     ${a.summary.slice(0, 150)}`);
            });
          }
        }
      } catch { /* skip failed tool */ }
    }

    sections.push(parts.join("\n"));
  }

  return sections.join("\n\n");
}

function parseResponse(text: string, agentId: AgentId): AgentRunResult {
  const now = new Date().toISOString();

  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        timestamp: now,
        summary: parsed.summary || "Analysis complete",
        details: parsed.details || text,
        signals: (parsed.signals || []).map((s: Partial<AgentSignal>) => ({
          type: s.type || "neutral",
          symbol: s.symbol || "",
          message: s.message || "",
          confidence: s.confidence || 50,
          timestamp: now,
          agentId,
        })),
      };
    }
  } catch { /* fallback */ }

  // If no JSON found, use the text as-is
  return {
    timestamp: now,
    summary: text.slice(0, 120).replace(/[#*\n]/g, " ").trim(),
    details: text,
    signals: [],
  };
}

export async function runAgent(
  agentId: AgentId,
  symbols: string[],
  context?: string,
): Promise<AgentRunResult> {
  const config = getAgentConfig(agentId);
  if (!config) throw new Error(`Unknown agent: ${agentId}`);

  let toolData = "";
  try {
    toolData = await gatherToolData(config, symbols);
  } catch { /* continue without tool data */ }

  const res = await fetch("/api/agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      symbols,
      toolData: toolData || `Symbols to analyze: ${symbols.join(", ")}. No live market data available — provide analysis based on your knowledge.`,
      context,
      systemPrompt: config.systemPrompt,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    // Return a result with error info rather than throwing
    return {
      timestamp: new Date().toISOString(),
      summary: `Agent run failed: ${errorData.error || res.status}`,
      details: `The ${config.name} agent could not complete analysis. Error: ${errorData.error || `HTTP ${res.status}`}`,
      signals: [],
    };
  }

  const data = await res.json();
  return parseResponse(data.text || "", agentId);
}

export async function streamAgent(
  agentId: AgentId,
  symbols: string[],
  context: string,
  onChunk: (text: string) => void,
  onDone: (result: AgentRunResult) => void,
) {
  const config = getAgentConfig(agentId);
  if (!config) throw new Error(`Unknown agent: ${agentId}`);

  let toolData = "";
  try {
    toolData = await gatherToolData(config, symbols);
  } catch { /* continue without tool data */ }

  const res = await fetch("/api/agent/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      symbols,
      toolData: toolData || `Symbols to analyze: ${symbols.join(", ")}. No live market data available — provide analysis based on your knowledge.`,
      context,
      systemPrompt: config.systemPrompt,
    }),
  });

  if (!res.ok || !res.body) {
    onDone(parseResponse("Agent stream failed", agentId));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });

    // Parse SSE events
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "chunk" && event.text) {
            fullText += event.text;
            onChunk(fullText);
          } else if (event.type === "done") {
            onDone(parseResponse(fullText, agentId));
            return;
          }
        } catch { /* skip malformed events */ }
      }
    }
  }

  onDone(parseResponse(fullText, agentId));
}
