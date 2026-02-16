"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle,
  DollarSign,
  Loader2,
  PieChart,
  RefreshCw,
  Scale,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Holding = {
  symbol: string;
  shares: number;
  price: number;
  currentWeight: number;
  targetWeight: number;
};

type RebalanceTrade = {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  dollarAmount: number;
  currentWeight: number;
  targetWeight: number;
};

type ExecutionLog = {
  id: string;
  timestamp: string;
  trades: RebalanceTrade[];
  totalCost: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LOG_KEY = "smc_rebalance_log_v1";

function seededRng(seed: number): () => number {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function getDefaultHoldings(): Holding[] {
  const rng = seededRng(9922);
  const stocks: { symbol: string; basePrice: number }[] = [
    { symbol: "AAPL", basePrice: 178.5 },
    { symbol: "MSFT", basePrice: 415.2 },
    { symbol: "NVDA", basePrice: 875.3 },
    { symbol: "AMZN", basePrice: 185.6 },
    { symbol: "GOOG", basePrice: 155.8 },
    { symbol: "TSLA", basePrice: 242.1 },
    { symbol: "META", basePrice: 502.4 },
    { symbol: "JPM", basePrice: 198.7 },
  ];

  const shares = stocks.map(() => Math.floor(5 + rng() * 95));
  const prices = stocks.map((s) => +(s.basePrice * (0.95 + rng() * 0.1)).toFixed(2));
  const values = shares.map((s, i) => s * prices[i]);
  const total = values.reduce((a, b) => a + b, 0);

  // Default targets: equal weight
  const equalTarget = +(100 / stocks.length).toFixed(1);

  return stocks.map((s, i) => ({
    symbol: s.symbol,
    shares: shares[i],
    price: prices[i],
    currentWeight: +((values[i] / total) * 100).toFixed(2),
    targetWeight: equalTarget,
  }));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMoney(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatPct(v: number): string {
  return `${v.toFixed(2)}%`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RebalancingEngine() {
  const [holdings, setHoldings] = useState<Holding[]>(() => getDefaultHoldings());
  const [trades, setTrades] = useState<RebalanceTrade[]>([]);
  const [showTrades, setShowTrades] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);

  /* ---- Load execution log ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setExecutionLogs(parsed);
      }
    } catch { /* empty */ }
  }, []);

  /* ---- Derived ---- */
  const totalPortfolioValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * h.price, 0),
    [holdings],
  );

  const targetSum = useMemo(() => holdings.reduce((s, h) => s + h.targetWeight, 0), [holdings]);
  const isTargetValid = Math.abs(targetSum - 100) < 0.5;

  /* ---- Update target ---- */
  const updateTarget = useCallback((symbol: string, value: number) => {
    setHoldings((prev) =>
      prev.map((h) => (h.symbol === symbol ? { ...h, targetWeight: value } : h)),
    );
    setShowTrades(false);
    setTrades([]);
    setExecuted(false);
  }, []);

  /* ---- Calculate trades ---- */
  const calculateTrades = useCallback(() => {
    if (!isTargetValid) return;

    const result: RebalanceTrade[] = [];
    for (const h of holdings) {
      const currentValue = h.shares * h.price;
      const targetValue = totalPortfolioValue * (h.targetWeight / 100);
      const diff = targetValue - currentValue;
      const diffShares = Math.round(Math.abs(diff) / h.price);

      if (diffShares === 0) continue;

      result.push({
        id: `rb-${h.symbol}-${Date.now()}`,
        symbol: h.symbol,
        action: diff > 0 ? "buy" : "sell",
        shares: diffShares,
        dollarAmount: +Math.abs(diff).toFixed(2),
        currentWeight: h.currentWeight,
        targetWeight: h.targetWeight,
      });
    }

    setTrades(result);
    setShowTrades(true);
    setExecuted(false);
  }, [holdings, totalPortfolioValue, isTargetValid]);

  /* ---- Total cost to rebalance ---- */
  const totalRebalanceCost = useMemo(
    () => trades.reduce((s, t) => s + t.dollarAmount, 0),
    [trades],
  );

  /* ---- Execute all ---- */
  const executeAll = useCallback(() => {
    if (executed || trades.length === 0) return;
    setExecuting(true);

    setTimeout(() => {
      const log: ExecutionLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        trades: [...trades],
        totalCost: totalRebalanceCost,
      };

      const newLogs = [log, ...executionLogs].slice(0, 20);
      setExecutionLogs(newLogs);

      try {
        localStorage.setItem(LOG_KEY, JSON.stringify(newLogs));
      } catch { /* empty */ }

      // Update holdings to reflect new weights
      setHoldings((prev) =>
        prev.map((h) => ({
          ...h,
          currentWeight: h.targetWeight,
          shares: Math.round((totalPortfolioValue * (h.targetWeight / 100)) / h.price),
        })),
      );

      setExecuted(true);
      setExecuting(false);
      setTrades([]);
    }, 1200);
  }, [executed, trades, totalRebalanceCost, executionLogs, totalPortfolioValue]);

  /* ---- Auto equal weight ---- */
  const setEqualWeight = useCallback(() => {
    const w = +(100 / holdings.length).toFixed(1);
    setHoldings((prev) => prev.map((h) => ({ ...h, targetWeight: w })));
    setShowTrades(false);
    setTrades([]);
    setExecuted(false);
  }, [holdings.length]);

  /* ---- Market-cap weighted (mock) ---- */
  const setMarketCapWeight = useCallback(() => {
    const rng = seededRng(4455);
    const caps = holdings.map(() => 200 + rng() * 2800);
    const total = caps.reduce((a, b) => a + b, 0);
    setHoldings((prev) =>
      prev.map((h, i) => ({ ...h, targetWeight: +((caps[i] / total) * 100).toFixed(1) })),
    );
    setShowTrades(false);
    setTrades([]);
    setExecuted(false);
  }, [holdings]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Portfolio Rebalancing Engine
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs muted mb-4">
          <Wallet size={12} />
          Total Portfolio Value: <span className="font-bold text-[var(--foreground)]">{formatMoney(totalPortfolioValue)}</span>
        </div>

        {/* ---- Quick actions ---- */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={setEqualWeight}
            className="text-[11px] rounded-lg px-3 py-1.5 border border-[var(--surface-border)] hover:border-[var(--accent)] hover:text-[var(--accent)] font-medium transition-colors"
          >
            <PieChart size={11} className="inline mr-1" />
            Equal Weight
          </button>
          <button
            onClick={setMarketCapWeight}
            className="text-[11px] rounded-lg px-3 py-1.5 border border-[var(--surface-border)] hover:border-[var(--accent)] hover:text-[var(--accent)] font-medium transition-colors"
          >
            <Target size={11} className="inline mr-1" />
            Market Cap Weight
          </button>
          <div className="ml-auto text-[10px] muted">
            Target sum:{" "}
            <span className={`font-bold ${isTargetValid ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
              {targetSum.toFixed(1)}%
            </span>
            {!isTargetValid && <span className="text-[var(--negative)] ml-1">(must be ~100%)</span>}
          </div>
        </div>

        {/* ---- Allocation bars ---- */}
        <div className="space-y-3">
          {holdings.map((h) => {
            const diff = h.targetWeight - h.currentWeight;
            const maxW = Math.max(h.currentWeight, h.targetWeight, 1);
            return (
              <div key={h.symbol} className="rebalance-bar-container">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold w-12">{h.symbol}</span>
                  <span className="text-[10px] muted">{formatMoney(h.shares * h.price)}</span>
                  <span className="text-[10px] muted">({h.shares} shares @ {formatMoney(h.price)})</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] muted">Target:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={h.targetWeight}
                      onChange={(e) => updateTarget(h.symbol, Math.max(0, Math.min(100, +e.target.value)))}
                      className="w-16 rounded-md control-surface bg-white/80 dark:bg-black/25 px-2 py-1 text-xs text-right border border-[var(--surface-border)]"
                    />
                    <span className="text-[10px] muted">%</span>
                  </div>
                </div>

                {/* Visual bars */}
                <div className="rebalance-bar flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] w-14 muted text-right">Current</span>
                    <div className="flex-1 h-3 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
                      <div
                        className="rebalance-bar-current h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${(h.currentWeight / Math.max(maxW * 1.2, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold w-14 text-right">{formatPct(h.currentWeight)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] w-14 muted text-right">Target</span>
                    <div className="flex-1 h-3 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
                      <div
                        className="rebalance-bar-target h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(h.targetWeight / Math.max(maxW * 1.2, 1)) * 100}%`,
                          background: diff > 0.5 ? "var(--positive)" : diff < -0.5 ? "var(--negative)" : "#8b5cf6",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold w-14 text-right">{formatPct(h.targetWeight)}</span>
                  </div>
                </div>

                {/* Diff indicator */}
                {Math.abs(diff) > 0.1 && (
                  <div className="flex items-center gap-1 mt-0.5 ml-16">
                    {diff > 0 ? (
                      <TrendingUp size={10} className="text-[var(--positive)]" />
                    ) : (
                      <TrendingDown size={10} className="text-[var(--negative)]" />
                    )}
                    <span
                      className={`text-[10px] font-semibold ${diff > 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                    >
                      {diff > 0 ? "+" : ""}{diff.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ---- Calculate button ---- */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={calculateTrades}
            disabled={!isTargetValid}
            className="rounded-lg px-5 py-2 text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className="inline mr-1" />
            Calculate Trades
          </button>
          {showTrades && trades.length === 0 && (
            <span className="text-xs text-[var(--positive)] font-medium flex items-center gap-1">
              <CheckCircle size={13} /> Portfolio is already balanced!
            </span>
          )}
        </div>
      </div>

      {/* ---- Rebalance Trades ---- */}
      {showTrades && trades.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Rebalance Trades ({trades.length})
            </span>
            <span className="ml-auto text-xs muted">
              Total turnover: <span className="font-bold text-[var(--foreground)]">{formatMoney(totalRebalanceCost)}</span>
            </span>
          </div>

          <div className="space-y-2 mb-4">
            {trades.map((t) => (
              <div
                key={t.id}
                className="rebalance-trade-card flex items-center gap-3 rounded-xl border border-[var(--surface-border)] p-3"
              >
                <span
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase shrink-0 ${
                    t.action === "buy"
                      ? "bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]"
                      : "bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] text-[var(--negative)]"
                  }`}
                >
                  {t.action === "buy" ? <ShoppingCart size={10} className="inline mr-0.5" /> : null}
                  {t.action}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{t.symbol}</div>
                  <div className="text-[10px] muted">
                    {t.shares} shares &middot; {formatMoney(t.dollarAmount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] muted flex items-center gap-1 justify-end">
                    {formatPct(t.currentWeight)}
                    <ArrowRight size={10} className="text-[var(--accent)]" />
                    <span className="font-semibold text-[var(--foreground)]">{formatPct(t.targetWeight)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Execute All ---- */}
          <div className="flex items-center gap-3">
            <button
              onClick={executeAll}
              disabled={executed || executing}
              className="rounded-lg px-5 py-2 text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-colors"
            >
              {executing ? (
                <><Loader2 size={12} className="inline mr-1 animate-spin" />Executing...</>
              ) : executed ? (
                <><Check size={12} className="inline mr-1" />Executed</>
              ) : (
                <><DollarSign size={12} className="inline mr-1" />Execute All Trades</>
              )}
            </button>
            {executed && (
              <span className="text-xs text-[var(--positive)] font-medium flex items-center gap-1">
                <CheckCircle size={13} /> All trades executed successfully!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---- Execution History ---- */}
      {executionLogs.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Check size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Execution History ({executionLogs.length})
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {executionLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs"
              >
                <CheckCircle size={12} className="text-[var(--positive)] shrink-0" />
                <span className="muted">
                  {new Date(log.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-medium">{log.trades.length} trades</span>
                <span className="muted">&middot;</span>
                <span className="font-semibold">{formatMoney(log.totalCost)} turnover</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
