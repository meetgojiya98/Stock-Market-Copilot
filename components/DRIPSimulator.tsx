"use client";

import { useMemo, useState } from "react";
import { Calculator, DollarSign, Repeat, TrendingUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type YearProjection = {
  year: number;
  startingValue: number;
  dividendEarned: number;
  endingValueWithDrip: number;
  endingValueWithoutDrip: number;
  cumulativeDividends: number;
  currentYield: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMoney(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function formatFullMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function computeProjections(
  initialInvestment: number,
  annualYield: number,
  dividendGrowthRate: number,
  years: number
): YearProjection[] {
  const projections: YearProjection[] = [];

  let dripValue = initialInvestment;
  let noDripValue = initialInvestment;
  let currentYield = annualYield / 100;
  let cumulativeDividends = 0;

  for (let y = 1; y <= years; y++) {
    // With DRIP: dividends are reinvested
    const dripDividend = dripValue * currentYield;
    dripValue += dripDividend;
    cumulativeDividends += dripDividend;

    // Without DRIP: dividends are taken out (value stays the same, but total return includes cash dividends)
    const noDripDividend = noDripValue * currentYield;
    // noDripValue stays at initialInvestment (principal doesn't grow without reinvestment, but we still track the dividends)

    projections.push({
      year: y,
      startingValue: y === 1 ? initialInvestment : projections[y - 2].endingValueWithDrip,
      dividendEarned: dripDividend,
      endingValueWithDrip: dripValue,
      endingValueWithoutDrip: initialInvestment + noDripDividend * y, // principal + cumulative cash dividends
      cumulativeDividends,
      currentYield: currentYield * 100,
    });

    // Grow the yield for next year
    currentYield *= 1 + dividendGrowthRate / 100;
  }

  return projections;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DRIPSimulator() {
  const [initial, setInitial] = useState(10000);
  const [yieldPct, setYieldPct] = useState(3.5);
  const [growthRate, setGrowthRate] = useState(5);
  const [years, setYears] = useState(20);

  const projections = useMemo(
    () => computeProjections(initial, yieldPct, growthRate, years),
    [initial, yieldPct, growthRate, years]
  );

  const finalWithDrip = projections.length > 0 ? projections[projections.length - 1].endingValueWithDrip : initial;
  const finalWithoutDrip = projections.length > 0 ? projections[projections.length - 1].endingValueWithoutDrip : initial;
  const totalDividends = projections.length > 0 ? projections[projections.length - 1].cumulativeDividends : 0;
  const dripAdvantage = finalWithDrip - finalWithoutDrip;
  const maxValue = Math.max(finalWithDrip, finalWithoutDrip, 1);

  // Select milestone years for display cards
  const milestoneYears = useMemo(() => {
    const milestones: number[] = [];
    const step = Math.max(1, Math.floor(years / 6));
    for (let y = step; y <= years; y += step) {
      milestones.push(y);
    }
    if (!milestones.includes(years)) milestones.push(years);
    return milestones.slice(0, 8);
  }, [years]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Repeat size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">DRIP Simulator</span>
          <span className="text-[10px] muted ml-auto">Dividend Reinvestment Plan</span>
        </div>

        {/* Input controls */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1.5">
              Initial Investment ($)
            </label>
            <input
              type="number"
              value={initial}
              onChange={(e) => setInitial(Math.max(100, parseFloat(e.target.value) || 0))}
              className="control-surface rounded-lg px-3 py-2 text-sm font-mono w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              min={100}
              step={1000}
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1.5">
              Annual Dividend Yield (%)
            </label>
            <input
              type="number"
              value={yieldPct}
              onChange={(e) => setYieldPct(Math.max(0.1, Math.min(20, parseFloat(e.target.value) || 0)))}
              className="control-surface rounded-lg px-3 py-2 text-sm font-mono w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              min={0.1}
              max={20}
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1.5">
              Dividend Growth Rate (%)
            </label>
            <input
              type="number"
              value={growthRate}
              onChange={(e) => setGrowthRate(Math.max(0, Math.min(25, parseFloat(e.target.value) || 0)))}
              className="control-surface rounded-lg px-3 py-2 text-sm font-mono w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              min={0}
              max={25}
              step={0.5}
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1.5">
              Years to Project: {years}
            </label>
            <input
              type="range"
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className="w-full accent-[var(--accent)] mt-2"
              min={5}
              max={30}
              step={1}
            />
            <div className="flex justify-between text-[10px] muted mt-0.5">
              <span>5</span>
              <span>30</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid sm:grid-cols-4 gap-3 fade-up">
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-[var(--accent)]" />
            <span className="text-[10px] tracking-[0.12em] uppercase muted font-semibold">Total Invested</span>
          </div>
          <div className="metric-value text-xl font-semibold">{formatFullMoney(initial)}</div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Repeat size={14} className="text-[var(--positive)]" />
            <span className="text-[10px] tracking-[0.12em] uppercase muted font-semibold">Dividends Earned</span>
          </div>
          <div className="metric-value text-xl font-semibold text-[var(--positive)]">{formatFullMoney(totalDividends)}</div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[var(--positive)]" />
            <span className="text-[10px] tracking-[0.12em] uppercase muted font-semibold">Final Value (DRIP)</span>
          </div>
          <div className="metric-value text-xl font-semibold text-[var(--positive)]">{formatFullMoney(finalWithDrip)}</div>
        </div>
        <div className="rounded-2xl surface-glass dynamic-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator size={14} className="muted" />
            <span className="text-[10px] tracking-[0.12em] uppercase muted font-semibold">Without DRIP</span>
          </div>
          <div className="metric-value text-xl font-semibold">{formatFullMoney(finalWithoutDrip)}</div>
        </div>
      </div>

      {/* Comparison bar */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up space-y-3">
        <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-2">DRIP vs No-DRIP Comparison</div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[var(--positive)]">With DRIP</span>
              <span className="font-mono font-semibold">{formatMoney(finalWithDrip)}</span>
            </div>
            <div className="drip-comparison-bar rounded-full h-6 overflow-hidden" style={{ backgroundColor: "var(--surface-border)" }}>
              <div
                className="drip-comparison-fill h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(finalWithDrip / maxValue) * 100}%`,
                  backgroundColor: "var(--positive)",
                  opacity: 0.8,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold muted">Without DRIP</span>
              <span className="font-mono font-semibold">{formatMoney(finalWithoutDrip)}</span>
            </div>
            <div className="drip-comparison-bar rounded-full h-6 overflow-hidden" style={{ backgroundColor: "var(--surface-border)" }}>
              <div
                className="drip-comparison-fill h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(finalWithoutDrip / maxValue) * 100}%`,
                  backgroundColor: "var(--ink-muted)",
                  opacity: 0.5,
                }}
              />
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-xs muted">DRIP advantage: </span>
            <span className="text-sm font-semibold text-[var(--positive)]">+{formatFullMoney(dripAdvantage)}</span>
            <span className="text-xs muted ml-1">
              ({((dripAdvantage / Math.max(finalWithoutDrip, 1)) * 100).toFixed(1)}% more)
            </span>
          </div>
        </div>
      </div>

      {/* Year-by-year projection cards */}
      <div className="drip-projection">
        <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold mb-3 fade-up">Year-by-Year Projections</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 fade-up">
          {milestoneYears.map((y) => {
            const p = projections[y - 1];
            if (!p) return null;
            return (
              <div key={y} className="drip-year-card rounded-2xl surface-glass dynamic-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Year {p.year}</span>
                  <span className="text-[10px] muted font-mono">Yield: {p.currentYield.toFixed(2)}%</span>
                </div>
                <div className="metric-value text-lg font-semibold text-[var(--positive)]">
                  {formatMoney(p.endingValueWithDrip)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="muted">Dividend</div>
                    <div className="font-mono font-medium">{formatMoney(p.dividendEarned)}</div>
                  </div>
                  <div>
                    <div className="muted">Total Divs</div>
                    <div className="font-mono font-medium text-[var(--positive)]">{formatMoney(p.cumulativeDividends)}</div>
                  </div>
                </div>
                {/* Mini comparison bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="drip-comparison-bar rounded-full h-2 flex-1 overflow-hidden" style={{ backgroundColor: "var(--surface-border)" }}>
                      <div
                        className="drip-comparison-fill h-full rounded-full"
                        style={{
                          width: `${(p.endingValueWithDrip / Math.max(p.endingValueWithDrip, p.endingValueWithoutDrip, 1)) * 100}%`,
                          backgroundColor: "var(--positive)",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono w-12 text-right">DRIP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="drip-comparison-bar rounded-full h-2 flex-1 overflow-hidden" style={{ backgroundColor: "var(--surface-border)" }}>
                      <div
                        className="drip-comparison-fill h-full rounded-full"
                        style={{
                          width: `${(p.endingValueWithoutDrip / Math.max(p.endingValueWithDrip, p.endingValueWithoutDrip, 1)) * 100}%`,
                          backgroundColor: "var(--ink-muted)",
                          opacity: 0.4,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono w-12 text-right muted">No DRIP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
