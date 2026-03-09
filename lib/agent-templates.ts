import { saveCustomAgent, getCustomAgents } from "./agents/custom-agents";
import type { CustomAgentConfig } from "./agents/custom-agents";

export type AgentTemplate = {
  id: string;
  name: string;
  description: string;
  category: "trading" | "research" | "risk" | "news" | "custom";
  systemPrompt: string;
  tools: { id: string; endpoint: string }[];
  author: string;
  downloads: number;
  rating: number;
  createdAt: string;
};

const STORAGE_KEY = "zentrade_agent_templates_v1";

const BUILT_IN_TEMPLATES: AgentTemplate[] = [
  {
    id: "tpl-momentum-trader",
    name: "Momentum Trader",
    description: "Scans for stocks with strong upward momentum using price action, volume surges, and relative strength indicators to identify breakout candidates.",
    category: "trading",
    systemPrompt: `You are Momentum Trader, an autonomous momentum-based trading agent. You specialize in identifying stocks showing strong upward price momentum with accelerating volume. Scan each symbol for rising 20-day moving averages, increasing relative strength versus the S&P 500, and volume surges above 1.5x the 20-day average. Flag breakouts from consolidation ranges and highlight stocks making new 52-week highs with conviction. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "chart", endpoint: "/api/stocks/chart" },
    ],
    author: "Zentrade",
    downloads: 12480,
    rating: 4.7,
    createdAt: "2025-08-15T00:00:00.000Z",
  },
  {
    id: "tpl-value-investor",
    name: "Value Investor",
    description: "Finds undervalued stocks based on fundamental metrics like P/E ratio, price-to-book, free cash flow yield, and earnings growth relative to valuation.",
    category: "research",
    systemPrompt: `You are Value Investor, an autonomous fundamental value analysis agent. You evaluate stocks for deep value opportunities by examining P/E ratios below sector medians, price-to-book discounts, strong free cash flow yields, and improving earnings trajectories. Identify companies trading below intrinsic value with catalysts for re-rating. Compare each stock against sector peers and flag margin-of-safety opportunities where downside is limited. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "news", endpoint: "/api/stocks/news" },
    ],
    author: "Zentrade",
    downloads: 9340,
    rating: 4.5,
    createdAt: "2025-09-01T00:00:00.000Z",
  },
  {
    id: "tpl-swing-trader",
    name: "Swing Trader",
    description: "Identifies swing trading opportunities on 1-5 day timeframes using support/resistance bounces, mean reversion setups, and short-term momentum shifts.",
    category: "trading",
    systemPrompt: `You are Swing Trader, an autonomous swing trading agent focused on 1-5 day holding periods. Identify stocks bouncing off key support levels, pulling back to rising moving averages, or showing bullish reversal candlestick patterns. Calculate risk-reward ratios with precise stop-loss and take-profit levels for each setup. Prioritize setups with at least 2:1 reward-to-risk and confirmed volume support. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "chart", endpoint: "/api/stocks/chart" },
    ],
    author: "Zentrade",
    downloads: 10720,
    rating: 4.6,
    createdAt: "2025-08-20T00:00:00.000Z",
  },
  {
    id: "tpl-dividend-hunter",
    name: "Dividend Hunter",
    description: "Finds high-yield dividend stocks with sustainable payout ratios, growing dividends, and solid balance sheets for income-focused portfolios.",
    category: "research",
    systemPrompt: `You are Dividend Hunter, an autonomous dividend analysis agent. You screen for stocks with above-average dividend yields, payout ratios below 70%, consistent dividend growth streaks of 5+ years, and strong free cash flow coverage. Evaluate balance sheet health to assess dividend sustainability and flag ex-dividend dates. Rank opportunities by total return potential combining yield and capital appreciation prospects. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "news", endpoint: "/api/stocks/news" },
    ],
    author: "Zentrade",
    downloads: 7890,
    rating: 4.4,
    createdAt: "2025-09-10T00:00:00.000Z",
  },
  {
    id: "tpl-earnings-whisperer",
    name: "Earnings Whisperer",
    description: "Analyzes pre-earnings setups and post-earnings drift patterns, tracking whisper numbers, implied moves, and historical earnings reactions.",
    category: "news",
    systemPrompt: `You are Earnings Whisperer, an autonomous earnings analysis agent. You analyze stocks approaching earnings reports by examining historical earnings surprise patterns, implied volatility premiums, analyst estimate revisions, and pre-earnings price action. For post-earnings, evaluate the gap direction versus expectations and assess whether the move is likely to continue or fade. Provide specific entry strategies for earnings plays with defined risk. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "news", endpoint: "/api/stocks/news" },
      { id: "chart", endpoint: "/api/stocks/chart" },
    ],
    author: "Zentrade",
    downloads: 8560,
    rating: 4.3,
    createdAt: "2025-09-05T00:00:00.000Z",
  },
  {
    id: "tpl-sector-rotator",
    name: "Sector Rotator",
    description: "Tracks money flow between market sectors, identifying which sectors are gaining institutional interest and which are seeing outflows.",
    category: "research",
    systemPrompt: `You are Sector Rotator, an autonomous sector analysis agent. You track relative performance across the 11 GICS sectors to identify rotation trends. Analyze sector ETF performance, volume flows, and relative strength rankings over 1-week, 1-month, and 3-month windows. Identify sectors transitioning from laggards to leaders and flag early rotation signals. Recommend sector overweight and underweight positions based on momentum and economic cycle positioning. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "chart", endpoint: "/api/stocks/chart" },
    ],
    author: "Zentrade",
    downloads: 6210,
    rating: 4.2,
    createdAt: "2025-10-01T00:00:00.000Z",
  },
  {
    id: "tpl-volatility-scout",
    name: "Volatility Scout",
    description: "Finds unusually volatile stocks for options plays by tracking implied volatility rank, historical volatility spikes, and volatility crush setups.",
    category: "risk",
    systemPrompt: `You are Volatility Scout, an autonomous volatility analysis agent. You scan for stocks exhibiting unusual volatility characteristics ideal for options strategies. Identify stocks with elevated implied volatility rank above 80th percentile, sudden historical volatility expansions, and pre-event volatility buildups. Suggest appropriate options strategies like straddles for high IV or iron condors for volatility crush plays. Quantify expected move ranges and premium levels. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "chart", endpoint: "/api/stocks/chart" },
    ],
    author: "Zentrade",
    downloads: 5430,
    rating: 4.1,
    createdAt: "2025-10-10T00:00:00.000Z",
  },
  {
    id: "tpl-contrarian-signal",
    name: "Contrarian Signal",
    description: "Looks for oversold or overbought reversal opportunities using RSI extremes, sentiment divergences, and exhaustion patterns for mean reversion trades.",
    category: "trading",
    systemPrompt: `You are Contrarian Signal, an autonomous contrarian analysis agent. You identify stocks at sentiment and technical extremes ripe for reversal. Scan for RSI readings below 30 (oversold) or above 70 (overbought), bearish or bullish sentiment divergences, volume exhaustion patterns, and price extensions beyond Bollinger Band boundaries. Combine technical oversold/overbought readings with sentiment data to find high-probability mean reversion setups. Provide precise entry triggers and invalidation levels. Return your analysis as JSON with summary, signals, and details fields.`,
    tools: [
      { id: "price", endpoint: "/api/stocks/price" },
      { id: "chart", endpoint: "/api/stocks/chart" },
      { id: "news", endpoint: "/api/stocks/news" },
    ],
    author: "Zentrade",
    downloads: 7150,
    rating: 4.4,
    createdAt: "2025-09-20T00:00:00.000Z",
  },
];

export function getBuiltInTemplates(): AgentTemplate[] {
  return BUILT_IN_TEMPLATES;
}

export function saveCustomTemplate(template: AgentTemplate): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCustomTemplates();
    const idx = existing.findIndex((t) => t.id === template.id);
    if (idx >= 0) existing[idx] = template;
    else existing.unshift(template);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function loadCustomTemplates(): AgentTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function deleteCustomTemplate(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCustomTemplates().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function installTemplate(template: AgentTemplate): void {
  const toolMap: Record<string, { id: string; name: string; endpoint: string; description: string }> = {
    price: { id: "price", name: "Live Price", endpoint: "/api/stocks/price", description: "Fetch current price and change" },
    chart: { id: "chart", name: "Price History", endpoint: "/api/stocks/chart", description: "Fetch OHLC chart data" },
    news: { id: "news", name: "News Feed", endpoint: "/api/stocks/news", description: "Recent news articles" },
  };

  const agent: CustomAgentConfig = {
    id: `custom-tpl-${template.id}-${Date.now()}` as never,
    name: template.name,
    description: template.description,
    icon: "Bot",
    color: template.category === "trading"
      ? "var(--accent-2)"
      : template.category === "research"
        ? "var(--accent-3)"
        : template.category === "risk"
          ? "var(--negative)"
          : template.category === "news"
            ? "var(--warning)"
            : "#6366f1",
    systemPrompt: template.systemPrompt,
    tools: template.tools.map((t) => toolMap[t.id] || { id: t.id, name: t.id, endpoint: t.endpoint, description: "" }),
    defaultInterval: 0,
    isCustom: true,
  };

  saveCustomAgent(agent);
}
