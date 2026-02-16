"use client";

import { useState, useMemo } from "react";

type Scenario = {
  id: string;
  name: string;
  description: string;
  drawdown: number;
  recoveryMonths: number;
  year: string;
  sectorImpact: Record<string, number>;
};

type PortfolioPosition = {
  symbol: string;
  name: string;
  value: number;
  sector: string;
  beta: number;
};

const SCENARIOS: Scenario[] = [
  {
    id: "2008_crisis",
    name: "2008 Financial Crisis",
    description: "Global banking collapse triggered by subprime mortgage defaults. Lehman Brothers bankruptcy and credit freeze across markets.",
    drawdown: -38,
    recoveryMonths: 49,
    year: "2008-2009",
    sectorImpact: { Financials: -55, Technology: -42, Consumer: -38, Healthcare: -25, Energy: -48, Industrials: -42, "Real Estate": -60, Utilities: -20 },
  },
  {
    id: "covid_crash",
    name: "COVID Crash",
    description: "Rapid pandemic-driven selloff as global lockdowns halted economic activity. Fastest 30% decline in market history.",
    drawdown: -34,
    recoveryMonths: 5,
    year: "2020",
    sectorImpact: { Financials: -38, Technology: -22, Consumer: -45, Healthcare: -18, Energy: -55, Industrials: -40, "Real Estate": -30, Utilities: -25 },
  },
  {
    id: "rate_hike",
    name: "Rate Hike Cycle",
    description: "Aggressive Federal Reserve tightening with rates rising from near zero to 5.25-5.50%, compressing valuations across growth stocks.",
    drawdown: -20,
    recoveryMonths: 14,
    year: "2022",
    sectorImpact: { Financials: -12, Technology: -32, Consumer: -22, Healthcare: -10, Energy: 15, Industrials: -15, "Real Estate": -28, Utilities: -8 },
  },
  {
    id: "tech_bubble",
    name: "Tech Bubble Pop",
    description: "Dot-com bubble burst wiping out speculative internet stocks. NASDAQ fell 78% from peak to trough over 30 months.",
    drawdown: -45,
    recoveryMonths: 84,
    year: "2000-2002",
    sectorImpact: { Financials: -25, Technology: -72, Consumer: -30, Healthcare: -15, Energy: -10, Industrials: -35, "Real Estate": -18, Utilities: -5 },
  },
  {
    id: "sector_rotation",
    name: "Sector Rotation",
    description: "Large institutional capital shift from growth to value sectors, causing significant underperformance in high-growth tech names.",
    drawdown: -15,
    recoveryMonths: 8,
    year: "2021",
    sectorImpact: { Financials: 10, Technology: -25, Consumer: -12, Healthcare: -5, Energy: 20, Industrials: 8, "Real Estate": -8, Utilities: 5 },
  },
  {
    id: "flash_crash",
    name: "Flash Crash",
    description: "Sudden, deep market plunge driven by algorithmic trading and liquidity evaporation. Markets recovered intraday but volatility persisted.",
    drawdown: -10,
    recoveryMonths: 1,
    year: "2010",
    sectorImpact: { Financials: -12, Technology: -10, Consumer: -9, Healthcare: -8, Energy: -11, Industrials: -10, "Real Estate": -8, Utilities: -6 },
  },
  {
    id: "mild_recession",
    name: "Mild Recession",
    description: "Economic contraction with rising unemployment and declining corporate earnings, but without a full-scale financial crisis.",
    drawdown: -25,
    recoveryMonths: 18,
    year: "Hypothetical",
    sectorImpact: { Financials: -30, Technology: -22, Consumer: -28, Healthcare: -12, Energy: -20, Industrials: -25, "Real Estate": -22, Utilities: -10 },
  },
  {
    id: "stagflation",
    name: "Stagflation",
    description: "Persistent high inflation combined with stagnant economic growth and rising unemployment, eroding purchasing power and earnings.",
    drawdown: -30,
    recoveryMonths: 30,
    year: "Hypothetical",
    sectorImpact: { Financials: -28, Technology: -35, Consumer: -32, Healthcare: -15, Energy: 5, Industrials: -25, "Real Estate": -30, Utilities: -12 },
  },
];

const PORTFOLIO: PortfolioPosition[] = [
  { symbol: "AAPL", name: "Apple Inc.", value: 45000, sector: "Technology", beta: 1.18 },
  { symbol: "MSFT", name: "Microsoft Corp.", value: 38000, sector: "Technology", beta: 1.05 },
  { symbol: "JPM", name: "JPMorgan Chase", value: 22000, sector: "Financials", beta: 1.15 },
  { symbol: "JNJ", name: "Johnson & Johnson", value: 18000, sector: "Healthcare", beta: 0.55 },
  { symbol: "XOM", name: "Exxon Mobil", value: 15000, sector: "Energy", beta: 0.92 },
  { symbol: "AMZN", name: "Amazon.com", value: 32000, sector: "Consumer", beta: 1.30 },
  { symbol: "CAT", name: "Caterpillar Inc.", value: 12000, sector: "Industrials", beta: 1.08 },
  { symbol: "PLD", name: "Prologis Inc.", value: 10000, sector: "Real Estate", beta: 0.85 },
  { symbol: "NEE", name: "NextEra Energy", value: 8000, sector: "Utilities", beta: 0.60 },
];

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

export default function ScenarioAnalyzer() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const totalPortfolioValue = useMemo(() => PORTFOLIO.reduce((s, p) => s + p.value, 0), []);

  const activeScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === selectedScenario) || null,
    [selectedScenario]
  );

  const positionImpacts = useMemo(() => {
    if (!activeScenario) return [];
    return PORTFOLIO.map((p) => {
      const sectorDrawdown = activeScenario.sectorImpact[p.sector] ?? activeScenario.drawdown;
      const adjustedDrawdown = sectorDrawdown * p.beta;
      const estimatedLoss = p.value * (adjustedDrawdown / 100);
      return {
        ...p,
        sectorDrawdown,
        adjustedDrawdown,
        estimatedLoss,
        newValue: p.value + estimatedLoss,
      };
    }).sort((a, b) => a.estimatedLoss - b.estimatedLoss);
  }, [activeScenario]);

  const totalEstimatedLoss = useMemo(
    () => positionImpacts.reduce((s, p) => s + p.estimatedLoss, 0),
    [positionImpacts]
  );

  const worstCaseDrawdown = useMemo(
    () => (totalPortfolioValue > 0 ? (totalEstimatedLoss / totalPortfolioValue) * 100 : 0),
    [totalEstimatedLoss, totalPortfolioValue]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <h2 className="text-sm font-semibold section-title">Scenario Stress Testing</h2>
        <p className="text-xs muted mt-0.5">
          Select a historical or hypothetical scenario to see how your portfolio would be impacted.
          Portfolio value: {formatMoney(totalPortfolioValue)}.
        </p>
      </div>

      {/* Scenario cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCENARIOS.map((scenario) => {
          const isActive = selectedScenario === scenario.id;
          return (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(isActive ? null : scenario.id)}
              className={`scenario-card rounded-2xl surface-glass dynamic-surface p-4 text-left transition-all fade-up ${
                isActive ? "border border-[var(--accent)] ring-1 ring-[var(--accent)]" : "hover:opacity-90"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs muted font-semibold">{scenario.year}</span>
                <span className={`text-xs font-bold ${scenario.drawdown <= -30 ? "text-[var(--negative)]" : scenario.drawdown <= -20 ? "text-[#f59e0b]" : "text-[var(--accent)]"}`}>
                  {scenario.drawdown}%
                </span>
              </div>
              <div className="text-sm font-semibold section-title mb-1">{scenario.name}</div>
              <p className="text-[10px] muted leading-relaxed line-clamp-2 mb-3">{scenario.description}</p>

              {/* Drawdown bar */}
              <div className="scenario-drawdown-bar h-2 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
                <div
                  className="scenario-drawdown-fill h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.abs(scenario.drawdown)}%`,
                    background: scenario.drawdown <= -30 ? "var(--negative)" : scenario.drawdown <= -20 ? "#f59e0b" : "var(--accent)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] muted">Recovery: {scenario.recoveryMonths}mo</span>
                <span className="text-[10px] muted">Drawdown</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Impact analysis */}
      {activeScenario && (
        <div className="space-y-4 fade-up">
          {/* Impact summary */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="scenario-impact rounded-xl control-surface p-3">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Estimated Portfolio Loss</div>
              <div className={`mt-1 text-lg font-semibold ${totalEstimatedLoss < 0 ? "scenario-negative text-[var(--negative)]" : "scenario-positive text-[var(--positive)]"}`}>
                {formatMoney(totalEstimatedLoss)}
              </div>
            </div>
            <div className="scenario-impact rounded-xl control-surface p-3">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Portfolio Drawdown</div>
              <div className={`mt-1 text-lg font-semibold ${worstCaseDrawdown < 0 ? "scenario-negative text-[var(--negative)]" : "scenario-positive text-[var(--positive)]"}`}>
                {worstCaseDrawdown.toFixed(1)}%
              </div>
            </div>
            <div className="scenario-impact rounded-xl control-surface p-3">
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Est. Recovery Time</div>
              <div className="mt-1 text-lg metric-value font-semibold">{activeScenario.recoveryMonths} months</div>
            </div>
          </div>

          {/* Per-position breakdown */}
          <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
            <h3 className="text-sm font-semibold section-title mb-3">
              Position Impact: {activeScenario.name}
            </h3>
            <div className="space-y-2">
              {positionImpacts.map((p) => (
                <div key={p.symbol} className="rounded-xl control-surface p-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-[100px]">
                    <div className="font-semibold text-sm section-title">{p.symbol}</div>
                    <div className="text-[10px] muted">{p.sector}</div>
                  </div>
                  <div className="text-center min-w-[80px]">
                    <div className="text-[10px] muted">Current</div>
                    <div className="text-xs metric-value font-semibold">{formatMoney(p.value)}</div>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="scenario-drawdown-bar h-2 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
                      <div
                        className="scenario-drawdown-fill h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Math.abs(p.adjustedDrawdown), 100)}%`,
                          background: p.adjustedDrawdown < -30 ? "var(--negative)" : p.adjustedDrawdown < -15 ? "#f59e0b" : p.adjustedDrawdown < 0 ? "var(--accent)" : "var(--positive)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-center min-w-[80px]">
                    <div className="text-[10px] muted">Impact</div>
                    <div className={`text-xs font-semibold ${p.estimatedLoss < 0 ? "scenario-negative text-[var(--negative)]" : "scenario-positive text-[var(--positive)]"}`}>
                      {p.estimatedLoss >= 0 ? "+" : ""}{formatMoney(p.estimatedLoss)}
                    </div>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <div className="text-[10px] muted">Drawdown</div>
                    <div className={`text-xs font-semibold ${p.adjustedDrawdown < 0 ? "text-[var(--negative)]" : "text-[var(--positive)]"}`}>
                      {p.adjustedDrawdown >= 0 ? "+" : ""}{p.adjustedDrawdown.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Most vulnerable */}
            <div className="mt-4 rounded-xl control-surface p-3">
              <div className="text-xs font-semibold section-title mb-1">Most Vulnerable Positions</div>
              <div className="text-xs muted">
                {positionImpacts.slice(0, 3).map((p, i) => (
                  <span key={p.symbol}>
                    {i > 0 && ", "}
                    <strong>{p.symbol}</strong> ({p.adjustedDrawdown.toFixed(1)}%)
                  </span>
                ))}
                {" "} are most at risk in this scenario due to high sector exposure and beta.
              </div>
            </div>
          </div>
        </div>
      )}

      {!activeScenario && (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center fade-up">
          <p className="muted text-sm">Select a scenario above to see the projected impact on your portfolio.</p>
        </div>
      )}
    </div>
  );
}
