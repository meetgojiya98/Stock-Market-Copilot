import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514").trim();

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

function generateDemoStream(agentId: string, symbols: string[]) {
  const sym = symbols[0] || "AAPL";
  const demos: Record<string, string> = {
    "market-scanner": `## Market Scanner Report

### ${symbols.map((s) => s).join(", ")}

**Trend Analysis:**
${symbols.map((s) => `- **${s}:** ${Math.random() > 0.5 ? "Bullish" : "Neutral"} — ${Math.random() > 0.5 ? "Consolidating near resistance with rising volume" : "Trading within range, awaiting catalyst"}`).join("\n")}

**Key Levels:**
${symbols.map((s) => `- **${s}:** Support at recent swing low, resistance at 52-week high`).join("\n")}

**Volume Analysis:**
${symbols.map((s) => `- **${s}:** Volume ${Math.random() > 0.5 ? "above" : "near"} 20-day average`).join("\n")}

**Signals:**
${symbols.map((s) => `- ${Math.random() > 0.5 ? "BULLISH" : "NEUTRAL"} ${s} — Confidence: ${Math.floor(55 + Math.random() * 35)}%`).join("\n")}

*Demo mode — add ANTHROPIC_API_KEY for live analysis.*`,

    "portfolio-guardian": `## Portfolio Guardian Report

### Risk Assessment
- **Concentration Risk:** ${sym} may represent a significant portion of your portfolio
- **Sector Balance:** Review sector weights for diversification
- **Correlation:** Monitor inter-holding correlation during market stress

### Recommendations
1. Maintain position sizes below 25% per holding
2. Diversify across at least 3-4 sectors
3. Keep 10-15% cash buffer for opportunities
4. Set stop-losses on all active positions

*Demo mode — add ANTHROPIC_API_KEY for live analysis.*`,

    "research-analyst": `## Research Report: ${sym}

### Fundamental Overview
- Strong revenue growth trajectory
- Margins trending positively
- Reasonable valuation relative to peers

### Technical Setup
- Uptrend intact on weekly timeframe
- Support at key moving averages
- No major bearish divergences

### Bull Case
- Product innovation driving growth
- Expanding addressable market

### Bear Case
- Valuation premium at risk in downturn
- Competitive pressures increasing

### Risk-Reward: Favorable at current levels

*Demo mode — add ANTHROPIC_API_KEY for live analysis.*`,

    "risk-monitor": `## Risk Monitor Report

### Current Risk Environment
- Market volatility: Moderate
- Implied volatility for ${sym}: Within normal range

### Portfolio Risk Metrics
- Estimated max drawdown: -10% to -15% in stress scenario
- Correlation between holdings: Monitor for clustering

### Recommendations
1. Review position sizes in volatile names
2. Consider hedging concentrated positions
3. Maintain stop-loss discipline

*Demo mode — add ANTHROPIC_API_KEY for live analysis.*`,

    "news-sentinel": `## News Sentinel Report: ${sym}

### Recent Headlines
1. Market activity continues around key earnings releases
2. Sector rotation trends emerging
3. Macro factors influencing sentiment

### Sentiment Score: 6/10 (Slightly Bullish)

### Upcoming Catalysts
- Next earnings report
- Industry conferences
- Regulatory developments

*Demo mode — add ANTHROPIC_API_KEY for live analysis.*`,

    "trade-executor": `## Trade Execution Plan: ${sym}

### Entry Strategy
- **Type:** Limit order at nearest support
- **Timing:** Wait for pullback or breakout confirmation

### Risk Management
- **Stop-Loss:** 3-5% below entry
- **Take-Profit 1:** +5% (scale out 50%)
- **Take-Profit 2:** +10% (close remaining)
- **Risk-Reward Ratio:** 2:1 minimum

### Position Sizing
- Risk 1% of portfolio per trade
- Size based on stop distance

*Demo mode — add ANTHROPIC_API_KEY for live analysis.*`,
  };

  return demos[agentId] || demos["market-scanner"];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, symbols, toolData, context, systemPrompt } = body;

    if (!agentId || !symbols?.length) {
      return new Response(
        `data: ${JSON.stringify({ type: "error", text: "Missing agentId or symbols" })}\n\n`,
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const anthropic = getClient();

    // Demo mode — simulate streaming with realistic content
    if (!anthropic) {
      const demoText = generateDemoStream(agentId, symbols);
      const encoder = new TextEncoder();
      const words = demoText.split(" ");

      const readable = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < words.length; i++) {
            const word = (i === 0 ? "" : " ") + words[i];
            const payload = JSON.stringify({ type: "chunk", text: word });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            // Simulate typing delay
            await new Promise((r) => setTimeout(r, 15 + Math.random() * 25));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const userContent = [
      `Symbols: ${symbols.join(", ")}`,
      toolData ? `\n### Live Market Data (Real-Time)\n${toolData}` : "",
      context ? `\n### Additional Context\n${context}` : "",
      `\nIMPORTANT: Reference the live market data above with specific prices, percentages, and data points in your analysis. Always cite actual numbers from the data provided.`,
    ]
      .filter(Boolean)
      .join("\n");

    const stream = anthropic.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: (systemPrompt || "You are a helpful trading assistant.") + "\n\nAlways reference live market data when available. Cite specific prices, changes, volumes, and technical levels from the data provided. Your analysis should be grounded in the real-time data, not general knowledge.",
      messages: [{ role: "user", content: userContent }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const payload = JSON.stringify({ type: "chunk", text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Stream failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", text: msg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Agent stream failed";
    return new Response(
      `data: ${JSON.stringify({ type: "error", text: msg })}\n\n`,
      { status: 500, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
