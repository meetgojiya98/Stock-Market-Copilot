"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Layers,
  ListOrdered,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Target,
  Wallet,
  XCircle,
} from "lucide-react";
import AttributionRiskLab from "./AttributionRiskLab";
import BacktestingLab from "./BacktestingLab";
import { createLocalAlert, fetchWatchlistData } from "../lib/data-client";
import {
  cancelPaperOrder,
  fetchPaperTradingLedger,
  type PaperIdeaSource,
  type PaperOrder,
  type PaperOrderSide,
  type PaperOrderType,
  type PaperTradingLedger,
  refreshOpenPaperOrders,
  resetPaperTradingLedger,
  submitPaperOrder,
} from "../lib/paper-trading";

type WatchlistItem = {
  symbol: string;
};

type QuoteMeta = {
  price: number;
  changePct: number;
  asOf: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const ROADMAP_QUEUE = [
  { label: "Paper Trading + Order Simulator", state: "Live" },
  { label: "Strategy Backtesting Lab", state: "Live" },
  { label: "Attribution + Risk Decomposition", state: "Live" },
  { label: "AI Thesis Memory + Versioning", state: "Queued" },
  { label: "Automation Layer (No-Code Rules)", state: "Queued" },
  { label: "Broker Integrations", state: "Queued" },
  { label: "Collaboration + Sharing", state: "Queued" },
  { label: "PWA + Mobile Execution UX", state: "Queued" },
];

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
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

function formatTimestamp(value?: string) {
  if (!value) return "Pending";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function uniqueSymbols(ledger: PaperTradingLedger, watchlist: WatchlistItem[], activeSymbol: string) {
  const symbols = new Set<string>();
  watchlist.forEach((item) => symbols.add(item.symbol));
  ledger.positions.forEach((item) => symbols.add(item.symbol));
  ledger.orders.slice(0, 25).forEach((item) => symbols.add(item.symbol));
  if (activeSymbol) symbols.add(activeSymbol);
  return [...symbols].filter(Boolean).slice(0, 35);
}

async function fetchQuote(symbol: string): Promise<QuoteMeta> {
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
            asOf: new Date().toISOString(),
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
          asOf: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fallback below.
  }

  return {
    price: 0,
    changePct: 0,
    asOf: new Date().toISOString(),
  };
}

function statusClass(status: PaperOrder["status"]) {
  if (status === "filled") return "badge-positive";
  if (status === "open") return "badge-neutral";
  if (status === "cancelled") return "badge-neutral";
  return "badge-negative";
}

function sourceLabel(source: PaperIdeaSource) {
  if (source === "watchlist") return "Watchlist";
  if (source === "research") return "Research";
  return "Manual";
}

function sideClass(side: PaperOrderSide) {
  return side === "buy" ? "text-[var(--positive)]" : "text-[var(--negative)]";
}

export default function ExecutionHub() {
  const [ledger, setLedger] = useState<PaperTradingLedger | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteMeta>>({});
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<PaperOrderSide>("buy");
  const [orderType, setOrderType] = useState<PaperOrderType>("market");
  const [quantity, setQuantity] = useState("10");
  const [limitPrice, setLimitPrice] = useState("");
  const [baseSlippageBps, setBaseSlippageBps] = useState(8);
  const [ideaSource, setIdeaSource] = useState<PaperIdeaSource>("watchlist");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const ledgerRef = useRef<PaperTradingLedger | null>(null);
  const watchlistRef = useRef<WatchlistItem[]>([]);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    ledgerRef.current = ledger;
  }, [ledger]);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  const refreshQuotes = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return {} as Record<string, QuoteMeta>;

    const entries = await Promise.all(
      [...new Set(symbols.map((item) => normalizeSymbol(item)).filter(Boolean))]
        .slice(0, 35)
        .map(async (item) => [item, await fetchQuote(item)] as const)
    );

    const next = Object.fromEntries(entries);
    setQuotes((current) => ({
      ...current,
      ...next,
    }));

    return next;
  }, []);

  const syncMarketData = useCallback(async () => {
    const activeLedger = ledgerRef.current;
    if (!activeLedger) return;

    const activeSymbol = normalizeSymbol(symbolRef.current);
    const symbols = uniqueSymbols(activeLedger, watchlistRef.current, activeSymbol);
    const quoteMap = await refreshQuotes(symbols);
    const openOrderCount = activeLedger.orders.filter((item) => item.status === "open").length;

    if (!openOrderCount) return;

    const result = await refreshOpenPaperOrders(
      Object.fromEntries(Object.entries(quoteMap).map(([sym, meta]) => [sym, meta.price]))
    );
    ledgerRef.current = result.data;
    setLedger(result.data);

    if (result.filled || result.rejected) {
      const text = `Order simulator updated: ${result.filled} filled, ${result.rejected} rejected.`;
      setNotice(text);
      createLocalAlert("SIM", text, "execution");
    }
  }, [refreshQuotes]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setBusy(true);
      setError("");
      setNotice("");

      try {
        const token = localStorage.getItem("access_token") || undefined;
        const [watchlistResult, ledgerResult] = await Promise.all([
          fetchWatchlistData(token),
          fetchPaperTradingLedger(),
        ]);

        if (cancelled) return;

        setWatchlist(watchlistResult.data);
        watchlistRef.current = watchlistResult.data;
        setLedger(ledgerResult.data);
        ledgerRef.current = ledgerResult.data;

        const defaultSymbol = watchlistResult.data[0]?.symbol || symbolRef.current;
        if (defaultSymbol) {
          setSymbol(defaultSymbol);
          symbolRef.current = defaultSymbol;
        }

        if (watchlistResult.detail) {
          setNotice(`Watchlist switched to Local Mode: ${watchlistResult.detail}`);
        }

        await syncMarketData();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load execution workspace.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [syncMarketData]);

  useEffect(() => {
    if (!ledger) return;
    const interval = window.setInterval(() => {
      syncMarketData();
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [ledger, syncMarketData]);

  const activeSymbol = normalizeSymbol(symbol);
  const activeQuote = quotes[activeSymbol];

  const positionRows = useMemo(() => {
    if (!ledger) return [];
    return ledger.positions.map((row) => {
      const quote = quotes[row.symbol];
      const lastPrice = quote?.price && quote.price > 0 ? quote.price : row.averagePrice;
      const marketValue = lastPrice * row.shares;
      const costValue = row.averagePrice * row.shares;
      const unrealizedPnl = marketValue - costValue;
      return {
        ...row,
        lastPrice,
        marketValue,
        unrealizedPnl,
        dayChangePct: quote?.changePct ?? 0,
      };
    });
  }, [ledger, quotes]);

  const totalPositionValue = useMemo(
    () => positionRows.reduce((sum, row) => sum + row.marketValue, 0),
    [positionRows]
  );

  const totalUnrealized = useMemo(
    () => positionRows.reduce((sum, row) => sum + row.unrealizedPnl, 0),
    [positionRows]
  );

  const openOrders = useMemo(
    () => (ledger ? ledger.orders.filter((item) => item.status === "open") : []),
    [ledger]
  );

  const completedOrders = useMemo(
    () => (ledger ? ledger.orders.filter((item) => item.status !== "open") : []),
    [ledger]
  );

  const fillRate = useMemo(() => {
    if (!completedOrders.length) return 0;
    const filled = completedOrders.filter((item) => item.status === "filled").length;
    return (filled / completedOrders.length) * 100;
  }, [completedOrders]);

  const portfolioEquity = useMemo(() => {
    if (!ledger) return 0;
    return ledger.cash + totalPositionValue;
  }, [ledger, totalPositionValue]);

  const totalReturn = useMemo(() => {
    if (!ledger) return 0;
    return portfolioEquity - ledger.startingCash;
  }, [ledger, portfolioEquity]);

  const totalReturnPct = useMemo(() => {
    if (!ledger || ledger.startingCash <= 0) return 0;
    return (totalReturn / ledger.startingCash) * 100;
  }, [ledger, totalReturn]);

  const estimatedSlipDollar = useMemo(() => {
    const qty = Number(quantity);
    if (!activeQuote?.price || !Number.isFinite(qty) || qty <= 0) return 0;
    return (activeQuote.price * qty * baseSlippageBps) / 10_000;
  }, [activeQuote?.price, baseSlippageBps, quantity]);

  const handleRefresh = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await syncMarketData();
      setNotice("Execution workspace synced.");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh execution data.");
    } finally {
      setBusy(false);
    }
  };

  const handleSeedSymbol = async (seeded: string, source: PaperIdeaSource) => {
    const normalized = normalizeSymbol(seeded);
    if (!normalized) return;
    setSymbol(normalized);
    symbolRef.current = normalized;
    setIdeaSource(source);

    if (!quotes[normalized]) {
      const quote = await fetchQuote(normalized);
      setQuotes((current) => ({
        ...current,
        [normalized]: quote,
      }));
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setError("");
    const result = await cancelPaperOrder(orderId);
    ledgerRef.current = result.data;
    setLedger(result.data);

    if (!result.ok) {
      setError(result.detail || "Unable to cancel order.");
      return;
    }

    setNotice("Open order canceled.");
    createLocalAlert("SIM", "A paper order was canceled.", "execution");
  };

  const handleReset = async () => {
    if (!window.confirm("Reset the simulator ledger? This clears paper orders and positions.")) return;

    const result = await resetPaperTradingLedger();
    ledgerRef.current = result.data;
    setLedger(result.data);
    setNotice("Simulator reset to fresh capital.");
    setError("");
    createLocalAlert("SIM", "Paper trading ledger reset.", "execution");
  };

  const handleSubmitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ledger) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const normalizedSymbol = normalizeSymbol(symbol);
      const qty = Math.floor(Number(quantity));
      const parsedLimit = Number(limitPrice);

      if (!normalizedSymbol || qty <= 0) {
        setError("Enter a valid symbol and quantity.");
        return;
      }

      let reference = quotes[normalizedSymbol]?.price ?? 0;
      if (!reference) {
        const quote = await fetchQuote(normalizedSymbol);
        reference = quote.price;
        setQuotes((current) => ({
          ...current,
          [normalizedSymbol]: quote,
        }));
      }

      if (!reference || reference <= 0) {
        setError("Live quote unavailable. Try another symbol or refresh.");
        return;
      }

      const result = await submitPaperOrder({
        symbol: normalizedSymbol,
        side,
        quantity: qty,
        orderType,
        referencePrice: reference,
        ...(orderType === "limit" ? { limitPrice: parsedLimit } : {}),
        baseSlippageBps,
        ideaSource,
      });

      ledgerRef.current = result.data;
      setLedger(result.data);

      if (!result.ok) {
        setError(result.detail || "Order was rejected.");
      }

      if (result.order?.status === "filled") {
        const fillPrice = result.order.fillPrice ?? result.order.requestedPrice;
        const text = `Paper ${result.order.side.toUpperCase()} ${result.order.symbol} ${result.order.quantity} @ ${formatMoney(fillPrice)} filled.`;
        setNotice(text);
        createLocalAlert(result.order.symbol, text, "execution");
      } else if (result.order?.status === "open") {
        const text = `Limit order queued for ${result.order.symbol} (${result.order.quantity} shares).`;
        setNotice(text);
        createLocalAlert(result.order.symbol, text, "execution");
      } else if (result.order?.status === "rejected") {
        const text = result.order.reason || "Order rejected by simulator checks.";
        setError(text);
        createLocalAlert(result.order.symbol, `Paper order rejected: ${text}`, "critical");
      }

      await syncMarketData();
    } finally {
      setSubmitting(false);
    }
  };

  if (!ledger) {
    return (
      <div className="card-elevated rounded-xl p-4 text-sm muted">
        {busy ? "Loading execution workspace..." : "Execution workspace unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Paper Equity</div>
          <div className="mt-1 text-xl metric-value">{formatMoney(portfolioEquity)}</div>
          <div className={`text-xs mt-1 ${totalReturn >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {formatMoney(totalReturn)} ({formatPercent(totalReturnPct)})
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Cash Buffer</div>
          <div className="mt-1 text-xl metric-value">{formatMoney(ledger.cash)}</div>
          <div className="text-xs muted mt-1">Starting capital: {formatMoney(ledger.startingCash)}</div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">P/L Stack</div>
          <div className="mt-1 text-sm">
            <span className={totalUnrealized >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
              Unrealized {formatMoney(totalUnrealized)}
            </span>
          </div>
          <div className="text-xs mt-1">
            <span className={ledger.realizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
              Realized {formatMoney(ledger.realizedPnl)}
            </span>
          </div>
        </div>

        <div className="card-elevated rounded-xl p-3">
          <div className="text-xs muted">Execution Quality</div>
          <div className="mt-1 text-xl metric-value">{fillRate.toFixed(0)}%</div>
          <div className="text-xs muted mt-1">
            {openOrders.length} open / {completedOrders.length} completed
          </div>
        </div>
      </div>

      {(notice || error) && (
        <div
          className={`rounded-xl px-3 py-2 text-sm ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid xl:grid-cols-[1.55fr_1fr] gap-4">
        <div className="space-y-4">
          <section className="card-elevated rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="section-title flex items-center gap-2 text-base">
                <Target size={16} />
                Paper Order Ticket
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
                >
                  <RefreshCw size={13} />
                  Sync
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-3 py-1.5 text-xs"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              </div>
            </div>

            <p className="text-xs muted mt-1">
              Execute watchlist/research ideas into simulated fills with slippage and real-time P/L tracking.
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {watchlist.slice(0, 10).map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => handleSeedSymbol(item.symbol, "watchlist")}
                  className={`rounded-full px-2.5 py-1 text-xs border ${
                    normalizeSymbol(symbol) === item.symbol
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                      : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
                  }`}
                >
                  {item.symbol}
                </button>
              ))}
            </div>

            <form className="mt-4 grid sm:grid-cols-2 gap-3" onSubmit={handleSubmitOrder}>
              <label className="text-xs space-y-1">
                <div className="muted">Symbol</div>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  placeholder="AAPL"
                  required
                />
              </label>

              <label className="text-xs space-y-1">
                <div className="muted">Idea Source</div>
                <select
                  value={ideaSource}
                  onChange={(event) => setIdeaSource(event.target.value as PaperIdeaSource)}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                >
                  <option value="watchlist">Watchlist</option>
                  <option value="research">Research</option>
                  <option value="manual">Manual</option>
                </select>
              </label>

              <div className="text-xs space-y-1">
                <div className="muted">Side</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide("buy")}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                      side === "buy"
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "control-surface bg-white/80 dark:bg-black/25"
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("sell")}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                      side === "sell"
                        ? "border-red-400/50 bg-red-500/15 text-red-600 dark:text-red-300"
                        : "control-surface bg-white/80 dark:bg-black/25"
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <div className="muted">Order Type</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("market")}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                      orderType === "market"
                        ? "border-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_16%,transparent)]"
                        : "control-surface bg-white/80 dark:bg-black/25"
                    }`}
                  >
                    Market
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("limit")}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                      orderType === "limit"
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                        : "control-surface bg-white/80 dark:bg-black/25"
                    }`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              <label className="text-xs space-y-1">
                <div className="muted">Quantity</div>
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="text-xs space-y-1">
                <div className="muted">Limit Price {orderType === "market" ? "(optional)" : ""}</div>
                <input
                  value={limitPrice}
                  onChange={(event) => setLimitPrice(event.target.value)}
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                  placeholder={activeQuote?.price ? activeQuote.price.toFixed(2) : "0.00"}
                  disabled={orderType === "market"}
                  required={orderType === "limit"}
                />
              </label>

              <label className="text-xs space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="muted flex items-center gap-1">
                    <SlidersHorizontal size={13} />
                    Base Slippage
                  </span>
                  <span className="metric-value">{baseSlippageBps} bps</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={baseSlippageBps}
                  onChange={(event) => setBaseSlippageBps(Number(event.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </label>

              <div className="sm:col-span-2 rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="muted">Live quote</span>
                  <span>
                    {activeQuote?.price ? formatMoney(activeQuote.price) : "Unavailable"}{" "}
                    {activeQuote?.price ? `(${formatPercent(activeQuote.changePct)})` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="muted">Estimated slippage impact</span>
                  <span>{formatMoney(estimatedSlipDollar)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-70"
              >
                {side === "buy" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {submitting ? "Submitting..." : "Execute Paper Order"}
              </button>
            </form>
          </section>

          <section className="card-elevated rounded-xl p-4">
            <h3 className="section-title text-base flex items-center gap-2">
              <Wallet size={16} />
              Simulated Positions
            </h3>
            <p className="text-xs muted mt-1">Open long inventory with mark-to-market unrealized P/L.</p>

            <div className="mt-3 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs muted">
                  <tr>
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-right py-2">Shares</th>
                    <th className="text-right py-2">Avg</th>
                    <th className="text-right py-2">Last</th>
                    <th className="text-right py-2">Value</th>
                    <th className="text-right py-2">Unrealized</th>
                  </tr>
                </thead>
                <tbody>
                  {positionRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs muted">
                        No simulated positions yet.
                      </td>
                    </tr>
                  )}

                  {positionRows.map((row) => (
                    <tr key={row.symbol} className="border-t border-[var(--surface-border)]">
                      <td className="py-2 font-semibold">{row.symbol}</td>
                      <td className="py-2 text-right metric-value">{row.shares}</td>
                      <td className="py-2 text-right metric-value">{formatMoney(row.averagePrice)}</td>
                      <td className="py-2 text-right">
                        <div className="metric-value">{formatMoney(row.lastPrice)}</div>
                        <div className={`text-[11px] ${row.dayChangePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                          {formatPercent(row.dayChangePct)}
                        </div>
                      </td>
                      <td className="py-2 text-right metric-value">{formatMoney(row.marketValue)}</td>
                      <td className={`py-2 text-right metric-value ${row.unrealizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                        {formatMoney(row.unrealizedPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card-elevated rounded-xl p-4">
            <h3 className="section-title text-base flex items-center gap-2">
              <Clock3 size={15} />
              Open Orders
            </h3>
            <p className="text-xs muted mt-1">Queued limit orders that auto-fill when prices cross.</p>

            <ul className="mt-3 space-y-2">
              {openOrders.length === 0 && (
                <li className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs muted">
                  No open orders.
                </li>
              )}

              {openOrders.map((order) => (
                <li key={order.id} className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${sideClass(order.side)}`}>
                      {order.side.toUpperCase()} {order.symbol}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusClass(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs muted mt-1">
                    {order.quantity} shares @ {formatMoney(order.requestedPrice)} ({sourceLabel(order.ideaSource)})
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] muted">{formatTimestamp(order.createdAt)}</span>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-600 dark:text-red-300"
                    >
                      <XCircle size={11} />
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card-elevated rounded-xl p-4">
            <h3 className="section-title text-base flex items-center gap-2">
              <Layers size={15} />
              Build Queue
            </h3>
            <p className="text-xs muted mt-1">Shipped in sequence from top to bottom.</p>
            <ol className="mt-3 space-y-2">
              {ROADMAP_QUEUE.map((item, index) => (
                <li
                  key={item.label}
                  className={`rounded-lg px-3 py-2 text-sm border ${
                    index === 0
                      ? "border-emerald-400/50 bg-emerald-500/10"
                      : "border-[var(--surface-border)] bg-white/75 dark:bg-black/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{index + 1}. {item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        item.state === "Live" ? "badge-positive" : "badge-neutral"
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <section className="card-elevated rounded-xl p-4">
        <h3 className="section-title text-base flex items-center gap-2">
          <ListOrdered size={15} />
          Order Blotter
        </h3>
        <p className="text-xs muted mt-1">Recent paper executions with slippage and realized P/L.</p>

        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs muted">
              <tr>
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Order</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Requested</th>
                <th className="text-right py-2">Fill</th>
                <th className="text-right py-2">Slippage</th>
                <th className="text-right py-2">Realized</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs muted">
                    No paper orders yet.
                  </td>
                </tr>
              )}

              {ledger.orders.slice(0, 24).map((order) => (
                <tr key={order.id} className="border-t border-[var(--surface-border)]">
                  <td className="py-2 text-xs muted">{formatTimestamp(order.filledAt || order.createdAt)}</td>
                  <td className="py-2">
                    <span className={`font-semibold ${sideClass(order.side)}`}>
                      {order.side.toUpperCase()}
                    </span>{" "}
                    {order.symbol}
                    <span className="text-xs muted"> · {sourceLabel(order.ideaSource)}</span>
                  </td>
                  <td className="py-2 text-right metric-value">{order.quantity}</td>
                  <td className="py-2 text-right metric-value">{formatMoney(order.requestedPrice)}</td>
                  <td className="py-2 text-right metric-value">
                    {order.fillPrice ? formatMoney(order.fillPrice) : "—"}
                  </td>
                  <td className="py-2 text-right metric-value">{order.slippageBps.toFixed(2)} bps</td>
                  <td className={`py-2 text-right metric-value ${(order.realizedPnl ?? 0) >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {order.realizedPnl !== undefined ? formatMoney(order.realizedPnl) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusClass(order.status)}`}>
                      {order.status === "filled" && <CheckCircle2 size={10} className="inline mr-1" />}
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BacktestingLab
        watchlistSymbols={watchlist.map((item) => item.symbol)}
        defaultSymbol={activeSymbol || watchlist[0]?.symbol}
      />

      <AttributionRiskLab
        ledger={ledger}
        quotes={quotes}
      />
    </div>
  );
}
