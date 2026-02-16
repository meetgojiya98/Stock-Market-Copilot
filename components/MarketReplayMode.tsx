"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  FastForward,
  Gauge,
  Pause,
  Play,
  ShoppingCart,
  Square,
  StepForward,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PresetPeriod = {
  label: string;
  startDate: string;
  endDate: string;
};

type StockSnapshot = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
};

type PortfolioHolding = {
  symbol: string;
  shares: number;
  avgCost: number;
};

type TradeRecord = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  timestamp: string;
};

type ReplayState = "idle" | "playing" | "paused" | "stopped";

type Speed = 1 | 2 | 5 | 10 | 50;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRESET_PERIODS: PresetPeriod[] = [
  { label: "2008 Financial Crisis", startDate: "2008-09-01", endDate: "2009-03-31" },
  { label: "COVID Crash Mar 2020", startDate: "2020-02-19", endDate: "2020-04-30" },
  { label: "2021 Meme Stock Rally", startDate: "2021-01-01", endDate: "2021-03-31" },
  { label: "2022 Tech Selloff", startDate: "2022-01-03", endDate: "2022-06-30" },
];

const REPLAY_STOCKS = ["AAPL", "TSLA", "AMZN", "MSFT", "NVDA"];

const SPEEDS: Speed[] = [1, 2, 5, 10, 50];

const STARTING_CASH = 100_000;

const STORAGE_KEY = "smc_market_replay_state_v1";

/* ------------------------------------------------------------------ */
/*  Seeded RNG + price path                                            */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  return s.split("").reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 13), 211);
}

function createSeededRng(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function generatePricePath(
  symbol: string,
  startDate: string,
  totalSteps: number,
): number[] {
  const seed = hashString(symbol + startDate);
  const rng = createSeededRng(seed);

  const basePrices: Record<string, number> = {
    AAPL: 150,
    TSLA: 220,
    AMZN: 130,
    MSFT: 280,
    NVDA: 450,
  };
  let price = basePrices[symbol] ?? 100 + rng() * 300;
  const drift = -0.0002 + rng() * 0.0004;
  const vol = 0.015 + rng() * 0.025;
  const path: number[] = [price];

  for (let i = 1; i < totalSteps; i++) {
    const shock = (rng() + rng() + rng() - 1.5) * 2; // approximate normal
    price = price * Math.exp(drift + vol * shock);
    price = Math.max(price * 0.3, price); // floor at 30% of original
    path.push(+price.toFixed(2));
  }
  return path;
}

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function formatMoney(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function simulatedTime(step: number): string {
  const hour = 9 + Math.floor((step % 78) / 10);
  const minute = ((step % 78) % 10) * 6;
  const h = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MarketReplayMode() {
  /* ---- Period selection ---- */
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number | null>(null);
  const [customStart, setCustomStart] = useState("2020-01-02");
  const [customEnd, setCustomEnd] = useState("2020-06-30");
  const [useCustom, setUseCustom] = useState(false);

  /* ---- Replay state ---- */
  const [replayState, setReplayState] = useState<ReplayState>("idle");
  const [speed, setSpeed] = useState<Speed>(1);
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Portfolio ---- */
  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  /* ---- Derived dates ---- */
  const startDate = useMemo(() => {
    if (useCustom) return customStart;
    if (selectedPresetIdx !== null) return PRESET_PERIODS[selectedPresetIdx].startDate;
    return "2020-02-19";
  }, [useCustom, customStart, selectedPresetIdx]);

  const endDate = useMemo(() => {
    if (useCustom) return customEnd;
    if (selectedPresetIdx !== null) return PRESET_PERIODS[selectedPresetIdx].endDate;
    return "2020-04-30";
  }, [useCustom, customEnd, selectedPresetIdx]);

  const totalDays = useMemo(() => Math.max(1, daysBetween(startDate, endDate)), [startDate, endDate]);
  const tradingDays = useMemo(() => Math.max(1, Math.round(totalDays * 5 / 7)), [totalDays]);

  /* ---- Price paths ---- */
  const pricePaths = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const sym of REPLAY_STOCKS) {
      map[sym] = generatePricePath(sym, startDate, tradingDays);
    }
    return map;
  }, [startDate, tradingDays]);

  /* ---- Current snapshots ---- */
  const snapshots: StockSnapshot[] = useMemo(() => {
    const step = Math.min(currentStep, tradingDays - 1);
    return REPLAY_STOCKS.map((sym) => {
      const path = pricePaths[sym];
      const price = path[step];
      const prevPrice = step > 0 ? path[step - 1] : price;
      const change = +(price - prevPrice).toFixed(2);
      const changePct = prevPrice > 0 ? +((change / prevPrice) * 100).toFixed(2) : 0;
      return { symbol: sym, price, change, changePct };
    });
  }, [currentStep, pricePaths, tradingDays]);

  const currentDate = useMemo(() => {
    const calendarDay = Math.round((currentStep / Math.max(1, tradingDays - 1)) * totalDays);
    return addDays(startDate, calendarDay);
  }, [currentStep, tradingDays, totalDays, startDate]);

  /* ---- Portfolio value ---- */
  const portfolioValue = useMemo(() => {
    let value = cash;
    for (const h of holdings) {
      const snap = snapshots.find((s) => s.symbol === h.symbol);
      if (snap) value += h.shares * snap.price;
    }
    return value;
  }, [cash, holdings, snapshots]);

  const totalPnl = portfolioValue - STARTING_CASH;
  const totalPnlPct = (totalPnl / STARTING_CASH) * 100;
  const progress = tradingDays > 1 ? (currentStep / (tradingDays - 1)) * 100 : 0;

  /* ---- Replay controls ---- */
  const stopReplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setReplayState("stopped");
  }, []);

  const pauseReplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setReplayState("paused");
  }, []);

  const startReplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setReplayState("playing");
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= tradingDays - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setReplayState("stopped");
          return prev;
        }
        return prev + 1;
      });
    }, Math.max(20, 500 / speed));
  }, [speed, tradingDays]);

  const stepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, tradingDays - 1));
  }, [tradingDays]);

  const resetReplay = useCallback(() => {
    stopReplay();
    setCurrentStep(0);
    setCash(STARTING_CASH);
    setHoldings([]);
    setTrades([]);
    setReplayState("idle");
  }, [stopReplay]);

  /* ---- Speed change during play ---- */
  useEffect(() => {
    if (replayState === "playing") {
      startReplay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  /* ---- Cleanup ---- */
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ---- Load persisted state ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.holdings) setHoldings(saved.holdings);
        if (saved.trades) setTrades(saved.trades);
        if (typeof saved.cash === "number") setCash(saved.cash);
      }
    } catch { /* empty */ }
  }, []);

  /* ---- Persist on change ---- */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cash, holdings, trades }),
      );
    } catch { /* empty */ }
  }, [cash, holdings, trades]);

  /* ---- Trade actions ---- */
  const executeBuy = useCallback(
    (symbol: string, qty: number) => {
      const snap = snapshots.find((s) => s.symbol === symbol);
      if (!snap) return;
      const cost = snap.price * qty;
      if (cost > cash) return;
      setCash((prev) => +(prev - cost).toFixed(2));
      setHoldings((prev) => {
        const existing = prev.find((h) => h.symbol === symbol);
        if (existing) {
          const totalShares = existing.shares + qty;
          const totalCost = existing.avgCost * existing.shares + snap.price * qty;
          return prev.map((h) =>
            h.symbol === symbol
              ? { ...h, shares: totalShares, avgCost: +(totalCost / totalShares).toFixed(2) }
              : h,
          );
        }
        return [...prev, { symbol, shares: qty, avgCost: snap.price }];
      });
      setTrades((prev) => [
        {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          symbol,
          side: "buy",
          shares: qty,
          price: snap.price,
          timestamp: currentDate,
        },
        ...prev,
      ]);
    },
    [snapshots, cash, currentDate],
  );

  const executeSell = useCallback(
    (symbol: string, qty: number) => {
      const snap = snapshots.find((s) => s.symbol === symbol);
      if (!snap) return;
      const holding = holdings.find((h) => h.symbol === symbol);
      if (!holding || holding.shares < qty) return;
      const proceeds = snap.price * qty;
      setCash((prev) => +(prev + proceeds).toFixed(2));
      setHoldings((prev) => {
        const updated = prev.map((h) =>
          h.symbol === symbol ? { ...h, shares: h.shares - qty } : h,
        );
        return updated.filter((h) => h.shares > 0);
      });
      setTrades((prev) => [
        {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          symbol,
          side: "sell",
          shares: qty,
          price: snap.price,
          timestamp: currentDate,
        },
        ...prev,
      ]);
    },
    [snapshots, holdings, currentDate],
  );

  /* ---- Timeline scrubber drag ---- */
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineScrub = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setCurrentStep(Math.round(pct * (tradingDays - 1)));
    },
    [tradingDays],
  );

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Timer size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Market Replay Mode
          </span>
        </div>

        {/* ---- Preset periods ---- */}
        <div className="mb-4">
          <div className="text-xs muted mb-2 font-medium">Select Period</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {PRESET_PERIODS.map((p, idx) => (
              <button
                key={p.label}
                onClick={() => {
                  setSelectedPresetIdx(idx);
                  setUseCustom(false);
                  resetReplay();
                }}
                className={`text-xs rounded-lg px-3 py-2 border font-medium transition-colors ${
                  !useCustom && selectedPresetIdx === idx
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                    : "border-[var(--surface-border)] hover:border-[var(--accent)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ---- Custom date ---- */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setUseCustom(true);
                setSelectedPresetIdx(null);
                resetReplay();
              }}
              className={`text-xs rounded-lg px-3 py-2 border font-medium transition-colors ${
                useCustom
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              <Calendar size={12} className="inline mr-1" />
              Custom Range
            </button>
            {useCustom && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    resetReplay();
                  }}
                  className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs border border-[var(--surface-border)]"
                />
                <ChevronRight size={14} className="muted" />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value);
                    resetReplay();
                  }}
                  className="rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs border border-[var(--surface-border)]"
                />
              </>
            )}
          </div>
        </div>

        {/* ---- Speed selector ---- */}
        <div className="replay-controls flex flex-wrap items-center gap-3 mb-4">
          <div className="replay-speed-selector flex items-center gap-1">
            <Gauge size={13} className="muted mr-1" />
            <span className="text-[10px] muted uppercase tracking-wider mr-1">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`replay-speed-btn text-[11px] rounded-md px-2 py-1 font-semibold border transition-colors ${
                  speed === s
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]"
                    : "border-[var(--surface-border)] hover:border-[var(--accent)]"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* ---- Playback controls ---- */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => {
                if (replayState === "idle" || replayState === "stopped") {
                  if (currentStep >= tradingDays - 1) setCurrentStep(0);
                  startReplay();
                } else if (replayState === "paused") {
                  startReplay();
                }
              }}
              disabled={replayState === "playing"}
              className="replay-btn rounded-lg px-3 py-1.5 text-xs font-semibold border border-[var(--positive)] text-[var(--positive)] hover:bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] disabled:opacity-40 transition-colors"
            >
              <Play size={12} className="inline mr-1" />
              Play
            </button>
            <button
              onClick={pauseReplay}
              disabled={replayState !== "playing"}
              className="replay-btn rounded-lg px-3 py-1.5 text-xs font-semibold border border-[var(--warning,#f59e0b)] text-[var(--warning,#f59e0b)] hover:bg-[color-mix(in_srgb,var(--warning,#f59e0b)_12%,transparent)] disabled:opacity-40 transition-colors"
            >
              <Pause size={12} className="inline mr-1" />
              Pause
            </button>
            <button
              onClick={stopReplay}
              disabled={replayState === "idle" || replayState === "stopped"}
              className="replay-btn rounded-lg px-3 py-1.5 text-xs font-semibold border border-[var(--negative)] text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_12%,transparent)] disabled:opacity-40 transition-colors"
            >
              <Square size={12} className="inline mr-1" />
              Stop
            </button>
            <button
              onClick={stepForward}
              disabled={replayState === "playing" || currentStep >= tradingDays - 1}
              className="replay-btn rounded-lg px-3 py-1.5 text-xs font-semibold border border-[var(--surface-border)] hover:border-[var(--accent)] disabled:opacity-40 transition-colors"
            >
              <StepForward size={12} className="inline mr-1" />
              Step
            </button>
          </div>
        </div>

        {/* ---- Timeline scrubber ---- */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] muted mb-1">
            <span>{formatDateDisplay(startDate)}</span>
            <span className="font-semibold text-[var(--accent)]">
              {formatDateDisplay(currentDate)} &middot; {simulatedTime(currentStep)}
            </span>
            <span>{formatDateDisplay(endDate)}</span>
          </div>
          <div
            ref={timelineRef}
            className="replay-timeline relative h-3 rounded-full bg-[var(--surface-emphasis)] cursor-pointer"
            onClick={handleTimelineScrub}
          >
            <div
              className="replay-timeline-fill h-full rounded-full bg-[var(--accent)] transition-[width] duration-100"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
            <div
              className="replay-timeline-thumb absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--accent)] border-2 border-white dark:border-black shadow-md transition-[left] duration-100"
              style={{ left: `calc(${Math.min(100, progress)}% - 8px)` }}
            />
          </div>
          <div className="text-center text-[10px] muted mt-1">
            Day {currentStep + 1} of {tradingDays} trading days &middot; {progress.toFixed(0)}% complete
          </div>
        </div>
      </div>

      {/* ---- P&L Summary ---- */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
            Portfolio Simulator
          </span>
          <span className="ml-auto text-[10px] muted">Starting: {formatMoney(STARTING_CASH)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[10px] muted uppercase tracking-wider mb-1">Cash</div>
            <div className="text-sm font-bold">{formatMoney(cash)}</div>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[10px] muted uppercase tracking-wider mb-1">Portfolio Value</div>
            <div className="text-sm font-bold">{formatMoney(portfolioValue)}</div>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[10px] muted uppercase tracking-wider mb-1">Total P&L</div>
            <div className={`text-sm font-bold ${totalPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
              {formatMoney(totalPnl)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-[10px] muted uppercase tracking-wider mb-1">Return</div>
            <div className={`text-sm font-bold flex items-center gap-1 ${totalPnlPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
              {totalPnlPct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {formatPct(totalPnlPct)}
            </div>
          </div>
        </div>

        {/* ---- Stock prices + trade buttons ---- */}
        <div className="text-[10px] muted uppercase tracking-wider mb-2 font-semibold">Market Prices</div>
        <div className="space-y-2">
          {snapshots.map((snap) => {
            const holding = holdings.find((h) => h.symbol === snap.symbol);
            const holdingValue = holding ? holding.shares * snap.price : 0;
            const holdingPnl = holding ? (snap.price - holding.avgCost) * holding.shares : 0;
            return (
              <div
                key={snap.symbol}
                className="flex items-center gap-3 rounded-xl border border-[var(--surface-border)] p-3"
              >
                <div className="w-14">
                  <div className="text-sm font-bold">{snap.symbol}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{formatMoney(snap.price)}</div>
                  <div
                    className={`text-[11px] ${snap.change >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                  >
                    {snap.change >= 0 ? "+" : ""}
                    {snap.change.toFixed(2)} ({formatPct(snap.changePct)})
                  </div>
                </div>
                {holding && (
                  <div className="text-right mr-2">
                    <div className="text-[10px] muted">{holding.shares} shares</div>
                    <div className={`text-[11px] font-semibold ${holdingPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                      {formatMoney(holdingValue)} ({holdingPnl >= 0 ? "+" : ""}{formatMoney(holdingPnl)})
                    </div>
                  </div>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => executeBuy(snap.symbol, 10)}
                    disabled={cash < snap.price * 10}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold border border-[var(--positive)] text-[var(--positive)] hover:bg-[color-mix(in_srgb,var(--positive)_10%,transparent)] disabled:opacity-30 transition-colors"
                  >
                    <ShoppingCart size={10} className="inline mr-0.5" />
                    Buy 10
                  </button>
                  <button
                    onClick={() => executeSell(snap.symbol, 10)}
                    disabled={!holding || holding.shares < 10}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold border border-[var(--negative)] text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] disabled:opacity-30 transition-colors"
                  >
                    Sell 10
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Current Holdings ---- */}
      {holdings.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <FastForward size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Current Holdings
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--surface-border)]">
                  <th className="text-left py-2 pr-3 muted font-medium">Symbol</th>
                  <th className="text-right py-2 px-3 muted font-medium">Shares</th>
                  <th className="text-right py-2 px-3 muted font-medium">Avg Cost</th>
                  <th className="text-right py-2 px-3 muted font-medium">Current</th>
                  <th className="text-right py-2 px-3 muted font-medium">Value</th>
                  <th className="text-right py-2 pl-3 muted font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const snap = snapshots.find((s) => s.symbol === h.symbol);
                  const currentPrice = snap?.price ?? 0;
                  const value = h.shares * currentPrice;
                  const pnl = (currentPrice - h.avgCost) * h.shares;
                  return (
                    <tr key={h.symbol} className="border-b border-[var(--surface-border)] last:border-0">
                      <td className="py-2 pr-3 font-semibold">{h.symbol}</td>
                      <td className="py-2 px-3 text-right">{h.shares}</td>
                      <td className="py-2 px-3 text-right">{formatMoney(h.avgCost)}</td>
                      <td className="py-2 px-3 text-right">{formatMoney(currentPrice)}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatMoney(value)}</td>
                      <td className={`py-2 pl-3 text-right font-semibold ${pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                        {pnl >= 0 ? "+" : ""}{formatMoney(pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Trade History ---- */}
      {trades.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">
              Trade History ({trades.length} trades)
            </span>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {trades.slice(0, 30).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-xs rounded-lg border border-[var(--surface-border)] px-3 py-2"
              >
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    t.side === "buy"
                      ? "bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]"
                      : "bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] text-[var(--negative)]"
                  }`}
                >
                  {t.side}
                </span>
                <span className="font-semibold">{t.symbol}</span>
                <span className="muted">{t.shares} shares @ {formatMoney(t.price)}</span>
                <span className="ml-auto text-[10px] muted">{t.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
