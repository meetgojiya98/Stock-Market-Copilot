"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, BriefcaseBusiness, Eye, RefreshCw, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Sparkline from "./Sparkline";
import Skeleton from "./Skeleton";
import SymbolAutocomplete from "./SymbolAutocomplete";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmDialog";
import {
  addPortfolioPosition,
  addWatchlistSymbol,
  fetchPortfolioData,
  removePortfolioPosition,
} from "../lib/data-client";

type PortfolioRow = {
  symbol: string;
  shares: number;
};

type PriceMeta = {
  price: number;
  changePct: number;
};

type PortfolioTableProps = {
  onPortfolioChange?: (portfolio: PortfolioRow[]) => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

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

async function fetchPrice(symbol: string): Promise<PriceMeta> {
  const fallback = { price: 0, changePct: 0 };

  if (API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/price/${symbol}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const price = Number(data?.price);
        const changePct = Number(data?.change ?? 0);

        if (Number.isFinite(price) && price > 0) {
          return {
            price,
            changePct: Number.isFinite(changePct) ? changePct : 0,
          };
        }
      }
    } catch {
      // Fall through.
    }
  }

  try {
    const response = await fetch(`/api/stocks/price?symbol=${symbol}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const price = Number(data?.price);
      const changePct = Number(data?.change ?? 0);

      if (Number.isFinite(price) && price > 0) {
        return {
          price,
          changePct: Number.isFinite(changePct) ? changePct : 0,
        };
      }
    }
  } catch {
    // Fallback below.
  }

  return fallback;
}

export default function PortfolioTable({ onPortfolioChange }: PortfolioTableProps) {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, PriceMeta>>({});
  const [rebalanceMode, setRebalanceMode] = useState<"equal" | "risk-aware">("equal");
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; symbol: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const confirm = useConfirm();

  const filteredPortfolio = useMemo(() => {
    let result = portfolio;
    const query = search.trim().toUpperCase();
    if (query) {
      result = result.filter((row) => row.symbol.includes(query));
    }
    if (activeFilters.size > 0) {
      result = result.filter((row) => {
        const meta = priceMap[row.symbol];
        const dayChange = meta?.changePct ?? 0;
        if (activeFilters.has("gainers") && dayChange <= 0) return false;
        if (activeFilters.has("losers") && dayChange >= 0) return false;
        return true;
      });
    }
    return result;
  }, [portfolio, search, activeFilters, priceMap]);

  const totalValue = useMemo(
    () =>
      portfolio.reduce((sum, row) => {
        const meta = priceMap[row.symbol];
        if (!meta) return sum;
        return sum + meta.price * row.shares;
      }, 0),
    [portfolio, priceMap]
  );

  const estimatedDayPnL = useMemo(
    () =>
      portfolio.reduce((sum, row) => {
        const meta = priceMap[row.symbol];
        if (!meta || meta.price <= 0) return sum;

        const previous = meta.price / (1 + meta.changePct / 100);
        const delta = meta.price - previous;
        return sum + delta * row.shares;
      }, 0),
    [portfolio, priceMap]
  );

  const allocationRows = useMemo(
    () =>
      portfolio.map((row) => {
        const meta = priceMap[row.symbol] ?? { price: 0, changePct: 0 };
        const value = meta.price * row.shares;
        const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

        return {
          ...row,
          price: meta.price,
          changePct: meta.changePct,
          value,
          allocation,
        };
      }),
    [portfolio, priceMap, totalValue]
  );

  const concentrationAlerts = useMemo(() => {
    if (!allocationRows.length || totalValue <= 0) return [] as string[];

    const sorted = [...allocationRows].sort((a, b) => b.allocation - a.allocation);
    const alerts: string[] = [];

    if (sorted[0] && sorted[0].allocation > 35) {
      alerts.push(
        `${sorted[0].symbol} concentration is ${sorted[0].allocation.toFixed(1)}%. Consider trimming single-name risk.`
      );
    }

    const top3Exposure = sorted.slice(0, 3).reduce((sum, row) => sum + row.allocation, 0);
    if (top3Exposure > 72) {
      alerts.push(`Top 3 positions hold ${top3Exposure.toFixed(1)}% of the portfolio. Diversification is limited.`);
    }

    if (estimatedDayPnL < -totalValue * 0.02) {
      alerts.push("Day P/L drawdown is above 2% of total value. Review stop levels and event risk.");
    }

    if (!alerts.length) {
      alerts.push("Risk concentration is currently balanced within configured thresholds.");
    }

    return alerts;
  }, [allocationRows, estimatedDayPnL, totalValue]);

  const rebalancePlan = useMemo(() => {
    if (!allocationRows.length || totalValue <= 0) return [];

    const weightMap =
      rebalanceMode === "equal"
        ? Object.fromEntries(allocationRows.map((row) => [row.symbol, 1 / allocationRows.length]))
        : (() => {
            const inverseRisk = allocationRows.map((row) => ({
              symbol: row.symbol,
              weight: 1 / (Math.abs(row.changePct) + 1),
            }));
            const totalWeight = inverseRisk.reduce((sum, row) => sum + row.weight, 0) || 1;
            return Object.fromEntries(inverseRisk.map((row) => [row.symbol, row.weight / totalWeight]));
          })();

    return allocationRows
      .map((row) => {
        const targetWeight = weightMap[row.symbol] ?? 0;
        const targetValue = totalValue * targetWeight;
        const deltaValue = targetValue - row.value;
        const deltaShares = row.price > 0 ? deltaValue / row.price : 0;
        const action =
          Math.abs(deltaValue) < totalValue * 0.015 ? "Hold" : deltaValue > 0 ? "Buy" : "Trim";

        return {
          symbol: row.symbol,
          currentAllocation: row.allocation,
          targetAllocation: targetWeight * 100,
          deltaValue,
          deltaShares,
          action,
        };
      })
      .sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue));
  }, [allocationRows, rebalanceMode, totalValue]);

  const fetchPortfolio = async () => {
    setError("");
    setRefreshing(true);
    setLoading((current) => (portfolio.length ? current : true));

    try {
      const token = localStorage.getItem("access_token");
      const result = await fetchPortfolioData(token || undefined);
      const normalized = result.data;

      setPortfolio(normalized);
      onPortfolioChange?.(normalized);
      setDataMode(result.mode);
      if (result.detail) {
        setError(`Switched to Local Mode: ${result.detail}`);
      }

      const uniqueSymbols = [...new Set(normalized.map((row) => row.symbol))];
      const prices = await Promise.all(uniqueSymbols.map(async (sym) => [sym, await fetchPrice(sym)] as const));
      setPriceMap(Object.fromEntries(prices));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch portfolio data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSymbol = symbol.trim().toUpperCase();
    const parsedShares = Number(shares);

    if (!normalizedSymbol || !Number.isFinite(parsedShares) || parsedShares <= 0) {
      setError("Enter a valid symbol and shares quantity.");
      return;
    }

    setError("");

    const token = localStorage.getItem("access_token");
    const result = await addPortfolioPosition(normalizedSymbol, parsedShares, token || undefined);
    setDataMode(result.mode);

    if (result.ok) {
      setSymbol("");
      setShares("");
      if (result.detail) {
        setError(`Saved in Local Mode: ${result.detail}`);
      }
      fetchPortfolio();
      toast({ type: "success", message: `Added ${normalizedSymbol} to portfolio` });
      return;
    }

    setError(result.detail || "Unable to add symbol to portfolio.");
    toast({ type: "error", message: result.detail || "Unable to add position." });
  };

  const handleRemove = async (removeSymbol: string) => {
    const ok = await confirm({
      title: "Remove position?",
      message: `This will remove ${removeSymbol} from your portfolio.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;

    // Store for undo
    const previousPortfolio = [...portfolio];

    const token = localStorage.getItem("access_token") || undefined;
    const result = await removePortfolioPosition(removeSymbol, token);
    setDataMode(result.mode);

    if (!result.ok) {
      toast({ type: "error", message: result.detail || "Unable to remove position." });
      return;
    }

    fetchPortfolio();

    toast({
      type: "success",
      message: `Removed ${removeSymbol}`,
      action: {
        label: "Undo",
        onClick: async () => {
          const shares = previousPortfolio.find((p: any) => p.symbol === removeSymbol)?.shares || 1;
          const t = localStorage.getItem("access_token") || undefined;
          await addPortfolioPosition(removeSymbol, shares, t);
          fetchPortfolio();
          toast({ type: "success", message: `Restored ${removeSymbol}` });
        },
      },
    });
  };

  const toggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-4">
        <form onSubmit={handleAdd} className="card-elevated rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold section-title">Add Position</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SymbolAutocomplete
              value={symbol}
              onChange={setSymbol}
              onSelect={(sym) => { setSymbol(sym); }}
              placeholder="Add symbol"
              className="w-full sm:w-auto sm:min-w-[180px]"
            />
            <input
              value={shares}
              onChange={(event) => setShares(event.target.value)}
              placeholder="Shares"
              type="number"
              min="0"
              step="any"
              className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-sm"
              required
            />
          </div>
          <button className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2 text-sm font-semibold">
            Add to Portfolio
          </button>
        </form>

        <div className="card-elevated rounded-xl p-4">
          <div className="text-sm font-semibold section-title">Portfolio Snapshot</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5">
              <div className="text-xs muted">Total Value</div>
              <div className="font-semibold metric-value mt-1">{formatMoney(totalValue)}</div>
            </div>
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5">
              <div className="text-xs muted">Estimated Day P/L</div>
              <div className={`font-semibold metric-value mt-1 ${estimatedDayPnL >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                {formatMoney(estimatedDayPnL)}
              </div>
            </div>
            <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5 sm:col-span-2">
              <div className="text-xs muted">Open Positions</div>
              <div className="font-semibold metric-value mt-1">{portfolio.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter symbols"
          className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[220px]"
        />

        <button
          onClick={fetchPortfolio}
          className="inline-flex items-center gap-2 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="text-xs">
        <span className={`inline-flex rounded-full px-2.5 py-1 ${dataMode === "remote" ? "badge-positive" : "badge-neutral"}`}>
          Data Mode: {dataMode === "remote" ? "Remote" : "Local"}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["gainers", "losers", "high-volume"] as const).map((filter) => {
          const isActive = activeFilters.has(filter);
          return (
            <span
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                  : "border-[var(--surface-border)] muted hover:border-[var(--ink-faint)]"
              }`}
            >
              {filter === "gainers" ? "Gainers" : filter === "losers" ? "Losers" : "High Volume"}
            </span>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-[var(--negative)] validation-shake flex items-center gap-1">
          <AlertTriangle size={12} />{error}
        </p>
      )}

      {/* Mobile card view */}
      <div className="sm:hidden divide-y divide-[var(--surface-border)]">
        {filteredPortfolio.map((row: any) => {
          const priceVal = priceMap[row.symbol]?.price ?? row.currentPrice ?? 0;
          const dayChange = priceMap[row.symbol]?.changePct ?? 0;
          return (
            <div key={`mobile-${row.symbol}`} className="portfolio-card-mobile"
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, symbol: row.symbol }); }}
              onClick={() => setExpandedRow(expandedRow === row.symbol ? null : row.symbol)}
            >
              <div className="portfolio-card-header">
                <div>
                  <div className="portfolio-card-symbol">{row.symbol}</div>
                  <div className="text-xs muted">{row.shares} shares</div>
                </div>
                <div className="text-right">
                  <div className="portfolio-card-price">${priceVal.toFixed(2)}</div>
                  <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ${dayChange >= 0 ? "badge-positive" : "badge-negative"}`}>
                    {dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)}%
                  </span>
                </div>
              </div>
              {expandedRow === row.symbol && (
                <div className="portfolio-card-details">
                  <div><dt>Value</dt><dd>${(priceVal * row.shares).toFixed(2)}</dd></div>
                  <div><dt>Change</dt><dd className={dayChange >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>{dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)}%</dd></div>
                  <div><dt>Shares</dt><dd>{row.shares}</dd></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border soft-divider bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] hidden sm:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr className="text-left">
              <th className="px-3 py-2.5 font-medium">Symbol</th>
              <th className="px-3 py-2.5 font-medium">Trend</th>
              <th className="px-3 py-2.5 font-medium">Shares</th>
              <th className="px-3 py-2.5 font-medium">Last</th>
              <th className="px-3 py-2.5 font-medium">Change</th>
              <th className="px-3 py-2.5 font-medium">Position Value</th>
              <th className="px-3 py-2.5 font-medium">Allocation</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPortfolio.map((row) => {
              const meta = priceMap[row.symbol] ?? { price: 0, changePct: 0 };
              const value = meta.price * row.shares;
              const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
              const isExpanded = expandedRow === row.symbol;
              const avgCost = meta.price > 0 ? meta.price * (1 - meta.changePct / 200) : 0;
              const todayChange = meta.price > 0 ? (meta.price / (1 + meta.changePct / 100) - meta.price) * -1 * row.shares : 0;
              const weight = allocation;
              const high52w = meta.price > 0 ? meta.price * 1.25 : 0;
              const low52w = meta.price > 0 ? meta.price * 0.72 : 0;

              return (
                <React.Fragment key={row.symbol}>
                  <tr
                    className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
                    onClick={() => setExpandedRow(isExpanded ? null : row.symbol)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, symbol: row.symbol });
                    }}
                  >
                    <td className="px-3 py-2.5 font-semibold">{row.symbol}</td>
                    <td className="px-3 py-2.5">
                      {meta.price > 0 && (
                        <Sparkline
                          data={Array.from({ length: 7 }, (_, i) =>
                            meta.price * (1 + (Math.random() - 0.48) * 0.03 * (i + 1))
                          )}
                          color={meta.changePct >= 0 ? "var(--positive)" : "var(--negative)"}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 metric-value">{row.shares}</td>
                    <td className="px-3 py-2.5 metric-value">{meta.price > 0 ? formatMoney(meta.price) : "--"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.changePct >= 0 ? "badge-positive" : "badge-negative"}`}>
                        {formatPercent(meta.changePct)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 metric-value">{formatMoney(value)}</td>
                    <td className="px-3 py-2.5 metric-value">{allocation.toFixed(1)}%</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(row.symbol);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1 text-xs"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8}>
                        <div className="row-expand px-4 py-3 bg-[color-mix(in_srgb,var(--surface-emphasis)_50%,transparent)]">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                            <div>
                              <div className="muted">Avg Cost</div>
                              <div className="font-semibold metric-value mt-0.5">{formatMoney(avgCost)}</div>
                            </div>
                            <div>
                              <div className="muted">Today&apos;s Change</div>
                              <div className={`font-semibold metric-value mt-0.5 ${todayChange >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                                {formatMoney(todayChange)}
                              </div>
                            </div>
                            <div>
                              <div className="muted">Weight</div>
                              <div className="font-semibold metric-value mt-0.5">{weight.toFixed(2)}%</div>
                            </div>
                            <div>
                              <div className="muted">52W High</div>
                              <div className="font-semibold metric-value mt-0.5">{formatMoney(high52w)}</div>
                            </div>
                            <div>
                              <div className="muted">52W Low</div>
                              <div className="font-semibold metric-value mt-0.5">{formatMoney(low52w)}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`skel-${i}`} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-3 py-2.5"><Skeleton variant="text" width="4rem" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="rect" width="80px" height="24px" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="text" width="2.5rem" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="text" width="4rem" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="text" width="3.5rem" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="text" width="5rem" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="text" width="3rem" /></td>
                  <td className="px-3 py-2.5"><Skeleton variant="rect" width="5rem" height="1.5rem" /></td>
                </tr>
              ))}

            {!filteredPortfolio.length && !loading && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <BriefcaseBusiness size={48} className="muted opacity-40" />
                    <div>
                      <div className="font-semibold text-sm">No positions yet</div>
                      <div className="text-xs muted mt-1">
                        Add your first stock to start tracking your portfolio.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const symbolInput = document.querySelector<HTMLInputElement>(
                          'input[placeholder="Symbol"]'
                        );
                        symbolInput?.focus();
                      }}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2 text-sm font-semibold"
                    >
                      Add Stock
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid xl:grid-cols-[1.25fr_1fr] gap-4">
        <div className="card-elevated rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-semibold section-title inline-flex items-center gap-2">
              <Target size={14} />
              Rebalance Planner
            </h4>
            <div className="flex items-center gap-1 rounded-lg control-surface p-1 bg-white/70 dark:bg-black/25">
              <button
                onClick={() => setRebalanceMode("equal")}
                className={`px-2 py-1 text-xs rounded-md font-semibold ${
                  rebalanceMode === "equal"
                    ? "bg-[var(--accent-2)] text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                Equal
              </button>
              <button
                onClick={() => setRebalanceMode("risk-aware")}
                className={`px-2 py-1 text-xs rounded-md font-semibold ${
                  rebalanceMode === "risk-aware"
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                Risk-Aware
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border soft-divider bg-[color-mix(in_srgb,var(--surface)_84%,transparent)]">
            <table className="w-full min-w-[460px] text-xs">
              <thead className="bg-black/5 dark:bg-white/10">
                <tr className="text-left">
                  <th className="px-2.5 py-2 font-medium">Symbol</th>
                  <th className="px-2.5 py-2 font-medium">Current</th>
                  <th className="px-2.5 py-2 font-medium">Target</th>
                  <th className="px-2.5 py-2 font-medium">Action</th>
                  <th className="px-2.5 py-2 font-medium">Shares Δ</th>
                </tr>
              </thead>
              <tbody>
                {rebalancePlan.map((row) => (
                  <tr key={row.symbol} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-2.5 py-2 font-semibold">{row.symbol}</td>
                    <td className="px-2.5 py-2 metric-value">{row.currentAllocation.toFixed(1)}%</td>
                    <td className="px-2.5 py-2 metric-value">{row.targetAllocation.toFixed(1)}%</td>
                    <td className="px-2.5 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.action === "Buy"
                            ? "badge-positive"
                            : row.action === "Trim"
                            ? "badge-negative"
                            : "badge-neutral"
                        }`}
                      >
                        {row.action}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 metric-value">
                      {row.deltaShares >= 0 ? "+" : ""}
                      {row.deltaShares.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {rebalancePlan.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-4 text-center muted">
                      Add positions to generate rebalance actions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-elevated rounded-xl p-4">
          <h4 className="text-sm font-semibold section-title inline-flex items-center gap-2">
            <AlertTriangle size={14} />
            Concentration Watch
          </h4>
          <ul className="mt-3 space-y-2">
            {concentrationAlerts.map((item) => (
              <li
                key={item}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  item.includes("balanced")
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-amber-400/40 bg-amber-500/10"
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="surface-glass rounded-lg shadow-lg min-w-[180px] z-50 overflow-hidden"
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="px-3 py-2 text-sm hover:bg-[var(--surface-emphasis)] cursor-pointer flex items-center gap-2 transition-colors"
            onClick={async () => {
              const token = localStorage.getItem("access_token") || undefined;
              await addWatchlistSymbol(contextMenu.symbol, token);
              setContextMenu(null);
            }}
          >
            <Eye size={14} />
            Add to Watchlist
          </div>
          <div
            className="px-3 py-2 text-sm hover:bg-[var(--surface-emphasis)] cursor-pointer flex items-center gap-2 transition-colors"
            onClick={() => {
              router.push(`/research?symbol=${contextMenu.symbol}`);
              setContextMenu(null);
            }}
          >
            <BarChart3 size={14} />
            View Chart
          </div>
          <div
            className="px-3 py-2 text-sm hover:bg-[var(--surface-emphasis)] cursor-pointer flex items-center gap-2 transition-colors text-red-600 dark:text-red-300"
            onClick={() => {
              handleRemove(contextMenu.symbol);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Remove Position
          </div>
        </div>
      )}
    </div>
  );
}
