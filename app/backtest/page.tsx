"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { useState } from "react";
import { Play, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Target, Percent } from "lucide-react";
import { AGENT_CONFIGS } from "../../lib/agents/configs";
import type { AgentId, AgentRunResult } from "../../lib/agents/types";

type BacktestTrade = {
  date: string;
  type: "buy" | "sell";
  price: number;
  signal: string;
};

type BacktestResult = {
  trades: BacktestTrade[];
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: number[];
};

const POPULAR_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "SPY"];

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [agentId, setAgentId] = useState<AgentId>("market-scanner");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState("");

  const runBacktest = async () => {
    if (running) return;
    setRunning(true);
    setError("");
    setResult(null);
    setProgress(0);

    try {
      // Fetch historical data
      const chartRes = await fetch(`/api/stocks/chart?symbol=${symbol}&limit=120`);
      if (!chartRes.ok) throw new Error("Failed to fetch historical data");
      const chartData = await chartRes.json();
      const history: { date: string; close: number }[] = (chartData.data || []).reverse();

      if (history.length < 20) throw new Error("Insufficient historical data");

      // Simulate backtest with stride of 10 data points
      const trades: BacktestTrade[] = [];
      const equityCurve: number[] = [10000]; // Start with $10k
      let capital = 10000;
      let position = 0;
      let lastBuyPrice = 0;
      const stride = Math.max(5, Math.floor(history.length / 12));
      const windows = [];

      for (let i = 20; i < history.length; i += stride) {
        windows.push(i);
      }

      for (let w = 0; w < windows.length; w++) {
        const i = windows[w];
        setProgress(Math.round(((w + 1) / windows.length) * 100));

        // Call agent for this data window
        const windowData = history.slice(Math.max(0, i - 20), i + 1);
        const currentPrice = history[i].close;
        const toolData = `## ${symbol}\n**Recent prices:** ${windowData.slice(-5).map((d) => `${d.date}: $${d.close}`).join(", ")}\n**Current Price:** $${currentPrice}`;

        try {
          const res = await fetch("/api/agent/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId,
              symbols: [symbol],
              toolData,
              systemPrompt: AGENT_CONFIGS.find((c) => c.id === agentId)?.systemPrompt || "",
              context: `Analyze ${symbol} at $${currentPrice} and provide a buy/sell/hold signal. Be decisive.`,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = (data.text || "").toLowerCase();

            // Parse signal
            const isBullish = text.includes('"bullish"') || text.includes('"buy"');
            const isBearish = text.includes('"bearish"') || text.includes('"sell"');

            if (isBullish && position === 0) {
              position = Math.floor(capital / currentPrice);
              lastBuyPrice = currentPrice;
              capital -= position * currentPrice;
              trades.push({ date: history[i].date, type: "buy", price: currentPrice, signal: "Bullish signal" });
            } else if (isBearish && position > 0) {
              capital += position * currentPrice;
              trades.push({ date: history[i].date, type: "sell", price: currentPrice, signal: "Bearish signal" });
              position = 0;
            }
          }
        } catch { /* skip failed window */ }

        const totalValue = capital + position * history[i].close;
        equityCurve.push(totalValue);
      }

      // Close any open position at end
      if (position > 0 && history.length > 0) {
        const lastPrice = history[history.length - 1].close;
        capital += position * lastPrice;
        trades.push({ date: history[history.length - 1].date, type: "sell", price: lastPrice, signal: "End of backtest" });
        position = 0;
      }

      const totalReturn = ((capital - 10000) / 10000) * 100;
      const wins = trades.filter((t, i) => {
        if (t.type !== "sell") return false;
        const buyTrade = trades.slice(0, i).reverse().find((x) => x.type === "buy");
        return buyTrade ? t.price > buyTrade.price : false;
      });
      const sellTrades = trades.filter((t) => t.type === "sell");
      const winRate = sellTrades.length ? (wins.length / sellTrades.length) * 100 : 0;

      // Max drawdown
      let peak = equityCurve[0];
      let maxDD = 0;
      for (const val of equityCurve) {
        if (val > peak) peak = val;
        const dd = ((peak - val) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
      }

      // Simple Sharpe estimate
      const returns: number[] = [];
      for (let i = 1; i < equityCurve.length; i++) {
        returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
      }
      const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const stdReturn = returns.length > 1
        ? Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1))
        : 1;
      const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

      setResult({ trades, totalReturn, winRate, maxDrawdown: maxDD, sharpeRatio: sharpe, equityCurve });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setRunning(false);
      setProgress(100);
    }
  };

  return (
    <AuthGuard>
      <PageShell title="Backtesting" subtitle="Test agent signals against historical data">
        <div className="space-y-4">
          {/* Config */}
          <div className="glass-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1.5 block">Symbol</label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SYMBOLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSymbol(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        symbol === s
                          ? "border-[var(--accent-2)] text-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)]"
                          : "border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent-2)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1.5 block">Agent</label>
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value as AgentId)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] outline-none"
                >
                  {AGENT_CONFIGS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={runBacktest}
                  disabled={running}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--accent-2)" }}
                >
                  <Play size={14} />
                  {running ? `Running... ${progress}%` : "Run Backtest"}
                </button>
              </div>
            </div>
            {running && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: "var(--accent-2)" }}
                  />
                </div>
              </div>
            )}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--negative)]">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Metrics strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Return", value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`, icon: TrendingUp, positive: result.totalReturn >= 0 },
                  { label: "Win Rate", value: `${result.winRate.toFixed(1)}%`, icon: Target, positive: result.winRate >= 50 },
                  { label: "Max Drawdown", value: `-${result.maxDrawdown.toFixed(2)}%`, icon: TrendingDown, positive: result.maxDrawdown < 10 },
                  { label: "Sharpe Ratio", value: result.sharpeRatio.toFixed(2), icon: Percent, positive: result.sharpeRatio > 1 },
                ].map((m) => (
                  <div key={m.label} className="stat-card relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: m.positive ? "var(--positive)" : "var(--negative)" }} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="stat-card-label">{m.label}</span>
                        <m.icon size={13} style={{ color: m.positive ? "var(--positive)" : "var(--negative)" }} />
                      </div>
                      <div className="stat-card-value">{m.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equity curve (simple text-based) */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} className="text-[var(--accent-2)]" />
                  <span className="text-sm font-bold text-[var(--ink)]">Equity Curve</span>
                </div>
                <div className="flex items-end gap-px h-32">
                  {result.equityCurve.map((val, i) => {
                    const min = Math.min(...result.equityCurve);
                    const max = Math.max(...result.equityCurve);
                    const range = max - min || 1;
                    const height = ((val - min) / range) * 100;
                    const isPositive = val >= 10000;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all"
                        style={{
                          height: `${Math.max(4, height)}%`,
                          background: isPositive ? "var(--positive)" : "var(--negative)",
                          opacity: 0.7 + (i / result.equityCurve.length) * 0.3,
                        }}
                        title={`$${val.toFixed(0)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[var(--ink-muted)]">
                  <span>Start: $10,000</span>
                  <span>End: ${(result.equityCurve[result.equityCurve.length - 1] || 10000).toFixed(0)}</span>
                </div>
              </div>

              {/* Trade log */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <span className="text-sm font-bold text-[var(--ink)]">Trade Log ({result.trades.length} trades)</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {result.trades.map((trade, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-0 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md font-bold text-white text-[10px]"
                          style={{ background: trade.type === "buy" ? "var(--positive)" : "var(--negative)" }}
                        >
                          {trade.type.toUpperCase()}
                        </span>
                        <span className="text-[var(--ink-muted)]">{trade.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[var(--ink)] tabular-nums">${trade.price.toFixed(2)}</span>
                        <span className="text-[var(--ink-muted)] max-w-[150px] truncate">{trade.signal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  );
}
