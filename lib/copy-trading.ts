import type { AgentId } from "./agents/types";

export type Trader = {
  id: string;
  username: string;
  description: string;
  strategy: string;
  agentIds: AgentId[];
  symbols: string[];
  performance: {
    winRate: number;
    totalReturn: number;
    sharpe: number;
    trades: number;
  };
  followers: number;
  isFollowing: boolean;
};

const STORAGE_KEY = "zentrade_copy_trading_v1";

const STRATEGIES = [
  "Momentum",
  "Value",
  "Swing Trading",
  "Day Trading",
  "Options Flow",
  "Sector Rotation",
  "Dividend Growth",
  "Contrarian",
];

const TRADERS_DATA: Omit<Trader, "isFollowing">[] = [
  {
    id: "trader_1",
    username: "MomentumMike",
    description: "High-frequency momentum trader specializing in tech breakouts. 5+ years of consistent returns using custom scanner algorithms.",
    strategy: "Momentum",
    agentIds: ["market-scanner", "trade-executor"],
    symbols: ["NVDA", "AMD", "TSLA", "META"],
    performance: { winRate: 68.5, totalReturn: 142.3, sharpe: 2.1, trades: 847 },
    followers: 1243,
  },
  {
    id: "trader_2",
    username: "ValueVault",
    description: "Deep value investor focused on undervalued large-caps with strong fundamentals and margin of safety.",
    strategy: "Value",
    agentIds: ["research-analyst", "portfolio-guardian"],
    symbols: ["AAPL", "MSFT", "GOOGL", "AMZN"],
    performance: { winRate: 72.1, totalReturn: 89.7, sharpe: 1.8, trades: 156 },
    followers: 987,
  },
  {
    id: "trader_3",
    username: "SwingSetSara",
    description: "Multi-day swing trader using technical patterns and volume analysis. Focus on risk-adjusted returns.",
    strategy: "Swing Trading",
    agentIds: ["market-scanner", "risk-monitor"],
    symbols: ["AAPL", "TSLA", "NFLX", "CRM"],
    performance: { winRate: 61.8, totalReturn: 118.4, sharpe: 1.65, trades: 423 },
    followers: 756,
  },
  {
    id: "trader_4",
    username: "DayTraderDan",
    description: "Intraday scalper and momentum trader. Using level 2 data and order flow analysis for quick entries.",
    strategy: "Day Trading",
    agentIds: ["market-scanner", "trade-executor", "news-sentinel"],
    symbols: ["TSLA", "NVDA", "AMD"],
    performance: { winRate: 58.2, totalReturn: 203.6, sharpe: 1.45, trades: 2341 },
    followers: 2105,
  },
  {
    id: "trader_5",
    username: "OptionsOracle",
    description: "Options strategist tracking unusual activity and smart money flow. Specializes in earnings plays and spreads.",
    strategy: "Options Flow",
    agentIds: ["news-sentinel", "risk-monitor", "trade-executor"],
    symbols: ["AAPL", "MSFT", "GOOGL", "META", "AMZN"],
    performance: { winRate: 64.7, totalReturn: 167.2, sharpe: 1.92, trades: 534 },
    followers: 1567,
  },
  {
    id: "trader_6",
    username: "SectorShifter",
    description: "Macro-driven sector rotation strategy. Rotating between defensive and offensive sectors based on economic cycle.",
    strategy: "Sector Rotation",
    agentIds: ["research-analyst", "portfolio-guardian", "risk-monitor"],
    symbols: ["MSFT", "GOOGL", "CRM", "NFLX"],
    performance: { winRate: 66.3, totalReturn: 95.8, sharpe: 2.35, trades: 198 },
    followers: 643,
  },
  {
    id: "trader_7",
    username: "DividendDuke",
    description: "Income-focused investor building a dividend growth portfolio. Targeting companies with 10+ years of dividend increases.",
    strategy: "Dividend Growth",
    agentIds: ["research-analyst", "portfolio-guardian"],
    symbols: ["AAPL", "MSFT", "CRM"],
    performance: { winRate: 74.5, totalReturn: 52.1, sharpe: 1.55, trades: 87 },
    followers: 412,
  },
  {
    id: "trader_8",
    username: "ContrarianCarl",
    description: "Going against the crowd when sentiment reaches extremes. Buying fear, selling greed with strict risk management.",
    strategy: "Contrarian",
    agentIds: ["news-sentinel", "risk-monitor", "market-scanner"],
    symbols: ["TSLA", "META", "NFLX", "AMD", "NVDA"],
    performance: { winRate: 57.8, totalReturn: 134.9, sharpe: 1.78, trades: 312 },
    followers: 891,
  },
];

export function generateMockTraders(): Trader[] {
  const following = getFollowing();
  return TRADERS_DATA.map((t) => ({
    ...t,
    isFollowing: following.includes(t.id),
  }));
}

export function getFollowing(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function followTrader(id: string): void {
  if (typeof window === "undefined") return;
  const following = getFollowing();
  if (!following.includes(id)) {
    following.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(following));
  }
}

export function unfollowTrader(id: string): void {
  if (typeof window === "undefined") return;
  const following = getFollowing().filter((f) => f !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(following));
}
