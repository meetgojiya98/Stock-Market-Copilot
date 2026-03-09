import type { AgentId } from "./agents/types";

export type AgentProfile = {
  id: string;
  username: string;
  agentId: AgentId;
  config: {
    symbols: string[];
    interval: number;
    notes: string;
  };
  performance: {
    totalRuns: number;
    avgConfidence: number;
    topSignalType: string;
  };
  sharedAt: string;
  likes: number;
};

const STORAGE_KEY = "zentrade_agent_profiles_v1";
const LIKES_KEY = "zentrade_agent_profiles_likes_v1";

const USERNAMES = [
  "AlphaHunter", "QuantQueen", "BullishBen", "TrendSurfer",
  "VolumeViper", "DeltaDave", "GammaGuru", "ThetaTrader",
  "SwingKing", "MomentumMax", "ValueVicky", "RiskRanger",
];

const AGENT_IDS: AgentId[] = [
  "market-scanner", "portfolio-guardian", "research-analyst",
  "risk-monitor", "news-sentinel", "trade-executor",
];

const SYMBOL_SETS = [
  ["AAPL", "MSFT", "GOOGL"],
  ["TSLA", "NVDA", "AMD"],
  ["AMZN", "META", "NFLX"],
  ["CRM", "AAPL", "NVDA"],
  ["MSFT", "AMZN", "GOOGL"],
  ["TSLA", "META", "AMD"],
  ["AAPL", "TSLA", "NVDA", "AMD"],
  ["GOOGL", "MSFT", "CRM"],
  ["NFLX", "META", "AMZN"],
  ["NVDA", "AMD", "TSLA"],
  ["AAPL", "MSFT"],
  ["GOOGL", "AMZN", "META", "NFLX"],
];

const SIGNAL_TYPES = ["bullish", "bearish", "neutral", "alert", "action"];

const NOTES = [
  "Focused on tech momentum plays with tight stop losses.",
  "Scanning for breakout patterns on high-volume days.",
  "Monitoring earnings surprises and post-earnings drift.",
  "Watching sector rotation signals for rebalancing.",
  "Tracking insider buying activity for conviction plays.",
  "Risk-first approach with max 2% portfolio exposure per trade.",
  "Using RSI divergence combined with volume confirmation.",
  "Following smart money flow via options unusual activity.",
  "Mean-reversion strategy on oversold blue chips.",
  "Macro-driven positioning based on yield curve signals.",
  "Pairs trading tech names for market-neutral alpha.",
  "Scalping intraday momentum on FAANG names.",
];

export function generateMockProfiles(): AgentProfile[] {
  return USERNAMES.map((username, i) => ({
    id: `mock_${i}_${username.toLowerCase()}`,
    username,
    agentId: AGENT_IDS[i % AGENT_IDS.length],
    config: {
      symbols: SYMBOL_SETS[i],
      interval: [5, 10, 15, 30, 60][i % 5],
      notes: NOTES[i],
    },
    performance: {
      totalRuns: 50 + Math.floor(Math.random() * 200),
      avgConfidence: 55 + Math.floor(Math.random() * 35),
      topSignalType: SIGNAL_TYPES[i % SIGNAL_TYPES.length],
    },
    sharedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    likes: Math.floor(Math.random() * 120),
  }));
}

export function getMyProfiles(): AgentProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function shareProfile(profile: AgentProfile): void {
  if (typeof window === "undefined") return;
  const profiles = getMyProfiles();
  profiles.unshift(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function deleteProfile(id: string): void {
  if (typeof window === "undefined") return;
  const profiles = getMyProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function likeProfile(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    const liked: string[] = raw ? JSON.parse(raw) : [];
    if (liked.includes(id)) {
      localStorage.setItem(LIKES_KEY, JSON.stringify(liked.filter((l) => l !== id)));
      return false;
    }
    liked.push(id);
    localStorage.setItem(LIKES_KEY, JSON.stringify(liked));
    return true;
  } catch {
    return false;
  }
}

export function getLikedProfiles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
