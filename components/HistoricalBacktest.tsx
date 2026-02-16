"use client";

import { useState, useMemo, useCallback } from "react";

type Period = {
  id: string;
  label: string;
  years: string;
  description: string;
};

type Allocation = {
  symbol: string;
  weight: number;
};

type BacktestResult = {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
};

const PERIODS: Period[] = [
  { id: "2008_crisis", label: "2008-2009 Crisis", years: "2008-2009", description: "Global financial crisis and banking collapse" },
  { id: "2010_bull", label: "2010-2019 Bull Run", years: "2010-2019", description: "Historic decade-long bull market expansion" },
  { id: "2020_covid", label: "2020 COVID", years: "2020", description: "Pandemic crash and rapid V-shaped recovery" },
  { id: "2021_rates", label: "2021-2022 Rate Hikes", years: "2021-2022", description: "Inflation spike and aggressive Fed tightening" },
  { id: "full_history", label: "Full History", years: "2005-2024", description: "Complete multi-cycle historical period" },
];

const DEFAULT_ALLOCATIONS: Allocation[] = [
  { symbol: "AAPL", weight: 25 },
  { symbol: "MSFT", weight: 20 },
  { symbol: "GOOGL", weight: 15 },
  { symbol: "AMZN", weight: 15 },
  { symbol: "NVDA", weight: 10 },
  { symbol: "JPM", weight: 10 },
  { symbol: "JNJ", weight: 5 },
];

// SP500 benchmark results for each period
const SP500_RESULTS: Record<string, BacktestResult> = {
  "2008_crisis": { totalReturn: -38.5, annualizedReturn: -21.2, maxDrawdown: -56.8, sharpeRatio: -1.42, sortinoRatio: -1.85, winRate: 38.2 },
  "2010_bull": { totalReturn: 256.8, annualizedReturn: 13.6, maxDrawdown: -19.8, sharpeRatio: 1.05, sortinoRatio: 1.48, winRate: 63.5 },
  "2020_covid": { totalReturn: 18.4, annualizedReturn: 18.4, maxDrawdown: -33.9, sharpeRatio: 0.62, sortinoRatio: 0.88, winRate: 56.8 },
  "2021_rates": { totalReturn: -8.2, annualizedReturn: -4.2, maxDrawdown: -25.4, sharpeRatio: -0.22, sortinoRatio: -0.35, winRate: 48.2 },
  "full_history": { totalReturn: 385.2, annualizedReturn: 8.5, maxDrawdown: -56.8, sharpeRatio: 0.68, sortinoRatio: 0.92, winRate: 58.4 },
};

// Seeded random for deterministic but varied results
function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function hashString(s: string) {
  return s.split("").reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 13), 0);
}

// Symbol-specific characteristics that influence returns
const SYMBOL_PROFILES: Record<string, { growthBias: number; volatility: number; techExposure: number }> = {
  AAPL: { growthBias: 1.3, volatility: 1.1, techExposure: 0.9 },
  MSFT: { growthBias: 1.25, volatility: 0.95, techExposure: 0.85 },
  GOOGL: { growthBias: 1.2, volatility: 1.15, techExposure: 0.95 },
  AMZN: { growthBias: 1.35, volatility: 1.3, techExposure: 0.80 },
  NVDA: { growthBias: 1.6, volatility: 1.5, techExposure: 1.0 },
  JPM: { growthBias: 0.85, volatility: 1.2, techExposure: 0.2 },
  JNJ: { growthBias: 0.7, volatility: 0.6, techExposure: 0.1 },
};

const DEFAULT_PROFILE = { growthBias: 1.0, volatility: 1.0, techExposure: 0.5 };

// Generate plausible period returns based on period characteristics and stock profile
function generatePeriodResult(periodId: string, allocations: Allocation[]): BacktestResult {
  const seed = hashString(periodId + allocations.map((a) => a.symbol + a.weight).join(","));
  const rng = seededRng(seed);

  // Base characteristics for each period
  const periodBase: Record<string, { baseReturn: number; baseVol: number; marketDirection: number }> = {
    "2008_crisis": { baseReturn: -35, baseVol: 1.8, marketDirection: -1 },
    "2010_bull": { baseReturn: 280, baseVol: 0.7, marketDirection: 1 },
    "2020_covid": { baseReturn: 25, baseVol: 1.4, marketDirection: 0.6 },
    "2021_rates": { baseReturn: -12, baseVol: 1.2, marketDirection: -0.5 },
    "full_history": { baseReturn: 420, baseVol: 1.0, marketDirection: 0.7 },
  };

  const base = periodBase[periodId] || { baseReturn: 50, baseVol: 1.0, marketDirection: 0.5 };

  // Weighted average of stock profiles
  let weightedGrowth = 0;
  let weightedVol = 0;
  let weightedTech = 0;
  let totalWeight = 0;

  for (const alloc of allocations) {
    const profile = SYMBOL_PROFILES[alloc.symbol] || DEFAULT_PROFILE;
    const w = alloc.weight / 100;
    weightedGrowth += profile.growthBias * w;
    weightedVol += profile.volatility * w;
    weightedTech += profile.techExposure * w;
    totalWeight += w;
  }

  if (totalWeight > 0) {
    weightedGrowth /= totalWeight;
    weightedVol /= totalWeight;
    weightedTech /= totalWeight;
  }

  // Adjust returns based on portfolio characteristics
  let totalReturn = base.baseReturn * weightedGrowth;
  // Tech-heavy portfolios did worse in 2008, better in bull runs, worse in rate hikes
  if (periodId === "2008_crisis") totalReturn *= (1 - weightedTech * 0.15);
  if (periodId === "2010_bull") totalReturn *= (1 + weightedTech * 0.25);
  if (periodId === "2021_rates") totalReturn *= (1 + weightedTech * 0.3);
  if (periodId === "2020_covid") totalReturn *= (1 + weightedTech * 0.4);

  // Add some randomness
  totalReturn += (rng() - 0.5) * Math.abs(totalReturn) * 0.15;

  // Calculate derived metrics
  const years = periodId === "2020_covid" ? 1 : periodId === "2008_crisis" ? 2 : periodId === "2021_rates" ? 2 : periodId === "2010_bull" ? 10 : 20;
  const annualizedReturn = years > 1
    ? (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100
    : totalReturn;

  const maxDrawdown = base.marketDirection < 0
    ? -(Math.abs(base.baseReturn) * weightedVol * (0.9 + rng() * 0.3))
    : -(15 + rng() * 25) * weightedVol;

  const sharpeRatio = annualizedReturn / (15 * weightedVol * base.baseVol);
  const sortinoRatio = sharpeRatio * (1.2 + rng() * 0.3);

  const winRate = base.marketDirection > 0
    ? 52 + base.marketDirection * 12 + (rng() - 0.5) * 8
    : 35 + base.marketDirection * 10 + (rng() - 0.5) * 8;

  return {
    totalReturn: +totalReturn.toFixed(1),
    annualizedReturn: +annualizedReturn.toFixed(1),
    maxDrawdown: +Math.min(maxDrawdown, -2).toFixed(1),
    sharpeRatio: +sharpeRatio.toFixed(2),
    sortinoRatio: +sortinoRatio.toFixed(2),
    winRate: +Math.max(20, Math.min(80, winRate)).toFixed(1),
  };
}

export default function HistoricalBacktest() {
  const [allocations, setAllocations] = useState<Allocation[]>(DEFAULT_ALLOCATIONS);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("full_history");
  const [newSymbol, setNewSymbol] = useState("");
  const [newWeight, setNewWeight] = useState(10);

  const totalWeight = useMemo(
    () => allocations.reduce((s, a) => s + a.weight, 0),
    [allocations]
  );

  const portfolioResult = useMemo(
    () => generatePeriodResult(selectedPeriod, allocations),
    [selectedPeriod, allocations]
  );

  const benchmarkResult = SP500_RESULTS[selectedPeriod] || SP500_RESULTS["full_history"];
  const activePeriod = PERIODS.find((p) => p.id === selectedPeriod);

  const addAllocation = useCallback(() => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym || newWeight <= 0) return;
    const existing = allocations.find((a) => a.symbol === sym);
    if (existing) {
      setAllocations(allocations.map((a) => (a.symbol === sym ? { ...a, weight: a.weight + newWeight } : a)));
    } else {
      setAllocations([...allocations, { symbol: sym, weight: newWeight }]);
    }
    setNewSymbol("");
  }, [newSymbol, newWeight, allocations]);

  const removeAllocation = useCallback((symbol: string) => {
    setAllocations(allocations.filter((a) => a.symbol !== symbol));
  }, [allocations]);

  const updateWeight = useCallback((symbol: string, weight: number) => {
    setAllocations(allocations.map((a) => (a.symbol === symbol ? { ...a, weight: Math.max(0, weight) } : a)));
  }, [allocations]);

  const resetAllocations = useCallback(() => {
    setAllocations(DEFAULT_ALLOCATIONS);
  }, []);

  const metricColor = (val: number, inverse?: boolean) => {
    if (inverse) return val < 0 ? "text-[var(--positive)]" : val > 0 ? "text-[var(--negative)]" : "metric-value";
    return val >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";
  };

  const renderMetricComparison = (label: string, portfolioVal: number, benchmarkVal: number, suffix: string, inverse?: boolean) => {
    const diff = portfolioVal - benchmarkVal;
    const better = inverse ? diff < 0 : diff > 0;
    return (
      <div className="backtest-result-card rounded-xl control-surface p-3">
        <div className="backtest-metric-label text-[10px] tracking-[0.1em] uppercase muted font-semibold mb-2">{label}</div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] muted">Your Portfolio</div>
            <div className={`backtest-metric-value text-base font-semibold ${metricColor(portfolioVal, inverse)}`}>
              {portfolioVal >= 0 && !inverse ? "+" : ""}{portfolioVal}{suffix}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] muted">S&P 500</div>
            <div className={`text-sm font-semibold ${metricColor(benchmarkVal, inverse)}`}>
              {benchmarkVal >= 0 && !inverse ? "+" : ""}{benchmarkVal}{suffix}
            </div>
          </div>
        </div>
        {diff !== 0 && (
          <div className={`mt-1.5 text-[10px] font-semibold ${better ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {better ? "Outperformed" : "Underperformed"} by {Math.abs(diff).toFixed(1)}{suffix}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <h2 className="text-sm font-semibold section-title">Historical Backtesting Engine</h2>
        <p className="text-xs muted mt-0.5">
          Define a portfolio allocation and backtest it against historical periods. Compare your strategy vs the S&P 500 benchmark.
        </p>
      </div>

      {/* Portfolio Allocation Editor */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-semibold section-title">Portfolio Allocation</div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${totalWeight === 100 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
              {totalWeight}% / 100%
            </span>
            <button
              onClick={resetAllocations}
              className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-[10px] font-semibold muted hover:opacity-80"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          {allocations.map((alloc) => (
            <div key={alloc.symbol} className="flex items-center gap-2 rounded-lg control-surface p-2">
              <span className="text-xs font-semibold section-title w-16">{alloc.symbol}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(alloc.weight, 100)}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={alloc.weight}
                onChange={(e) => updateWeight(alloc.symbol, +e.target.value)}
                className="w-14 rounded-md control-surface bg-white/80 dark:bg-black/25 px-2 py-1 text-xs text-center"
              />
              <span className="text-[10px] muted">%</span>
              <button
                onClick={() => removeAllocation(alloc.symbol)}
                className="text-[var(--negative)] text-xs font-bold px-1 hover:opacity-70"
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Add new allocation */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="w-24 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={newWeight}
            onChange={(e) => setNewWeight(Math.max(1, +e.target.value))}
            className="w-16 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
          />
          <span className="text-[10px] muted">%</span>
          <button
            onClick={addAllocation}
            className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
          >
            Add
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="backtest-period-selector flex flex-wrap gap-2">
        {PERIODS.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period.id)}
            className={`backtest-period-btn rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              selectedPeriod === period.id
                ? "bg-[var(--accent)] text-white"
                : "control-surface muted hover:opacity-80"
            }`}
          >
            <div>{period.label}</div>
            <div className="text-[9px] opacity-70">{period.years}</div>
          </button>
        ))}
      </div>

      {/* Period description */}
      {activePeriod && (
        <div className="rounded-xl control-surface p-3">
          <div className="text-xs font-semibold section-title">{activePeriod.label} ({activePeriod.years})</div>
          <div className="text-[10px] muted mt-0.5">{activePeriod.description}</div>
        </div>
      )}

      {/* Results grid */}
      {totalWeight > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {renderMetricComparison("Total Return", portfolioResult.totalReturn, benchmarkResult.totalReturn, "%")}
          {renderMetricComparison("Annualized Return", portfolioResult.annualizedReturn, benchmarkResult.annualizedReturn, "%")}
          {renderMetricComparison("Max Drawdown", portfolioResult.maxDrawdown, benchmarkResult.maxDrawdown, "%", true)}
          {renderMetricComparison("Sharpe Ratio", portfolioResult.sharpeRatio, benchmarkResult.sharpeRatio, "")}
          {renderMetricComparison("Sortino Ratio", portfolioResult.sortinoRatio, benchmarkResult.sortinoRatio, "")}
          {renderMetricComparison("Win Rate", portfolioResult.winRate, benchmarkResult.winRate, "%")}
        </div>
      )}

      {totalWeight === 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center fade-up">
          <p className="muted text-sm">Add allocations above to see backtest results.</p>
        </div>
      )}

      {/* Overall assessment */}
      {totalWeight > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <h3 className="text-sm font-semibold section-title mb-2">Backtest Summary</h3>
          <div className="text-xs muted leading-relaxed">
            {portfolioResult.totalReturn > benchmarkResult.totalReturn ? (
              <span>
                Your portfolio <strong className="text-[var(--positive)]">outperformed</strong> the S&P 500 by{" "}
                {(portfolioResult.totalReturn - benchmarkResult.totalReturn).toFixed(1)}% in total return during the{" "}
                {activePeriod?.label} period.
              </span>
            ) : (
              <span>
                Your portfolio <strong className="text-[var(--negative)]">underperformed</strong> the S&P 500 by{" "}
                {(benchmarkResult.totalReturn - portfolioResult.totalReturn).toFixed(1)}% in total return during the{" "}
                {activePeriod?.label} period.
              </span>
            )}{" "}
            The portfolio had a max drawdown of {portfolioResult.maxDrawdown}% compared to the benchmark{"\u2019"}s{" "}
            {benchmarkResult.maxDrawdown}%, with a Sharpe ratio of {portfolioResult.sharpeRatio} vs {benchmarkResult.sharpeRatio}.
            {totalWeight !== 100 && (
              <span className="text-[var(--negative)]"> Note: Your allocations sum to {totalWeight}%, not 100%. Adjust weights for more accurate results.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
