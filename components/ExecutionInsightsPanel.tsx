"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, BarChart3, Gauge, TimerReset } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaperIdeaSource, PaperOrder, PaperTradingLedger } from "../lib/paper-trading";

type QuoteMeta = {
  price: number;
  changePct: number;
};

type ExecutionInsightsPanelProps = {
  ledger: PaperTradingLedger;
  quotes: Record<string, QuoteMeta>;
};

type SourceStatRow = {
  source: PaperIdeaSource;
  label: string;
  trades: number;
  winRate: number;
  pnl: number;
  avgSlip: number;
  expectancy: number;
};

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

function formatSource(source: PaperIdeaSource) {
  if (source === "research") return "Research";
  if (source === "watchlist") return "Watchlist";
  return "Manual";
}

function orderTimestamp(order: PaperOrder) {
  return Date.parse(order.filledAt || order.createdAt);
}

export default function ExecutionInsightsPanel({ ledger, quotes }: ExecutionInsightsPanelProps) {
  const filledOrders = useMemo(
    () =>
      ledger.orders
        .filter((order) => order.status === "filled")
        .sort((a, b) => orderTimestamp(a) - orderTimestamp(b)),
    [ledger.orders]
  );

  const metrics = useMemo(() => {
    if (!filledOrders.length) {
      return {
        winRate: 0,
        avgSlip: 0,
        expectancy: 0,
        profitFactor: 0,
        grossWin: 0,
        grossLoss: 0,
      };
    }

    let wins = 0;
    let slipTotal = 0;
    let pnlTotal = 0;
    let grossWin = 0;
    let grossLoss = 0;

    filledOrders.forEach((order) => {
      const pnl = order.realizedPnl ?? 0;
      pnlTotal += pnl;
      slipTotal += order.slippageBps;
      if (pnl > 0) {
        wins += 1;
        grossWin += pnl;
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl);
      }
    });

    const profitFactor =
      grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? grossWin : 0;

    return {
      winRate: (wins / filledOrders.length) * 100,
      avgSlip: slipTotal / filledOrders.length,
      expectancy: pnlTotal / filledOrders.length,
      profitFactor,
      grossWin,
      grossLoss,
    };
  }, [filledOrders]);

  const sourceStats = useMemo<SourceStatRow[]>(() => {
    const base: Record<PaperIdeaSource, SourceStatRow & { wins: number }> = {
      research: {
        source: "research",
        label: "Research",
        trades: 0,
        wins: 0,
        winRate: 0,
        pnl: 0,
        avgSlip: 0,
        expectancy: 0,
      },
      watchlist: {
        source: "watchlist",
        label: "Watchlist",
        trades: 0,
        wins: 0,
        winRate: 0,
        pnl: 0,
        avgSlip: 0,
        expectancy: 0,
      },
      manual: {
        source: "manual",
        label: "Manual",
        trades: 0,
        wins: 0,
        winRate: 0,
        pnl: 0,
        avgSlip: 0,
        expectancy: 0,
      },
    };

    filledOrders.forEach((order) => {
      const row = base[order.ideaSource];
      const pnl = order.realizedPnl ?? 0;
      row.trades += 1;
      row.pnl += pnl;
      row.avgSlip += order.slippageBps;
      if (pnl > 0) row.wins += 1;
    });

    return (Object.values(base) as Array<SourceStatRow & { wins: number }>)
      .map((row) => ({
        source: row.source,
        label: row.label,
        trades: row.trades,
        pnl: row.pnl,
        avgSlip: row.trades > 0 ? row.avgSlip / row.trades : 0,
        winRate: row.trades > 0 ? (row.wins / row.trades) * 100 : 0,
        expectancy: row.trades > 0 ? row.pnl / row.trades : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filledOrders]);

  const curve = useMemo(() => {
    let cumulative = 0;
    return filledOrders.map((order, index) => {
      const pnl = order.realizedPnl ?? 0;
      cumulative += pnl;
      return {
        idx: index + 1,
        pnl,
        cumulative,
      };
    });
  }, [filledOrders]);

  const symbolAttribution = useMemo(() => {
    const realizedBySymbol = new Map<string, number>();
    filledOrders.forEach((order) => {
      const current = realizedBySymbol.get(order.symbol) ?? 0;
      realizedBySymbol.set(order.symbol, current + (order.realizedPnl ?? 0));
    });

    const rows = ledger.positions.map((position) => {
      const markPrice =
        quotes[position.symbol]?.price && quotes[position.symbol].price > 0
          ? quotes[position.symbol].price
          : position.averagePrice;
      const unrealized = (markPrice - position.averagePrice) * position.shares;
      const realized = realizedBySymbol.get(position.symbol) ?? 0;
      return {
        symbol: position.symbol,
        realized,
        unrealized,
        net: realized + unrealized,
      };
    });

    const onlyRealizedSymbols = [...realizedBySymbol.entries()]
      .filter(([symbol]) => !rows.some((item) => item.symbol === symbol))
      .map(([symbol, realized]) => ({
        symbol,
        realized,
        unrealized: 0,
        net: realized,
      }));

    return [...rows, ...onlyRealizedSymbols]
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 8);
  }, [filledOrders, ledger.positions, quotes]);

  const timingEdge = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      trades: 0,
      pnl: 0,
    }));

    filledOrders.forEach((order) => {
      const timestamp = new Date(order.filledAt || order.createdAt);
      const hour = timestamp.getHours();
      const bucket = buckets[hour];
      bucket.trades += 1;
      bucket.pnl += order.realizedPnl ?? 0;
    });

    return buckets
      .filter((bucket) => bucket.trades > 0)
      .map((bucket) => ({
        slot: `${String(bucket.hour).padStart(2, "0")}:00`,
        trades: bucket.trades,
        pnlPerTrade: bucket.pnl / bucket.trades,
      }));
  }, [filledOrders]);

  const riskFlags = useMemo(() => {
    const flags: string[] = [];
    const positionMarketValue = ledger.positions.reduce((sum, position) => {
      const mark =
        quotes[position.symbol]?.price && quotes[position.symbol].price > 0
          ? quotes[position.symbol].price
          : position.averagePrice;
      return sum + mark * position.shares;
    }, 0);
    const equity = ledger.cash + positionMarketValue;

    const largestPositionPct = ledger.positions.length
      ? (Math.max(
          ...ledger.positions.map((position) => {
            const mark =
              quotes[position.symbol]?.price && quotes[position.symbol].price > 0
                ? quotes[position.symbol].price
                : position.averagePrice;
            return mark * position.shares;
          })
        ) /
          Math.max(1, positionMarketValue)) *
        100
      : 0;

    const openNotional = ledger.orders
      .filter((order) => order.status === "open")
      .reduce((sum, order) => sum + order.requestedPrice * order.quantity, 0);
    const openPressure = equity > 0 ? (openNotional / equity) * 100 : 0;

    if (largestPositionPct >= 42) {
      flags.push(`Concentration elevated: largest symbol is ${largestPositionPct.toFixed(1)}% of gross exposure.`);
    }
    if (openPressure >= 30) {
      flags.push(`Open-order pressure high: ${openPressure.toFixed(1)}% of equity is queued.`);
    }
    if (metrics.avgSlip >= 18) {
      flags.push(`Execution friction rising: average slippage is ${metrics.avgSlip.toFixed(1)} bps.`);
    }

    return flags;
  }, [ledger.cash, ledger.orders, ledger.positions, metrics.avgSlip, quotes]);

  const bestSource = sourceStats[0];
  const weakestSource = [...sourceStats].sort((a, b) => a.expectancy - b.expectancy)[0];

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <Gauge size={16} />
          Execution Insights
        </h3>
        <span className="text-xs rounded-full px-2 py-0.5 badge-neutral">
          {filledOrders.length} filled trades
        </span>
      </div>

      <p className="text-xs muted">
        Review execution quality by source, symbol, and timing to tighten playbook quality before live routing.
      </p>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted flex items-center gap-1">
            <Activity size={12} />
            Expectancy / Trade
          </div>
          <div className={`mt-1 text-lg metric-value ${metrics.expectancy >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {formatMoney(metrics.expectancy)}
          </div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Profit Factor</div>
          <div className="mt-1 text-lg metric-value">{metrics.profitFactor.toFixed(2)}</div>
          <div className="text-[11px] muted">
            Gross +{formatMoney(metrics.grossWin)} / -{formatMoney(metrics.grossLoss)}
          </div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Win Rate</div>
          <div className={`mt-1 text-lg metric-value ${metrics.winRate >= 50 ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>
            {formatPercent(metrics.winRate)}
          </div>
        </div>
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Avg Slippage</div>
          <div className={`mt-1 text-lg metric-value ${metrics.avgSlip <= 12 ? "text-[var(--positive)]" : metrics.avgSlip <= 20 ? "text-[var(--warning)]" : "text-[var(--negative)]"}`}>
            {metrics.avgSlip.toFixed(2)} bps
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-3">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-sm font-semibold section-title flex items-center gap-1.5">
            <BarChart3 size={14} />
            Source Quality
          </div>
          <div className="mt-2 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,122,140,0.18)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, key: string) => {
                    if (key === "pnl" || key === "expectancy") {
                      return [formatMoney(value), key === "pnl" ? "Net P/L" : "Expectancy"];
                    }
                    if (key === "avgSlip") {
                      return [`${value.toFixed(2)} bps`, "Avg Slippage"];
                    }
                    return [`${value.toFixed(2)}%`, "Win Rate"];
                  }}
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {sourceStats.map((row) => (
                    <Cell
                      key={row.source}
                      fill={row.pnl >= 0 ? "var(--accent-2)" : "var(--negative)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-2.5 py-1.5">
              <span className="muted">Best expectancy:</span>{" "}
              <span className="font-semibold">
                {bestSource ? `${bestSource.label} (${formatMoney(bestSource.expectancy)})` : "—"}
              </span>
            </div>
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-2.5 py-1.5">
              <span className="muted">Weakest source:</span>{" "}
              <span className="font-semibold">
                {weakestSource ? `${weakestSource.label} (${formatMoney(weakestSource.expectancy)})` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-sm font-semibold section-title flex items-center gap-1.5">
            <TimerReset size={14} />
            Cumulative Realized Curve
          </div>
          <div className="mt-2 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,122,140,0.18)" />
                <XAxis dataKey="idx" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, key: string) => [
                    formatMoney(value),
                    key === "cumulative" ? "Cumulative P/L" : "Trade P/L",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--accent)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="var(--accent-3)"
                  dot={false}
                  strokeWidth={1.2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.25fr_1fr] gap-3">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-sm font-semibold section-title">Symbol Contribution</div>
          <div className="mt-2 space-y-2">
            {symbolAttribution.length === 0 && (
              <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-2.5 py-2 text-xs muted">
                Place filled orders to unlock symbol-level attribution.
              </div>
            )}
            {symbolAttribution.map((row) => (
              <div
                key={row.symbol}
                className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-2.5 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.symbol}</span>
                  <span className={row.net >= 0 ? "text-[var(--positive)] metric-value" : "text-[var(--negative)] metric-value"}>
                    {formatMoney(row.net)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 muted">
                  <span>Realized {formatMoney(row.realized)}</span>
                  <span>Unrealized {formatMoney(row.unrealized)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-sm font-semibold section-title">Timing Edge</div>
          <div className="mt-2 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timingEdge}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,122,140,0.18)" />
                <XAxis dataKey="slot" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, key: string) => [
                    key === "pnlPerTrade" ? formatMoney(value) : value.toFixed(0),
                    key === "pnlPerTrade" ? "P/L per Trade" : "Trades",
                  ]}
                />
                <Bar dataKey="pnlPerTrade" radius={[5, 5, 0, 0]}>
                  {timingEdge.map((row) => (
                    <Cell
                      key={row.slot}
                      fill={row.pnlPerTrade >= 0 ? "var(--accent-2)" : "var(--negative)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5">
            {riskFlags.length === 0 && (
              <div className="rounded-lg border border-emerald-300/55 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                Risk posture stable. No immediate execution pressure flags.
              </div>
            )}
            {riskFlags.map((flag) => (
              <div
                key={flag}
                className="rounded-lg border border-amber-300/55 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle size={11} className="inline mr-1.5" />
                {flag}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-[11px] muted">
        Source legend:{" "}
        {(["research", "watchlist", "manual"] as PaperIdeaSource[])
          .map((source) => formatSource(source))
          .join(" · ")}
      </div>
    </section>
  );
}
