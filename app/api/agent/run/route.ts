import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514").trim();

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

function generateDemoResponse(agentId: string, symbols: string[]) {
  const sym = symbols[0] || "AAPL";
  const responses: Record<string, string> = {
    "market-scanner": JSON.stringify({
      summary: `${sym} showing bullish consolidation near key resistance with rising volume.`,
      signals: symbols.map((s) => ({
        type: Math.random() > 0.5 ? "bullish" : "neutral",
        symbol: s,
        message: `${s} consolidating near resistance. Watch for breakout above recent highs with volume confirmation.`,
        confidence: Math.floor(60 + Math.random() * 30),
      })),
      details: `## Market Scanner Report\n\n### ${sym}\n- **Trend:** Bullish consolidation pattern\n- **Support:** Near 20-day moving average\n- **Resistance:** Recent swing high\n- **Volume:** Trending above 20-day average\n- **Pattern:** Bull flag forming on daily chart\n\n### Action Items\n1. Watch for breakout above resistance with volume > 1.5x average\n2. Set alerts at key levels\n3. Monitor for any bearish divergences in RSI`,
    }),
    "portfolio-guardian": JSON.stringify({
      summary: "Portfolio health check: moderate concentration risk detected.",
      signals: [
        { type: "alert", symbol: sym, message: `${sym} represents >25% of portfolio. Consider rebalancing.`, confidence: 75 },
        { type: "neutral", symbol: "PORTFOLIO", message: "Overall sector exposure is reasonably diversified.", confidence: 65 },
      ],
      details: `## Portfolio Guardian Report\n\n### Risk Assessment\n- **Concentration Risk:** ${sym} at 28% — exceeds 25% threshold\n- **Sector Exposure:** Tech-heavy (45%), consider diversifying\n- **Correlation:** High correlation between top 3 holdings\n\n### Recommendations\n1. Reduce ${sym} position by 5-8%\n2. Add defensive sectors (utilities, healthcare)\n3. Consider a stop-loss at -8% from current levels`,
    }),
    "research-analyst": JSON.stringify({
      summary: `${sym} — Strong fundamentals with near-term catalyst potential.`,
      signals: [
        { type: "bullish", symbol: sym, message: `${sym} shows strong revenue growth momentum with improving margins.`, confidence: 72 },
      ],
      details: `## Research Report: ${sym}\n\n### Fundamental Analysis\n- **Revenue Growth:** Accelerating YoY\n- **Margins:** Expanding, above industry average\n- **Valuation:** Trading at reasonable forward P/E relative to growth\n\n### Technical Analysis\n- **Trend:** Uptrend intact on weekly timeframe\n- **Key Level:** Support at 50-day MA\n\n### Bull Case\n- Strong product cycle driving revenue\n- Margin expansion from operational efficiency\n\n### Bear Case\n- Valuation premium could compress in risk-off environment\n- Competition increasing in core markets\n\n### Risk-Reward\n- Entry: Current levels\n- Target: +15% upside\n- Stop: -7% downside\n- R/R Ratio: 2.1:1`,
    }),
    "risk-monitor": JSON.stringify({
      summary: "Moderate risk environment — volatility slightly elevated.",
      signals: [
        { type: "alert", symbol: sym, message: `${sym} implied volatility rising — hedge exposure if >5% of portfolio.`, confidence: 68 },
      ],
      details: `## Risk Monitor Report\n\n### Volatility\n- **VIX Regime:** Normal (15-20 range)\n- **${sym} IV:** Slightly elevated vs 30-day average\n\n### Correlation\n- Top holdings show 0.7+ correlation — diversification benefit limited\n\n### Max Drawdown Scenario\n- Estimated -12% portfolio drawdown in 2-sigma event\n\n### Recommendations\n1. Consider protective puts on concentrated positions\n2. Maintain cash buffer of 10-15%\n3. Rebalance if correlation exceeds 0.8`,
    }),
    "news-sentinel": JSON.stringify({
      summary: `${sym} news sentiment is cautiously optimistic with upcoming catalysts.`,
      signals: [
        { type: "bullish", symbol: sym, message: `Positive analyst coverage and upcoming product launch for ${sym}.`, confidence: 65 },
      ],
      details: `## News Sentinel Report: ${sym}\n\n### Headlines\n1. Analyst upgrades target price citing strong demand\n2. Management reaffirms full-year guidance\n3. New product launch scheduled next quarter\n\n### Sentiment Score: 7/10 (Bullish)\n\n### Key Catalysts\n- Earnings report in 3 weeks\n- Product launch next quarter\n- Potential index rebalancing`,
    }),
    "trade-executor": JSON.stringify({
      summary: `${sym} — Limit buy setup with 2.1:1 risk-reward ratio.`,
      signals: [
        { type: "action", symbol: sym, message: `Limit buy ${sym} at support with stop below recent low.`, confidence: 70 },
      ],
      details: `## Trade Execution Plan: ${sym}\n\n### Entry\n- **Type:** Limit order at support level\n- **Timing:** Wait for pullback to key support\n\n### Risk Management\n- **Stop-Loss:** Below recent swing low (-3.5%)\n- **Take-Profit 1:** +5% (partial exit 50%)\n- **Take-Profit 2:** +8% (close remaining)\n\n### Position Sizing\n- Risk per trade: 1% of portfolio\n- Position size: Based on stop distance\n\n### Order Flow\n1. Place limit buy at support\n2. Immediately set stop-loss\n3. Scale out at TP1 and TP2\n\n### Risk-Reward: 2.1:1`,
    }),
  };

  return responses[agentId] || responses["market-scanner"];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, symbols, toolData, context, systemPrompt } = body;

    if (!agentId || !symbols?.length) {
      return NextResponse.json({ error: "Missing agentId or symbols" }, { status: 400 });
    }

    const anthropic = getClient();
    if (!anthropic) {
      // Demo mode — return realistic mock data
      const text = generateDemoResponse(agentId, symbols);
      return NextResponse.json({ text });
    }

    const userContent = [
      `Symbols: ${symbols.join(", ")}`,
      toolData ? `\n### Live Market Data (Real-Time)\n${toolData}` : "",
      context ? `\n### Additional Context\n${context}` : "",
      `\nIMPORTANT: You MUST respond with a single JSON object containing "summary", "signals", and "details" fields. No text outside the JSON. Reference the live market data above with specific prices, percentages, and data points.`,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: (systemPrompt || "You are a helpful trading assistant.") + "\n\nAlways respond with valid JSON only. No markdown fences, no extra text. Always reference live market data when available — cite specific prices, changes, volumes, and technical levels from the data provided.",
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    return NextResponse.json({ text: textBlock?.text ?? "" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Agent run failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
