"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Brain,
  Filter,
  MinusCircle,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type SignalAction = "Buy" | "Sell" | "Hold";
type FilterType = "All" | SignalAction;

type TradeSignal = {
  id: string;
  symbol: string;
  action: SignalAction;
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  tags: string[];
};

const SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM",
  "V", "UNH", "HD", "CRM", "AMD", "NFLX", "BA", "COST",
];

const BUY_REASONS = [
  "Strong bullish divergence on RSI with increasing institutional volume accumulation. The stock has bounced off its 200-day moving average with a golden cross forming, suggesting sustained upward momentum in the near term.",
  "Earnings beat estimates by 12% with raised forward guidance. Revenue growth acceleration in cloud segment combined with margin expansion creates a favorable risk-reward setup at current levels.",
  "Breakout above multi-month descending trendline resistance on heavy volume. Options flow shows significant call buying at higher strikes, indicating smart money positioning for further upside.",
  "Sector rotation tailwinds and relative strength leadership signal continued outperformance. Technical support is well-defined below current price with an attractive risk-reward of 3:1.",
];

const SELL_REASONS = [
  "Bearish engulfing candle on weekly chart near all-time highs with declining momentum indicators. Insider selling has accelerated while short interest climbs, suggesting distribution phase is underway.",
  "Revenue growth deceleration combined with margin compression signals fundamental deterioration. Valuation premium relative to peers is no longer justified as competitive pressures intensify.",
  "Death cross forming as the 50-day MA crosses below the 200-day MA. Volume profile shows major supply zone overhead with limited buying interest, making any bounce likely short-lived.",
  "Multiple analyst downgrades this week citing weakening demand trends and elevated inventory levels. The risk of an earnings miss is high given channel checks showing softer order patterns.",
];

const HOLD_REASONS = [
  "Trading in a well-defined range with no clear catalyst for a breakout in either direction. Current position sizing is appropriate; wait for earnings to provide a definitive signal before adjusting.",
  "Mixed signals from technical and fundamental analysis. The stock is fairly valued at current levels with balanced risk-reward. Monitor upcoming Fed decision for potential sector-wide impact.",
  "Consolidation phase after a strong run-up suggests healthy price action. Support and resistance levels are tightly bound; a breakout will likely occur within 2-3 weeks and provide better entry or exit.",
  "Neutral momentum with volume drying up. No urgency to add or trim positions. The next quarterly report will be the key catalyst to determine directional bias for the coming months.",
];

const TAGS_POOL = [
  "Momentum", "Breakout", "Mean Reversion", "Earnings Play",
  "Technical", "Fundamental", "Swing Trade", "Position Trade",
  "Value", "Growth", "Sector Leader", "Options Flow",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTags(): string[] {
  const count = 2 + Math.floor(Math.random() * 2);
  const shuffled = [...TAGS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateSignals(): TradeSignal[] {
  const count = 8 + Math.floor(Math.random() * 5); // 8-12 signals
  const shuffledSymbols = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, count);

  return shuffledSymbols.map((symbol) => {
    const actions: SignalAction[] = ["Buy", "Sell", "Hold"];
    // Weight toward Buy slightly for more realistic distribution
    const weights = [0.4, 0.3, 0.3];
    const rand = Math.random();
    let action: SignalAction;
    if (rand < weights[0]) action = actions[0];
    else if (rand < weights[0] + weights[1]) action = actions[1];
    else action = actions[2];

    const confidence = 60 + Math.floor(Math.random() * 36); // 60-95
    const basePrice = 50 + Math.random() * 800;
    const entryPrice = parseFloat(basePrice.toFixed(2));

    let targetPrice: number;
    let stopLoss: number;
    let reasoning: string;

    if (action === "Buy") {
      targetPrice = parseFloat((entryPrice * (1.05 + Math.random() * 0.15)).toFixed(2));
      stopLoss = parseFloat((entryPrice * (0.92 + Math.random() * 0.05)).toFixed(2));
      reasoning = pick(BUY_REASONS);
    } else if (action === "Sell") {
      targetPrice = parseFloat((entryPrice * (0.85 + Math.random() * 0.1)).toFixed(2));
      stopLoss = parseFloat((entryPrice * (1.03 + Math.random() * 0.05)).toFixed(2));
      reasoning = pick(SELL_REASONS);
    } else {
      targetPrice = parseFloat((entryPrice * (1.02 + Math.random() * 0.05)).toFixed(2));
      stopLoss = parseFloat((entryPrice * (0.95 + Math.random() * 0.03)).toFixed(2));
      reasoning = pick(HOLD_REASONS);
    }

    return {
      id: `sig-${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol,
      action,
      confidence,
      entryPrice,
      targetPrice,
      stopLoss,
      reasoning,
      tags: pickTags(),
    };
  });
}

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function TradeSignals() {
  const [filter, setFilter] = useState<FilterType>("All");

  const signals = useMemo(() => generateSignals(), []);

  const filteredSignals = useMemo(() => {
    const source = filter === "All" ? signals : signals.filter((s) => s.action === filter);
    // Sort by confidence, highest first
    return [...source].sort((a, b) => b.confidence - a.confidence);
  }, [signals, filter]);

  const counts = useMemo(() => {
    return {
      All: signals.length,
      Buy: signals.filter((s) => s.action === "Buy").length,
      Sell: signals.filter((s) => s.action === "Sell").length,
      Hold: signals.filter((s) => s.action === "Hold").length,
    };
  }, [signals]);

  const ActionIcon = ({ action }: { action: SignalAction }) => {
    if (action === "Buy") return <ArrowUpCircle size={15} style={{ color: "var(--positive)" }} />;
    if (action === "Sell") return <ArrowDownCircle size={15} style={{ color: "var(--negative)" }} />;
    return <MinusCircle size={15} style={{ color: "var(--accent-2)" }} />;
  };

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2">
              <Brain size={13} style={{ color: "var(--accent)" }} />
              AI Trade Signals
            </div>
            <p className="text-sm muted mt-1">
              Machine learning-powered signals with confidence scores, entry/exit targets, and risk analysis.
            </p>
          </div>
          <span className="text-[11px] rounded-full px-2.5 py-0.5 badge-neutral font-semibold">
            {signals.length} signals
          </span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="muted" />
        {(["All", "Buy", "Sell", "Hold"] as FilterType[]).map((f) => {
          const isActive = filter === f;
          let activeClass = "bg-[var(--accent)] text-white";
          if (isActive && f === "Buy") activeClass = "bg-[var(--positive)] text-white";
          if (isActive && f === "Sell") activeClass = "bg-[var(--negative)] text-white";
          if (isActive && f === "Hold") activeClass = "bg-[var(--accent-2)] text-white";

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? activeClass
                  : "control-surface bg-white/75 dark:bg-black/25 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {f} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Signal cards grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSignals.map((signal) => {
          const actionLower = signal.action.toLowerCase() as "buy" | "sell" | "hold";
          const confidenceColor =
            signal.action === "Buy"
              ? "var(--positive)"
              : signal.action === "Sell"
              ? "var(--negative)"
              : "var(--accent-2)";

          return (
            <div key={signal.id} className={`signal-card surface-glass dynamic-surface ${actionLower}`}>
              {/* Top row: symbol + signal badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ActionIcon action={signal.action} />
                  <span className="text-lg font-bold section-title">{signal.symbol}</span>
                </div>
                <span className={`signal-tag signal-${actionLower}`}>
                  {signal.action}
                </span>
              </div>

              {/* Confidence bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] muted font-semibold">Confidence</span>
                  <span className="text-[11px] font-bold" style={{ color: confidenceColor }}>
                    {signal.confidence}%
                  </span>
                </div>
                <div className="signal-confidence">
                  <div
                    className="signal-confidence-fill"
                    style={{
                      width: `${signal.confidence}%`,
                      backgroundColor: confidenceColor,
                    }}
                  />
                </div>
              </div>

              {/* Price targets */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2 py-1.5 text-center">
                  <div className="text-[10px] muted flex items-center justify-center gap-1">
                    <Target size={9} />
                    Entry
                  </div>
                  <div className="text-xs font-bold metric-value">{formatPrice(signal.entryPrice)}</div>
                </div>
                <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2 py-1.5 text-center">
                  <div className="text-[10px] muted flex items-center justify-center gap-1">
                    <TrendingUp size={9} />
                    Target
                  </div>
                  <div className="text-xs font-bold" style={{ color: "var(--positive)" }}>
                    {formatPrice(signal.targetPrice)}
                  </div>
                </div>
                <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2 py-1.5 text-center">
                  <div className="text-[10px] muted flex items-center justify-center gap-1">
                    <Shield size={9} />
                    Stop
                  </div>
                  <div className="text-xs font-bold" style={{ color: "var(--negative)" }}>
                    {formatPrice(signal.stopLoss)}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {signal.tags.map((tag) => (
                  <span
                    key={tag}
                    className="signal-tag"
                    style={{
                      background: "color-mix(in srgb, var(--ink) 8%, transparent)",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* AI reasoning */}
              <div className="rounded-xl control-surface bg-white/60 dark:bg-black/20 p-3 text-xs leading-relaxed flex-1">
                <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1.5 flex items-center gap-1">
                  <Brain size={10} />
                  AI Analysis
                </div>
                {signal.reasoning}
              </div>

              {/* Risk-reward indicator */}
              <div className="mt-3 flex items-center justify-between text-[10px] muted">
                <span>
                  R:R{" "}
                  {signal.action === "Buy"
                    ? ((signal.targetPrice - signal.entryPrice) / (signal.entryPrice - signal.stopLoss)).toFixed(1)
                    : signal.action === "Sell"
                    ? ((signal.entryPrice - signal.targetPrice) / (signal.stopLoss - signal.entryPrice)).toFixed(1)
                    : "N/A"}
                  :1
                </span>
                <span className="flex items-center gap-1">
                  {signal.action === "Buy" ? (
                    <TrendingUp size={10} style={{ color: "var(--positive)" }} />
                  ) : signal.action === "Sell" ? (
                    <TrendingDown size={10} style={{ color: "var(--negative)" }} />
                  ) : (
                    <MinusCircle size={10} style={{ color: "var(--accent-2)" }} />
                  )}
                  {signal.action === "Buy"
                    ? `+${((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1)}% upside`
                    : signal.action === "Sell"
                    ? `${((1 - signal.targetPrice / signal.entryPrice) * 100).toFixed(1)}% downside target`
                    : "Range-bound"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for filtered view */}
      {filteredSignals.length === 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center">
          <Brain size={28} className="mx-auto muted" />
          <p className="mt-3 text-sm muted">
            No {filter.toLowerCase()} signals available at this time.
          </p>
        </div>
      )}
    </div>
  );
}
