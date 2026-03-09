import type { AgentSignal, AgentId, SignalType } from "./agents/types";

export type FeedSignal = AgentSignal & {
  username: string;
  agentName: string;
  likes: number;
  id: string;
};

const STORAGE_KEY = "zentrade_signal_feed_v1";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "AMD", "NFLX", "CRM"];

const AGENT_MAP: Record<AgentId, string> = {
  "market-scanner": "Market Scanner",
  "portfolio-guardian": "Portfolio Guardian",
  "research-analyst": "Research Analyst",
  "risk-monitor": "Risk Monitor",
  "news-sentinel": "News Sentinel",
  "trade-executor": "Trade Executor",
};

const AGENT_IDS: AgentId[] = Object.keys(AGENT_MAP) as AgentId[];

const USERNAMES = [
  "AlphaHunter", "QuantQueen", "BullishBen", "TrendSurfer",
  "VolumeViper", "DeltaDave", "GammaGuru", "ThetaTrader",
  "SwingKing", "MomentumMax", "ValueVicky", "RiskRanger",
  "ChartChaser", "PivotPro", "BreakoutBoss",
];

const MESSAGES: Record<SignalType, string[]> = {
  bullish: [
    "Strong momentum detected above 20-day MA with rising volume.",
    "Golden cross forming on daily chart. Expecting upside continuation.",
    "Positive earnings revision cycle underway. Accumulation zone identified.",
    "Breakout above key resistance with institutional buying pressure.",
    "RSI divergence suggests bullish reversal from oversold conditions.",
  ],
  bearish: [
    "Death cross forming on daily. Distribution pattern emerging.",
    "Breaking below key support with increasing sell volume.",
    "Negative earnings revision cycle. Smart money exiting positions.",
    "Head and shoulders pattern confirmed. Targeting lower support.",
    "Deteriorating breadth with sector weakness spreading.",
  ],
  neutral: [
    "Consolidating in a tight range. Waiting for directional catalyst.",
    "Mixed signals across timeframes. Staying on the sidelines.",
    "Volume drying up near resistance. No clear edge here.",
    "Balanced order flow. Watching for a breakout or breakdown.",
    "Choppy price action. Risk-reward not favorable for new entries.",
  ],
  alert: [
    "Unusual options activity detected. Large call sweep above ask.",
    "Insider purchase filed. CEO bought significant shares.",
    "Earnings report in 2 days. Implied volatility spiking.",
  ],
  action: [
    "Executing limit buy order at identified support level.",
    "Taking partial profits on the position. Locking in gains.",
    "Tightening stop-loss to breakeven after strong move.",
  ],
};

function pickSignalType(index: number): SignalType {
  // 30% bullish, 25% bearish, 25% neutral, 10% alert, 10% action
  const r = (index * 7 + 3) % 100;
  if (r < 30) return "bullish";
  if (r < 55) return "bearish";
  if (r < 80) return "neutral";
  if (r < 90) return "alert";
  return "action";
}

export function generateMockFeed(): FeedSignal[] {
  const signals: FeedSignal[] = [];
  for (let i = 0; i < 30; i++) {
    const signalType = pickSignalType(i);
    const msgs = MESSAGES[signalType];
    const agentId = AGENT_IDS[i % AGENT_IDS.length];
    signals.push({
      id: `feed_${i}_${Date.now()}`,
      type: signalType,
      symbol: SYMBOLS[i % SYMBOLS.length],
      message: msgs[i % msgs.length],
      confidence: 40 + Math.floor(((i * 13 + 7) % 55)),
      timestamp: new Date(Date.now() - i * 45 * 60 * 1000).toISOString(),
      agentId,
      username: USERNAMES[i % USERNAMES.length],
      agentName: AGENT_MAP[agentId],
      likes: Math.floor(((i * 17 + 5) % 80)),
    });
  }
  return signals;
}

export function getLocalSignals(): FeedSignal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLocalSignal(signal: FeedSignal): void {
  if (typeof window === "undefined") return;
  const signals = getLocalSignals();
  signals.unshift(signal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
}
