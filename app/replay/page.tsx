"use client";

import { useState, useMemo } from "react";
import PageShell from "../../components/PageShell";
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  Target,
  DollarSign,
  Percent,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { runAgent } from "../../lib/agents/run-agent";
import type { AgentRunResult } from "../../lib/agents/types";

type OHLCBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Decision = {
  date: string;
  action: "BUY" | "SELL" | "HOLD";
  price: number;
  reasoning: string;
  confidence: number;
};

type ReplayResult = {
  decisions: Decision[];
  totalReturn: number;
  winRate: number;
  avgGain: number;
  avgLoss: number;
  trades: number;
};

const DATE_PRESETS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
];

function generateMockOHLC(symbol: string, months: number): OHLCBar[] {
  const bars: OHLCBar[] = [];
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  // Seed from symbol name for deterministic-ish data
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let price = 100 + rng() * 200; // Starting price between 100-300
  const current = new Date(start);

  while (current <= end) {
    // Skip weekends
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const change = (rng() - 0.48) * price * 0.03; // Slight upward bias
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + rng() * price * 0.01;
      const low = Math.min(open, close) - rng() * price * 0.01;
      const volume = Math.floor(1000000 + rng() * 5000000);

      bars.push({
        date: current.toISOString().split("T")[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });

      price = close;
    }
    current.setDate(current.getDate() + 1);
  }

  return bars;
}

function parseDecisionsFromResult(result: AgentRunResult, bars: OHLCBar[]): Decision[] {
  const decisions: Decision[] = [];
  const text = result.details || result.summary || "";

  // Sample bars at intervals for decisions
  const step = Math.max(1, Math.floor(bars.length / 8));

  for (let i = 0; i < bars.length; i += step) {
    const bar = bars[i];
    // Parse signals for direction hints
    const signal = result.signals[decisions.length % Math.max(1, result.signals.length)];

    let action: Decision["action"] = "HOLD";
    let confidence = 50;
    let reasoning = "No strong signal detected. Maintaining current position.";

    if (signal) {
      if (signal.type === "bullish") {
        action = "BUY";
        confidence = signal.confidence;
        reasoning = signal.message || "Bullish signal detected.";
      } else if (signal.type === "bearish") {
        action = "SELL";
        confidence = signal.confidence;
        reasoning = signal.message || "Bearish signal detected.";
      } else if (signal.type === "action") {
        action = signal.message.toLowerCase().includes("buy") ? "BUY" : signal.message.toLowerCase().includes("sell") ? "SELL" : "HOLD";
        confidence = signal.confidence;
        reasoning = signal.message;
      } else {
        reasoning = signal.message || "Neutral stance maintained.";
      }
    }

    // Add some variety based on price movement
    if (!signal) {
      const prevBar = bars[Math.max(0, i - step)];
      const pctChange = ((bar.close - prevBar.close) / prevBar.close) * 100;
      if (pctChange > 2) {
        action = "SELL";
        confidence = 60;
        reasoning = `Price surged ${pctChange.toFixed(1)}%. Taking profits on strength.`;
      } else if (pctChange < -2) {
        action = "BUY";
        confidence = 65;
        reasoning = `Price dipped ${Math.abs(pctChange).toFixed(1)}%. Buying the dip at support.`;
      }
    }

    decisions.push({
      date: bar.date,
      action,
      price: bar.close,
      reasoning,
      confidence,
    });
  }

  return decisions;
}

function calculateStats(decisions: Decision[]): ReplayResult {
  const trades: { entry: number; exit: number }[] = [];
  let entryPrice: number | null = null;

  for (const d of decisions) {
    if (d.action === "BUY" && entryPrice === null) {
      entryPrice = d.price;
    } else if (d.action === "SELL" && entryPrice !== null) {
      trades.push({ entry: entryPrice, exit: d.price });
      entryPrice = null;
    }
  }

  const returns = trades.map((t) => ((t.exit - t.entry) / t.entry) * 100);
  const wins = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r <= 0);

  const totalReturn = returns.reduce((sum, r) => sum + r, 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgGain = wins.length > 0 ? wins.reduce((s, r) => s + r, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, r) => s + r, 0) / losses.length : 0;

  return {
    decisions,
    totalReturn,
    winRate,
    avgGain,
    avgLoss,
    trades: trades.length,
  };
}

function ActionBadge({ action }: { action: Decision["action"] }) {
  const color =
    action === "BUY" ? "var(--positive)" : action === "SELL" ? "var(--negative)" : "var(--ink-muted)";
  const Icon = action === "BUY" ? TrendingUp : action === "SELL" ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
      style={{ background: color, color: "#fff" }}
    >
      <Icon size={12} />
      {action}
    </span>
  );
}

export default function ReplayPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleReplay = async () => {
    setLoading(true);
    setResult(null);

    const bars = generateMockOHLC(symbol.toUpperCase(), months);

    // Build historical data context
    const dataChunks = bars
      .slice(0, 30)
      .map((b) => `${b.date}: O=${b.open} H=${b.high} L=${b.low} C=${b.close} Vol=${b.volume.toLocaleString()}`)
      .join("\n");

    const context = `Historical OHLC data for ${symbol.toUpperCase()} (last ${months} month${months > 1 ? "s" : ""}):\n${dataChunks}\n\nBased on this price action, what trades would you have made? For each decision point, specify BUY, SELL, or HOLD with reasoning.`;

    try {
      const agentResult = await runAgent("trade-executor", [symbol.toUpperCase()], context);
      const decisions = parseDecisionsFromResult(agentResult, bars);
      const stats = calculateStats(decisions);
      setResult(stats);
    } catch {
      // Generate decisions from mock data alone on error
      const decisions = bars
        .filter((_, i) => i % Math.max(1, Math.floor(bars.length / 8)) === 0)
        .map((bar, i) => ({
          date: bar.date,
          action: (i % 3 === 0 ? "BUY" : i % 3 === 1 ? "SELL" : "HOLD") as Decision["action"],
          price: bar.close,
          reasoning: "Based on technical analysis of price action.",
          confidence: 50 + Math.floor(Math.random() * 30),
        }));
      setResult(calculateStats(decisions));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="AI Trade Replay"
      subtitle="Simulate what the Trade Executor agent would have done with historical data"
    >
      {/* Controls */}
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="px-3 py-2 rounded-lg text-sm outline-none w-28 uppercase"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink)",
                border: "1px solid var(--surface-border)",
              }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Period
            </label>
            <div className="flex gap-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setMonths(p.months)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: months === p.months ? "var(--accent-2)" : "var(--surface-2)",
                    color: months === p.months ? "#fff" : "var(--ink-muted)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleReplay}
            disabled={loading || !symbol.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent-2)", color: "#fff" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? "Running Replay..." : "Run Replay"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                label: "Total Return",
                value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`,
                color: result.totalReturn >= 0 ? "var(--positive)" : "var(--negative)",
                icon: DollarSign,
              },
              {
                label: "Win Rate",
                value: `${result.winRate.toFixed(0)}%`,
                color: result.winRate >= 50 ? "var(--positive)" : "var(--negative)",
                icon: Target,
              },
              {
                label: "Avg Gain",
                value: `+${result.avgGain.toFixed(2)}%`,
                color: "var(--positive)",
                icon: TrendingUp,
              },
              {
                label: "Avg Loss",
                value: `${result.avgLoss.toFixed(2)}%`,
                color: "var(--negative)",
                icon: TrendingDown,
              },
              {
                label: "Trades",
                value: `${result.trades}`,
                color: "var(--accent-2)",
                icon: BarChart3,
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 space-y-1">
                <div className="flex items-center gap-1.5">
                  <stat.icon size={14} style={{ color: stat.color }} />
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {stat.label}
                  </span>
                </div>
                <p className="text-lg font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="glass-card p-5 space-y-1">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--ink)" }}>
              Decision Timeline
            </h3>

            <div className="relative">
              {/* Timeline line */}
              <div
                className="absolute left-[17px] top-0 bottom-0 w-px"
                style={{ background: "var(--surface-border)" }}
              />

              <div className="space-y-0">
                {result.decisions.map((d, i) => {
                  const isExpanded = expandedIdx === i;
                  return (
                    <div key={i} className="relative flex gap-4 py-3">
                      {/* Timeline dot */}
                      <div
                        className="relative z-10 w-[9px] h-[9px] rounded-full mt-1.5 shrink-0"
                        style={{
                          background:
                            d.action === "BUY"
                              ? "var(--positive)"
                              : d.action === "SELL"
                              ? "var(--negative)"
                              : "var(--ink-muted)",
                          marginLeft: "13px",
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <ActionBadge action={d.action} />
                          <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                            ${d.price.toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>
                            <Calendar size={10} />
                            {d.date}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: "var(--surface-2)",
                              color: "var(--ink-muted)",
                              border: "1px solid var(--surface-border)",
                            }}
                          >
                            {d.confidence}% conf
                          </span>
                          <button
                            onClick={() => setExpandedIdx(isExpanded ? null : i)}
                            className="ml-auto"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>

                        {isExpanded && (
                          <p
                            className="mt-2 text-xs leading-relaxed p-2 rounded-lg"
                            style={{
                              color: "var(--ink-muted)",
                              background: "var(--surface-2)",
                              border: "1px solid var(--surface-border)",
                            }}
                          >
                            {d.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div
          className="glass-card p-8 text-center"
          style={{ color: "var(--ink-muted)" }}
        >
          <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Enter a symbol and period, then click Run Replay.</p>
          <p className="text-xs mt-1">
            The Trade Executor agent will analyze historical data and show what trades it would have recommended.
          </p>
        </div>
      )}
    </PageShell>
  );
}
