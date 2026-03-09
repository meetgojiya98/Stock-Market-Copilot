"use client";

import AuthGuard from "../../components/AuthGuard";
import { useEffect, useState, useMemo } from "react";
import PortfolioTable from "../../components/PortfolioTable";
import PageShell from "../../components/PageShell";
import AgentSignalFeed from "../../components/agent/AgentSignalFeed";
import { useAgents } from "../../lib/agents/agent-store";
import { fetchPortfolioData } from "../../lib/data-client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Shield,
  BriefcaseBusiness,
} from "lucide-react";
import AllocationPieChart from "../../components/portfolio/AllocationPieChart";
import SectorBreakdown from "../../components/portfolio/SectorBreakdown";
import PerformanceChart from "../../components/portfolio/PerformanceChart";

type Holding = {
  symbol: string;
  shares: number;
  avgCost?: number;
  currentPrice?: number;
};

function readPortfolioHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    // Try the v2 key used by PortfolioSnapshot (has avgCost/currentPrice)
    const raw = localStorage.getItem("smc_portfolio_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      const list: Holding[] = Array.isArray(parsed) ? parsed : parsed?.holdings ?? [];
      return list.filter((h) => h.symbol && h.shares > 0);
    }
  } catch { /* ignore */ }

  try {
    // Fallback to local portfolio key (shares only)
    const raw = localStorage.getItem("smc_local_portfolio_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      return list
        .map((r: { symbol: string; shares: number }) => ({
          symbol: r.symbol,
          shares: r.shares,
        }))
        .filter((h: Holding) => h.symbol && h.shares > 0);
    }
  } catch { /* ignore */ }

  return [];
}

function computeStats(holdings: Holding[]) {
  let totalValue = 0;
  let totalCost = 0;

  for (const h of holdings) {
    const price = h.currentPrice ?? h.avgCost ?? 0;
    const cost = h.avgCost ?? price;
    totalValue += h.shares * price;
    totalCost += h.shares * cost;
  }

  const dayPnl = totalValue - totalCost;
  const dayPnlPct = totalCost > 0 ? (dayPnl / totalCost) * 100 : 0;

  // Unique sectors is unknowable from data, show unique symbols instead
  const positionCount = holdings.length;

  return { totalValue, dayPnl, dayPnlPct, positionCount };
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Array<{ symbol: string; shares: number }>>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const { signals } = useAgents();

  const portfolioSignals = signals.filter(
    (s) => s.agentId === "portfolio-guardian" || s.agentId === "risk-monitor"
  );

  const fetchPortfolio = async () => {
    const token = localStorage.getItem("access_token");
    const result = await fetchPortfolioData(token || undefined);
    setPortfolio(result.data as never[]);
  };

  useEffect(() => {
    fetchPortfolio();
    setHoldings(readPortfolioHoldings());
  }, []);

  // Re-read holdings when portfolio changes
  useEffect(() => {
    setHoldings(readPortfolioHoldings());
  }, [portfolio]);

  const stats = useMemo(() => computeStats(holdings), [holdings]);

  const hasData = holdings.length > 0 || portfolio.length > 0;

  const STATS = [
    {
      label: "Total Value",
      value: hasData ? formatCurrency(stats.totalValue) : "--",
      delta: hasData && stats.totalValue > 0 ? `${stats.positionCount} positions` : "No positions",
      up: true,
      icon: DollarSign,
      accent: "var(--accent-2)",
      bg: "color-mix(in srgb, var(--accent-2) 8%, transparent)",
    },
    {
      label: "Day P&L",
      value: hasData
        ? `${stats.dayPnl >= 0 ? "+" : ""}${formatCurrency(stats.dayPnl)}`
        : "--",
      delta: hasData
        ? `${stats.dayPnlPct >= 0 ? "+" : ""}${stats.dayPnlPct.toFixed(2)}%`
        : "--",
      up: stats.dayPnl >= 0,
      icon: stats.dayPnl >= 0 ? TrendingUp : TrendingDown,
      accent: stats.dayPnl >= 0 ? "var(--positive)" : "var(--negative)",
      bg: stats.dayPnl >= 0
        ? "color-mix(in srgb, var(--positive) 8%, transparent)"
        : "color-mix(in srgb, var(--negative) 8%, transparent)",
    },
    {
      label: "Positions",
      value: hasData ? `${Math.max(stats.positionCount, portfolio.length)}` : "0",
      delta: hasData
        ? `${new Set([...holdings.map((h) => h.symbol), ...portfolio.map((p) => p.symbol)]).size} symbols`
        : "No holdings",
      up: true,
      icon: PieChart,
      accent: "var(--accent-2)",
      bg: "color-mix(in srgb, var(--accent-2) 8%, transparent)",
    },
    {
      label: "Alerts",
      value: `${portfolioSignals.length}`,
      delta: portfolioSignals.length > 0 ? "Active" : "All clear",
      up: portfolioSignals.length === 0,
      icon: Shield,
      accent: portfolioSignals.length > 0 ? "var(--negative)" : "var(--positive)",
      bg: portfolioSignals.length > 0
        ? "color-mix(in srgb, var(--negative) 8%, transparent)"
        : "color-mix(in srgb, var(--positive) 8%, transparent)",
    },
  ];

  return (
    <AuthGuard>
      <PageShell
        title="Portfolio"
        subtitle="Agent-monitored positions with real-time risk signals"
      >
        <div className="space-y-4">
          {/* ── Stats Strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="stat-card relative overflow-hidden"
              >
                {/* Color-coded top accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: s.accent }}
                />
                {/* Subtle background tint */}
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{ background: s.bg }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="stat-card-label">{s.label}</span>
                    <div
                      className="p-1.5 rounded-lg"
                      style={{ background: s.bg }}
                    >
                      <s.icon size={13} style={{ color: s.accent }} />
                    </div>
                  </div>
                  <div className="stat-card-value">{s.value}</div>
                  <span className={`stat-card-delta ${s.up ? "up" : "down"}`}>
                    {s.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Empty State ── */}
          {!hasData && (
            <div className="glass-card p-10 text-center">
              <BriefcaseBusiness
                size={36}
                className="mx-auto mb-3 text-[var(--ink-muted)] opacity-50"
              />
              <h3 className="text-base font-semibold text-[var(--ink)] mb-1">
                No portfolio yet
              </h3>
              <p className="text-sm text-[var(--ink-muted)] max-w-sm mx-auto">
                Add your first position using the form below to start tracking
                your holdings with real-time agent monitoring.
              </p>
            </div>
          )}

          {/* ── Analytics ── */}
          {hasData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AllocationPieChart holdings={holdings} />
              <SectorBreakdown holdings={holdings} />
              <PerformanceChart holdings={holdings} />
            </div>
          )}

          {/* ── Main Content ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PortfolioTable onPortfolioChange={fetchPortfolio} />
            </div>
            <div>
              {/* Guardian Alerts header with icon and count badge */}
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-[var(--positive)]" />
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  Guardian Alerts
                </h3>
                {portfolioSignals.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white bg-[var(--negative)] shadow-sm">
                    {portfolioSignals.length}
                  </span>
                )}
              </div>
              <AgentSignalFeed signals={portfolioSignals} limit={10} />
            </div>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
