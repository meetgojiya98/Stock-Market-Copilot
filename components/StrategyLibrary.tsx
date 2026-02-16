"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Search,
  BarChart3,
  Clock,
  Zap,
  Target,
  DollarSign,
  LineChart,
  PieChart,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Shield,
  AlertTriangle,
  User,
  Filter,
} from "lucide-react";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

type Strategy = {
  name: string;
  icon: typeof TrendingUp;
  difficulty: Difficulty;
  timeCommitment: string;
  description: string;
  keyRules: string[];
  bestFor: string;
  risks: string[];
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Beginner: "var(--positive)",
  Intermediate: "var(--warning)",
  Advanced: "var(--negative)",
};

const STRATEGIES: Strategy[] = [
  {
    name: "Momentum Trading",
    icon: Zap,
    difficulty: "Advanced",
    timeCommitment: "2-4 hours daily",
    description: "Buy stocks that are already going up and sell stocks that are going down. The idea is that trends tend to continue, so you ride the wave until it fades.",
    keyRules: [
      "Look for stocks making new highs with strong volume.",
      "Use moving averages to confirm the trend direction.",
      "Set strict stop-losses to protect against sudden reversals.",
      "Exit when momentum slows or indicators diverge.",
    ],
    bestFor: "Active traders who can watch the market closely and react quickly to changing conditions.",
    risks: [
      "Trends can reverse without warning, causing fast losses.",
      "Requires constant monitoring and quick decision-making.",
      "Transaction costs can add up with frequent trading.",
    ],
  },
  {
    name: "Value Investing",
    icon: Search,
    difficulty: "Intermediate",
    timeCommitment: "3-5 hours weekly",
    description: "Find stocks trading below their true worth by studying company financials. You buy undervalued companies and wait for the market to recognize their real value over time.",
    keyRules: [
      "Look for low P/E ratios compared to industry peers.",
      "Check that the company has solid earnings and low debt.",
      "Be patient. Value plays can take months or years to pay off.",
      "Focus on businesses you understand well.",
    ],
    bestFor: "Patient investors who enjoy researching companies and can hold positions for a long time.",
    risks: [
      "A stock can stay undervalued for a very long time.",
      "Sometimes a low price reflects real problems with the company.",
      "Requires deep financial analysis skills.",
    ],
  },
  {
    name: "Swing Trading",
    icon: RefreshCw,
    difficulty: "Intermediate",
    timeCommitment: "1-2 hours daily",
    description: "Hold stocks for days to weeks to capture short-term price swings. Swing traders use technical analysis to find entry and exit points within larger trends.",
    keyRules: [
      "Identify stocks with clear support and resistance levels.",
      "Enter near support and exit near resistance.",
      "Use RSI and MACD to time your trades.",
      "Always set a stop-loss before entering a trade.",
    ],
    bestFor: "Traders who want more action than buy-and-hold but don't want to watch screens all day.",
    risks: [
      "Overnight gaps can move prices against your position.",
      "Requires consistent chart reading and discipline.",
      "Can lead to overtrading if you're not careful.",
    ],
  },
  {
    name: "Day Trading",
    icon: Clock,
    difficulty: "Advanced",
    timeCommitment: "6-8 hours daily",
    description: "Buy and sell stocks within the same trading day. Day traders profit from small price movements and never hold positions overnight, avoiding after-hours risk.",
    keyRules: [
      "Only trade stocks with high volume and liquidity.",
      "Use tight stop-losses on every single trade.",
      "Start with a small account and scale up slowly.",
      "Keep a journal of every trade to track what works.",
    ],
    bestFor: "Full-time traders with strong discipline, fast internet, and the ability to handle stress.",
    risks: [
      "Most day traders lose money, especially beginners.",
      "Requires significant time, focus, and emotional control.",
      "Pattern day trader rules require a $25,000 minimum balance.",
    ],
  },
  {
    name: "Dividend Investing",
    icon: DollarSign,
    difficulty: "Beginner",
    timeCommitment: "1-2 hours weekly",
    description: "Buy stocks that pay regular dividends and reinvest those payments to grow your wealth over time. This strategy focuses on steady income rather than big price gains.",
    keyRules: [
      "Look for companies with a long history of paying and raising dividends.",
      "Check the payout ratio. A very high ratio may not be sustainable.",
      "Reinvest dividends to benefit from compounding.",
      "Diversify across sectors to protect your income stream.",
    ],
    bestFor: "Long-term investors who want steady income and lower volatility in their portfolio.",
    risks: [
      "Dividend stocks can still lose value during market downturns.",
      "Companies can cut or eliminate dividends at any time.",
      "Growth may be slower compared to non-dividend stocks.",
    ],
  },
  {
    name: "Growth Investing",
    icon: TrendingUp,
    difficulty: "Intermediate",
    timeCommitment: "2-3 hours weekly",
    description: "Invest in companies expected to grow their revenue and earnings faster than the market average. Growth investors prioritize future potential over current valuation.",
    keyRules: [
      "Focus on companies with strong revenue growth rates.",
      "Look for expanding markets and competitive advantages.",
      "Accept higher valuations if the growth story is strong.",
      "Monitor earnings reports closely for any slowdown.",
    ],
    bestFor: "Investors with a longer time horizon who are comfortable with higher volatility in exchange for bigger potential returns.",
    risks: [
      "Growth stocks can drop sharply if earnings disappoint.",
      "High valuations mean there's less margin for error.",
      "Market rotations can punish growth stocks for extended periods.",
    ],
  },
  {
    name: "Index Investing",
    icon: PieChart,
    difficulty: "Beginner",
    timeCommitment: "30 minutes monthly",
    description: "Buy index funds or ETFs that track the whole market instead of picking individual stocks. This is the simplest way to invest and historically beats most active managers.",
    keyRules: [
      "Pick low-cost index funds with small expense ratios.",
      "Invest consistently, regardless of market conditions.",
      "Rebalance your portfolio once or twice a year.",
      "Stay the course during downturns. Don't panic sell.",
    ],
    bestFor: "Everyone, especially beginners and people who prefer a hands-off approach to investing.",
    risks: [
      "You'll never beat the market since you are the market.",
      "Market-wide downturns will affect your entire portfolio.",
      "Can feel boring compared to picking individual stocks.",
    ],
  },
  {
    name: "Contrarian Investing",
    icon: Target,
    difficulty: "Advanced",
    timeCommitment: "3-5 hours weekly",
    description: "Go against the crowd. Buy when everyone is selling and sell when everyone is buying. Contrarian investors believe markets overreact and that sentiment creates opportunities.",
    keyRules: [
      "Look for stocks at 52-week lows with solid fundamentals.",
      "Track market sentiment indicators to find extremes.",
      "Be prepared to be wrong for a while before being right.",
      "Only buy when you have a clear thesis for recovery.",
    ],
    bestFor: "Experienced investors with strong conviction, patience, and the ability to ignore popular opinion.",
    risks: [
      "Going against the crowd is psychologically difficult.",
      "Stocks that are down can keep falling for valid reasons.",
      "Timing contrarian trades is extremely challenging.",
    ],
  },
];

const FILTERS: (Difficulty | "All")[] = ["All", "Beginner", "Intermediate", "Advanced"];

export default function StrategyLibrary() {
  const [activeFilter, setActiveFilter] = useState<Difficulty | "All">("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return STRATEGIES;
    return STRATEGIES.filter((s) => s.difficulty === activeFilter);
  }, [activeFilter]);

  const toggle = (name: string) => {
    setExpanded((prev) => (prev === name ? null : name));
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <BarChart3 size={13} /> Strategies
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{STRATEGIES.length}</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Filter size={13} /> Showing
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{filtered.length}</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <LineChart size={13} /> Levels
          </div>
          <div className="mt-1 flex items-center gap-2">
            {(["Beginner", "Intermediate", "Advanced"] as Difficulty[]).map((d) => (
              <span key={d} className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                style={{ backgroundColor: `color-mix(in srgb, ${DIFFICULTY_COLORS[d]} 16%, transparent)`, color: DIFFICULTY_COLORS[d] }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              activeFilter === f
                ? "bg-[var(--accent)] text-white"
                : "control-surface muted hover:opacity-80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Strategy cards */}
      <div className="space-y-2">
        {filtered.map((strategy) => {
          const Icon = strategy.icon;
          const isOpen = expanded === strategy.name;
          return (
            <div key={strategy.name} className="rounded-2xl surface-glass dynamic-surface fade-up overflow-hidden">
              <button
                onClick={() => toggle(strategy.name)}
                className="w-full p-4 sm:p-5 text-left"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${DIFFICULTY_COLORS[strategy.difficulty]} 16%, transparent)` }}>
                    <Icon size={16} style={{ color: DIFFICULTY_COLORS[strategy.difficulty] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm section-title">{strategy.name}</span>
                      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                        style={{ backgroundColor: `color-mix(in srgb, ${DIFFICULTY_COLORS[strategy.difficulty]} 16%, transparent)`, color: DIFFICULTY_COLORS[strategy.difficulty] }}>
                        {strategy.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs muted">
                      <Clock size={11} /> {strategy.timeCommitment}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={14} style={{ color: "var(--accent)" }} />
                  ) : (
                    <ChevronRight size={14} className="muted" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-3">
                  <div className="rounded-xl control-surface p-3">
                    <p className="text-sm muted leading-relaxed">{strategy.description}</p>
                  </div>

                  <div className="rounded-xl control-surface p-3 space-y-2">
                    <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
                      <Shield size={13} /> Key Rules
                    </div>
                    <ul className="space-y-1">
                      {strategy.keyRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm muted leading-relaxed">
                          <span className="text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: "var(--surface-emphasis)", color: "var(--accent)" }}>
                            {i + 1}
                          </span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl control-surface p-3 space-y-1">
                      <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
                        <User size={13} /> Best For
                      </div>
                      <p className="text-sm muted leading-relaxed">{strategy.bestFor}</p>
                    </div>
                    <div className="rounded-xl control-surface p-3 space-y-1">
                      <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
                        <AlertTriangle size={13} /> Risks
                      </div>
                      <ul className="space-y-1">
                        {strategy.risks.map((risk, i) => (
                          <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--negative)" }}>
                            - {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
