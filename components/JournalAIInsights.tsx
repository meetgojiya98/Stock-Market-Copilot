"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Lightbulb,
  Minus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Badge = "positive" | "negative" | "neutral";

interface Insight {
  id: string;
  patternName: string;
  badge: Badge;
  description: string;
  affectedTrades: number;
  recommendation: string;
  icon: keyof typeof ICON_MAP;
}

interface JournalEntry {
  id: number;
  symbol: string;
  action: "Buy" | "Sell";
  date: string;
  sector: string;
  holdDays: number;
  pnl: number;
  emotional: boolean;
  dayOfWeek: string;
}

interface SummaryStats {
  totalTrades: number;
  winRate: number;
  avgHoldTime: string;
  mostTradedSector: string;
}

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP = {
  trendingDown: TrendingDown,
  calendar: Calendar,
  target: Target,
  barChart: BarChart3,
  clock: Clock,
  alertTriangle: AlertTriangle,
  brain: Brain,
  zap: Zap,
} as const;

/* ------------------------------------------------------------------ */
/*  Mock journal entries                                                */
/* ------------------------------------------------------------------ */

const SECTORS = ["Technology", "Healthcare", "Financials", "Energy", "Consumer", "Industrials"];
const SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM",
  "XOM", "UNH", "PG", "V", "HD", "DIS", "NFLX", "BA", "AMD", "CRM",
  "PYPL", "INTC", "COST", "ABBV", "MRK", "PFE", "WMT",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function generateMockEntries(seed: number): JournalEntry[] {
  let s = seed;
  const rand = (): number => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const count = 80 + Math.floor(rand() * 40);
  const entries: JournalEntry[] = [];

  for (let i = 0; i < count; i++) {
    const symbol = SYMBOLS[Math.floor(rand() * SYMBOLS.length)];
    const sector = SECTORS[Math.floor(rand() * SECTORS.length)];
    const holdDays = Math.floor(rand() * 45) + 1;
    const emotional = rand() < 0.2;
    const pnlBase = emotional ? (rand() * 1200 - 800) : (rand() * 2000 - 700);
    entries.push({
      id: i,
      symbol,
      action: rand() > 0.5 ? "Buy" : "Sell",
      date: new Date(Date.now() - Math.floor(rand() * 180) * 86400000).toLocaleDateString(),
      sector,
      holdDays,
      pnl: Math.round(pnlBase * 100) / 100,
      emotional,
      dayOfWeek: DAYS[Math.floor(rand() * DAYS.length)],
    });
  }

  return entries;
}

/* ------------------------------------------------------------------ */
/*  Insight templates                                                  */
/* ------------------------------------------------------------------ */

interface InsightTemplate {
  patternName: string;
  badge: Badge;
  icon: keyof typeof ICON_MAP;
  genDescription: (entries: JournalEntry[], rand: () => number) => string;
  genAffected: (entries: JournalEntry[], rand: () => number) => number;
  genRecommendation: () => string;
}

const INSIGHT_TEMPLATES: InsightTemplate[] = [
  {
    patternName: "You sell winners too early",
    badge: "negative",
    icon: "trendingDown",
    genDescription: (entries, rand) => {
      const winners = entries.filter((e) => e.pnl > 0);
      const avgHold = winners.length > 0 ? Math.round(winners.reduce((s, e) => s + e.holdDays, 0) / winners.length) : 5;
      return `Your winning trades are held for an average of ${avgHold} days, while similar trades in your sector typically benefit from a ${avgHold + Math.floor(rand() * 8) + 5}-day holding period. You are leaving an estimated ${(rand() * 15 + 8).toFixed(1)}% additional upside on the table.`;
    },
    genAffected: (entries) => entries.filter((e) => e.pnl > 0 && e.holdDays < 10).length,
    genRecommendation: () => "Consider using trailing stop-losses instead of fixed profit targets. This lets winners run while still protecting gains.",
  },
  {
    patternName: "Friday trades underperform",
    badge: "negative",
    icon: "calendar",
    genDescription: (entries, rand) => {
      const fridays = entries.filter((e) => e.dayOfWeek === "Friday");
      const friWinRate = fridays.length > 0 ? Math.round((fridays.filter((e) => e.pnl > 0).length / fridays.length) * 100) : 35;
      return `Trades initiated on Fridays have a ${friWinRate}% win rate compared to your overall average. Weekend risk and reduced liquidity appear to be factors. Friday entries show a ${(rand() * 1.5 + 0.5).toFixed(1)}x higher drawdown than midweek entries.`;
    },
    genAffected: (entries) => entries.filter((e) => e.dayOfWeek === "Friday").length,
    genRecommendation: () => "Avoid opening new positions on Friday afternoons. If you spot an opportunity, save it for Monday's opening session instead.",
  },
  {
    patternName: "Best results with tech stocks",
    badge: "positive",
    icon: "target",
    genDescription: (entries, rand) => {
      const tech = entries.filter((e) => e.sector === "Technology");
      const techWinRate = tech.length > 0 ? Math.round((tech.filter((e) => e.pnl > 0).length / tech.length) * 100) : 65;
      return `Your Technology sector trades show a ${techWinRate}% win rate with an average gain of $${(rand() * 400 + 200).toFixed(0)} per trade. This is your strongest sector by both consistency and absolute returns.`;
    },
    genAffected: (entries) => entries.filter((e) => e.sector === "Technology").length,
    genRecommendation: () => "Lean into your edge. Consider allocating a slightly larger portion of your capital to tech setups where your analysis is strongest.",
  },
  {
    patternName: "Position sizing improves over time",
    badge: "positive",
    icon: "barChart",
    genDescription: (_entries, rand) => {
      const improvement = (rand() * 20 + 10).toFixed(0);
      return `Your recent 30 trades show ${improvement}% better position sizing discipline compared to your first 30 trades. Max drawdown per trade has decreased, and your risk-per-trade variance has narrowed significantly.`;
    },
    genAffected: (_entries, rand) => Math.floor(rand() * 20) + 15,
    genRecommendation: () => "Keep tracking your position sizes. Consider formalizing your sizing rules into a written checklist before each trade.",
  },
  {
    patternName: "Holding period correlates with returns",
    badge: "neutral",
    icon: "clock",
    genDescription: (entries, rand) => {
      const longHold = entries.filter((e) => e.holdDays > 14);
      const shortHold = entries.filter((e) => e.holdDays <= 3);
      const longAvg = longHold.length > 0 ? Math.round(longHold.reduce((s, e) => s + e.pnl, 0) / longHold.length) : 350;
      const shortAvg = shortHold.length > 0 ? Math.round(shortHold.reduce((s, e) => s + e.pnl, 0) / shortHold.length) : 80;
      return `Trades held longer than 14 days average $${longAvg} in P&L, while trades held under 3 days average $${shortAvg}. The sweet spot appears to be ${Math.floor(rand() * 5) + 7}-${Math.floor(rand() * 5) + 14} days based on your historical data.`;
    },
    genAffected: (entries) => entries.length,
    genRecommendation: () => "Review your time-based exit strategy. Setting minimum hold periods for swing trades could improve your overall returns.",
  },
  {
    patternName: "Emotional trades lose 2.3x more",
    badge: "negative",
    icon: "alertTriangle",
    genDescription: (entries, rand) => {
      const emotional = entries.filter((e) => e.emotional);
      const emotionalLoss = emotional.length > 0 ? Math.abs(Math.round(emotional.filter((e) => e.pnl < 0).reduce((s, e) => s + e.pnl, 0) / Math.max(emotional.filter((e) => e.pnl < 0).length, 1))) : 450;
      return `Trades flagged as emotional show an average loss of $${emotionalLoss}, which is ${(rand() * 1.5 + 1.8).toFixed(1)}x larger than your planned trades. These entries also have a ${(rand() * 15 + 25).toFixed(0)}% lower win rate.`;
    },
    genAffected: (entries) => entries.filter((e) => e.emotional).length,
    genRecommendation: () => "Implement a 15-minute cooling period before executing any trade triggered by sudden market moves or strong emotions.",
  },
  {
    patternName: "Morning entries outperform",
    badge: "positive",
    icon: "zap",
    genDescription: (_entries, rand) => {
      const morningWin = (rand() * 15 + 55).toFixed(0);
      const afternoonWin = (rand() * 10 + 38).toFixed(0);
      return `Trades entered between 9:30-11:00 AM show a ${morningWin}% win rate versus ${afternoonWin}% for afternoon entries. The first 90 minutes of market action appear to be your optimal trading window.`;
    },
    genAffected: (_entries, rand) => Math.floor(rand() * 25) + 20,
    genRecommendation: () => "Focus your highest-conviction entries during the morning session. Use afternoons for research and planning rather than execution.",
  },
  {
    patternName: "Overtrading during volatility spikes",
    badge: "negative",
    icon: "brain",
    genDescription: (_entries, rand) => {
      const overtradeRate = (rand() * 30 + 40).toFixed(0);
      return `During high-VIX periods, your trade frequency increases by ${overtradeRate}% but your win rate drops by ${(rand() * 12 + 8).toFixed(0)} percentage points. More trades in volatile markets are not translating to more profits.`;
    },
    genAffected: (_entries, rand) => Math.floor(rand() * 18) + 8,
    genRecommendation: () => "Set a daily trade limit during high-volatility periods. Quality over quantity will protect your capital when markets are choppy.",
  },
];

/* ------------------------------------------------------------------ */
/*  Compute summary stats                                              */
/* ------------------------------------------------------------------ */

function computeSummary(entries: JournalEntry[]): SummaryStats {
  const wins = entries.filter((e) => e.pnl > 0).length;
  const avgHoldDays = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.holdDays, 0) / entries.length) : 0;

  const sectorCount: Record<string, number> = {};
  entries.forEach((e) => {
    sectorCount[e.sector] = (sectorCount[e.sector] || 0) + 1;
  });
  const topSector = Object.entries(sectorCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return {
    totalTrades: entries.length,
    winRate: entries.length > 0 ? Math.round((wins / entries.length) * 100) : 0,
    avgHoldTime: `${avgHoldDays} days`,
    mostTradedSector: topSector,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function JournalAIInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(42);

  const generate = useCallback((currentSeed: number) => {
    setIsGenerating(true);

    let s = currentSeed;
    const rand = (): number => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };

    const entries = generateMockEntries(currentSeed);
    setSummary(computeSummary(entries));

    /* Pick 6-8 templates */
    const shuffled = [...INSIGHT_TEMPLATES].sort(() => rand() - 0.5);
    const count = Math.floor(rand() * 3) + 6;
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    const newInsights: Insight[] = selected.map((tpl, i) => ({
      id: `insight-${currentSeed}-${i}`,
      patternName: tpl.patternName,
      badge: tpl.badge,
      icon: tpl.icon,
      description: tpl.genDescription(entries, rand),
      affectedTrades: tpl.genAffected(entries, rand),
      recommendation: tpl.genRecommendation(),
    }));

    setTimeout(() => {
      setInsights(newInsights);
      setIsGenerating(false);
    }, 600);
  }, []);

  useEffect(() => {
    generate(seed);
  }, [generate, seed]);

  const handleRegenerate = () => {
    const newSeed = Date.now() % 100000;
    setSeed(newSeed);
    generate(newSeed);
  };

  const badgeColor = (b: Badge) => {
    if (b === "positive") return { bg: "rgba(34,197,94,0.12)", text: "#22c55e", border: "rgba(34,197,94,0.3)" };
    if (b === "negative") return { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.3)" };
    return { bg: "rgba(250,204,21,0.12)", text: "#facc15", border: "rgba(250,204,21,0.3)" };
  };

  const badgeLabel = (b: Badge) => {
    if (b === "positive") return "Strength";
    if (b === "negative") return "Weakness";
    return "Observation";
  };

  const BadgeIcon = ({ badge }: { badge: Badge }) => {
    if (badge === "positive") return <ArrowUpRight size={14} />;
    if (badge === "negative") return <ArrowDownRight size={14} />;
    return <Minus size={14} />;
  };

  return (
    <div style={{ background: "var(--card, #1e1e2f)", borderRadius: 16, padding: 24, color: "var(--foreground, #e2e2e2)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Brain size={22} style={{ color: "#60a5fa" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Journal AI Insights</h3>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Behavioral pattern analysis from your trade journal</span>
          </div>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isGenerating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 10,
            color: "#60a5fa",
            padding: "8px 16px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} style={{ animation: isGenerating ? "spin 0.8s linear infinite" : "none" }} />
          Generate New Insights
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Trades Analyzed", value: summary.totalTrades.toString(), icon: <BarChart3 size={16} style={{ color: "#60a5fa" }} /> },
            { label: "Win Rate", value: `${summary.winRate}%`, icon: <Target size={16} style={{ color: "#22c55e" }} /> },
            { label: "Avg Hold Time", value: summary.avgHoldTime, icon: <Clock size={16} style={{ color: "#facc15" }} /> },
            { label: "Top Sector", value: summary.mostTradedSector, icon: <TrendingUp size={16} style={{ color: "#38bdf8" }} /> },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(0,0,0,0.2)",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                {stat.icon}
                <span style={{ fontSize: 11, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Insight cards */}
      {isGenerating ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
          <Sparkles size={28} style={{ animation: "spin 1.5s linear infinite", marginBottom: 12 }} />
          <div style={{ fontSize: 14 }}>Analyzing your trading patterns...</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {insights.map((insight) => {
            const colors = badgeColor(insight.badge);
            const IconComp = ICON_MAP[insight.icon];
            return (
              <div
                key={insight.id}
                className="insight-card"
                style={{
                  background: "rgba(0,0,0,0.18)",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 18,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Pattern name + badge */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="insight-pattern" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconComp size={18} style={{ color: colors.text, flexShrink: 0 }} />
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{insight.patternName}</span>
                  </div>
                  <span
                    className="insight-badge"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <BadgeIcon badge={insight.badge} />
                    {badgeLabel(insight.badge)}
                  </span>
                </div>

                {/* Description */}
                <div className="insight-detail" style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.75, marginBottom: 12 }}>
                  {insight.description}
                </div>

                {/* Affected trades */}
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} />
                  {insight.affectedTrades} trades affected
                </div>

                {/* Recommendation */}
                <div
                  style={{
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 12,
                    lineHeight: 1.6,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Lightbulb size={14} style={{ color: "#facc15", flexShrink: 0, marginTop: 2 }} />
                  <span>{insight.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .insight-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
