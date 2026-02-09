"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart4,
  Layers3,
  RefreshCw,
  Sigma,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  buildAttributionResult,
  type AttributionResult,
  type HistoryBar,
} from "../lib/attribution-risk";
import type { PaperTradingLedger } from "../lib/paper-trading";

type QuoteInput = {
  price: number;
  changePct: number;
};

type AttributionRiskLabProps = {
  ledger: PaperTradingLedger;
  quotes: Record<string, QuoteInput>;
};

type HistorySource = "local" | "remote" | "synthetic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const BENCHMARK_SYMBOL = "QQQ";
const HISTORY_LIMIT = 252;

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function parseHistoryBars(raw: unknown): HistoryBar[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      const date = String(candidate.date ?? candidate.time ?? "").slice(0, 10);
      const close = Number(candidate.price ?? candidate.close ?? candidate.y ?? 0);
      return { date, close };
    })
    .filter((item) => item.date && Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-HISTORY_LIMIT);
}

function hashSymbol(symbol: string) {
  return symbol
    .split("")
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 17), 109);
}

function createSeededRng(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function syntheticHistory(symbol: string, bars: number): HistoryBar[] {
  const seed = hashSymbol(symbol);
  const random = createSeededRng(seed);
  const count = Math.max(100, bars);
  const baseline = 55 + (seed % 280);
  const start = Date.now() - count * 24 * 60 * 60 * 1000;
  let price = baseline;

  return Array.from({ length: count }, (_, idx) => {
    const drift = (random() - 0.47) * 0.01;
    const wave = Math.sin(idx / 18) * 0.0045;
    price = Math.max(5, price * (1 + drift + wave));
    return {
      date: new Date(start + idx * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      close: Number(price.toFixed(2)),
    };
  });
}

async function fetchSymbolHistory(symbol: string): Promise<{
  symbol: string;
  bars: HistoryBar[];
  source: HistorySource;
  detail?: string;
}> {
  const normalized = normalizeSymbol(symbol);

  try {
    const response = await fetch(
      `/api/stocks/chart?symbol=${encodeURIComponent(normalized)}&limit=${HISTORY_LIMIT}`,
      { cache: "no-store" }
    );
    const payload = await response.json();
    const bars = parseHistoryBars(payload?.data ?? payload?.history ?? []);
    if (bars.length >= 80) {
      return { symbol: normalized, bars, source: "local" };
    }
  } catch {
    // Continue to remote fallback.
  }

  if (API_BASE) {
    try {
      const response = await fetch(
        `${API_BASE}/chart/${encodeURIComponent(normalized)}?range=1y`,
        { cache: "no-store" }
      );
      const payload = await response.json();
      const bars = parseHistoryBars(payload?.data ?? payload?.history ?? []);
      if (bars.length >= 80) {
        return { symbol: normalized, bars, source: "remote" };
      }
    } catch {
      // Continue to synthetic fallback.
    }
  }

  return {
    symbol: normalized,
    bars: syntheticHistory(normalized, HISTORY_LIMIT),
    source: "synthetic",
    detail: `${normalized}: synthetic history fallback active.`,
  };
}

function sourceLabel(source: HistorySource) {
  if (source === "local") return "Local API";
  if (source === "remote") return "Remote API";
  return "Synthetic";
}

function barWidth(value: number) {
  return `${Math.min(100, Math.abs(value) * 9)}%`;
}

export default function AttributionRiskLab({ ledger, quotes }: AttributionRiskLabProps) {
  const [historyBySymbol, setHistoryBySymbol] = useState<Record<string, HistoryBar[]>>({});
  const [historySource, setHistorySource] = useState<HistorySource>("local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const positionSymbols = useMemo(
    () =>
      [...new Set(ledger.positions.map((item) => normalizeSymbol(item.symbol)).filter(Boolean))]
        .sort(),
    [ledger.positions]
  );

  const refreshHistory = useCallback(async () => {
    if (!positionSymbols.length) {
      setHistoryBySymbol({});
      setError("");
      setNotice("");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const symbolsToLoad = [...positionSymbols, BENCHMARK_SYMBOL];
      const results = await Promise.all(symbolsToLoad.map((symbol) => fetchSymbolHistory(symbol)));

      const nextHistory: Record<string, HistoryBar[]> = {};
      const sourceSet = new Set<HistorySource>();
      const fallbackDetails: string[] = [];

      results.forEach((result) => {
        nextHistory[result.symbol] = result.bars;
        sourceSet.add(result.source);
        if (result.detail) fallbackDetails.push(result.detail);
      });

      setHistoryBySymbol(nextHistory);
      if (sourceSet.has("synthetic")) {
        setHistorySource("synthetic");
      } else if (sourceSet.has("remote")) {
        setHistorySource("remote");
      } else {
        setHistorySource("local");
      }

      if (fallbackDetails.length) {
        setNotice(fallbackDetails.slice(0, 3).join(" "));
      }
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "Unable to load history for risk decomposition."
      );
    } finally {
      setLoading(false);
    }
  }, [positionSymbols]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const analysis: AttributionResult | null = useMemo(() => {
    if (!ledger.positions.length) return null;
    if (!historyBySymbol[BENCHMARK_SYMBOL]) return null;

    return buildAttributionResult({
      positions: ledger.positions.map((position) => ({
        symbol: position.symbol,
        shares: position.shares,
        averagePrice: position.averagePrice,
        marketPrice:
          quotes[position.symbol]?.price && quotes[position.symbol].price > 0
            ? quotes[position.symbol].price
            : position.averagePrice,
      })),
      cash: ledger.cash,
      historyBySymbol,
      benchmarkSymbol: BENCHMARK_SYMBOL,
      timingOrders: ledger.orders
        .filter((item) => item.status === "filled" && item.fillPrice && item.quantity > 0)
        .map((item) => ({
          side: item.side,
          quantity: item.quantity,
          referencePrice: item.referencePrice,
          fillPrice: item.fillPrice ?? item.referencePrice,
        })),
    });
  }, [historyBySymbol, ledger.cash, ledger.orders, ledger.positions, quotes]);

  const worstScenario = useMemo(() => {
    if (!analysis?.stress.length) return null;
    return analysis.stress.reduce((worst, current) =>
      current.projectedPnl < worst.projectedPnl ? current : worst
    );
  }, [analysis]);

  if (!ledger.positions.length) {
    return (
      <section className="card-elevated rounded-xl p-4">
        <h3 className="section-title text-base flex items-center gap-2">
          <Sigma size={16} />
          Attribution + Risk Decomposition
        </h3>
        <p className="text-xs muted mt-2">
          Open paper positions to activate symbol/sector/factor attribution and stress testing.
        </p>
      </section>
    );
  }

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <Sigma size={16} />
          Attribution + Risk Decomposition
        </h3>
        <button
          onClick={refreshHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
        >
          <RefreshCw size={12} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p className="text-xs muted">
        Returns broken down by symbol, sector, factor, and timing decisions with scenario stress tests.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted flex items-center gap-1">
            <Layers3 size={12} />
            Position Value
          </div>
          <div className="mt-1 text-lg metric-value">
            {analysis ? formatMoney(analysis.summary.totalMarketValue) : "—"}
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted flex items-center gap-1">
            <TrendingUp size={12} />
            Position P/L
          </div>
          <div
            className={`mt-1 text-lg metric-value ${
              analysis && analysis.summary.totalPnl >= 0
                ? "text-[var(--positive)]"
                : "text-[var(--negative)]"
            }`}
          >
            {analysis ? formatMoney(analysis.summary.totalPnl) : "—"}
          </div>
          <div className="text-xs muted">
            {analysis ? formatPercent(analysis.summary.totalContributionPct) : ""}
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Weighted Beta (vs Nasdaq)</div>
          <div className="mt-1 text-lg metric-value">
            {analysis ? analysis.summary.weightedBeta.toFixed(2) : "—"}
          </div>
          <div className="text-xs muted">
            Benchmark {BENCHMARK_SYMBOL}:{" "}
            {analysis ? formatPercent(analysis.benchmark.returnPct) : "—"}
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Explained Factors</div>
          <div className="mt-1 text-lg metric-value">
            {analysis ? formatPercent(analysis.summary.explainedContributionPct) : "—"}
          </div>
          <div className="text-xs muted">
            Volatility {analysis ? analysis.summary.weightedVolatilityPct.toFixed(1) : "—"}%
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted flex items-center gap-1">
            <AlertTriangle size={12} />
            Worst Stress
          </div>
          <div
            className={`mt-1 text-lg metric-value ${
              worstScenario && worstScenario.projectedPnl >= 0
                ? "text-[var(--positive)]"
                : "text-[var(--negative)]"
            }`}
          >
            {worstScenario ? formatMoney(worstScenario.projectedPnl) : "—"}
          </div>
          <div className="text-xs muted">
            Data source: {sourceLabel(historySource)}
          </div>
        </div>
      </div>

      {analysis && (
        <div className="grid xl:grid-cols-[1.55fr_1fr] gap-4">
          <div className="space-y-4">
            <div className="card-elevated rounded-xl p-3">
              <div className="text-sm font-semibold section-title">Return By Symbol</div>
              <div className="mt-2 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs muted">
                    <tr>
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-left py-2">Sector</th>
                      <th className="text-right py-2">Weight</th>
                      <th className="text-right py-2">Return</th>
                      <th className="text-right py-2">Contribution</th>
                      <th className="text-right py-2">Beta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.symbols.map((row) => (
                      <tr key={row.symbol} className="border-t border-[var(--surface-border)]">
                        <td className="py-2 font-semibold">{row.symbol}</td>
                        <td className="py-2 text-xs muted">{row.sector}</td>
                        <td className="py-2 text-right metric-value">{row.weightPct.toFixed(1)}%</td>
                        <td
                          className={`py-2 text-right metric-value ${
                            row.returnPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                          }`}
                        >
                          {formatPercent(row.returnPct)}
                        </td>
                        <td
                          className={`py-2 text-right metric-value ${
                            row.contributionPct >= 0
                              ? "text-[var(--positive)]"
                              : "text-[var(--negative)]"
                          }`}
                        >
                          {formatPercent(row.contributionPct)}
                        </td>
                        <td className="py-2 text-right metric-value">{row.beta.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-sm font-semibold section-title">Return By Sector</div>
              <div className="mt-2 space-y-2">
                {analysis.sectors.map((sector) => (
                  <div key={sector.sector}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {sector.sector} • {sector.weightPct.toFixed(1)}%
                      </span>
                      <span
                        className={
                          sector.contributionPct >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }
                      >
                        {formatPercent(sector.contributionPct)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${
                          sector.contributionPct >= 0
                            ? "bg-[var(--positive)]"
                            : "bg-[var(--negative)]"
                        }`}
                        style={{ width: barWidth(sector.contributionPct) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-elevated rounded-xl p-3">
              <div className="text-sm font-semibold section-title flex items-center gap-1">
                <BarChart4 size={14} />
                Factor Decomposition
              </div>
              <div className="mt-2 space-y-2">
                {analysis.factors.map((factor) => (
                  <div key={factor.factor}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>{factor.factor}</span>
                      <span
                        className={
                          factor.contributionPct >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }
                      >
                        {formatPercent(factor.contributionPct)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${
                          factor.contributionPct >= 0
                            ? "bg-[var(--positive)]"
                            : "bg-[var(--negative)]"
                        }`}
                        style={{ width: barWidth(factor.contributionPct) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-sm font-semibold section-title flex items-center gap-1">
                <Timer size={14} />
                Timing Decisions
              </div>
              <div className="mt-2 space-y-2">
                {analysis.timing.map((timing) => (
                  <div key={timing.bucket} className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span>{timing.bucket}</span>
                      <span
                        className={
                          timing.contributionPct >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }
                      >
                        {formatPercent(timing.contributionPct)}
                      </span>
                    </div>
                    <div className="mt-1 muted">
                      {timing.count} observations • {formatMoney(timing.pnl)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated rounded-xl p-3">
              <div className="text-sm font-semibold section-title">Stress Tests</div>
              <div className="mt-2 space-y-2">
                {analysis.stress.map((scenario) => (
                  <div key={scenario.id} className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>{scenario.name}</span>
                      <span
                        className={
                          scenario.projectedPnl >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }
                      >
                        {formatMoney(scenario.projectedPnl)} ({formatPercent(scenario.projectedReturnPct)})
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] muted">
                      Shocked equity: {formatMoney(scenario.shockedEquity)}
                    </div>
                    <div className="mt-1 text-[11px] muted">
                      Top impacts:{" "}
                      {scenario.symbolImpacts
                        .map((item) => `${item.symbol} ${formatPercent(item.shockPct)}`)
                        .join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!analysis && (
        <div className="text-xs muted">
          Loading decomposition context...
        </div>
      )}
    </section>
  );
}
