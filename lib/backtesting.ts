"use client";

export type EntryRule = "sma_cross" | "breakout";
export type ExitRule = "signal_reversal" | "sma_break" | "time_stop";

export type HistoricalBar = {
  date: string;
  close: number;
};

export type BacktestConfig = {
  symbol: string;
  initialCapital: number;
  lookbackBars: number;
  entryRule: EntryRule;
  exitRule: ExitRule;
  fastPeriod: number;
  slowPeriod: number;
  breakoutLookback: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskPerTradePct: number;
  maxPositionPct: number;
  maxHoldBars: number;
  slippageBps: number;
  feeBps: number;
};

export type BacktestTrade = {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  holdingBars: number;
  pnl: number;
  pnlPct: number;
  exitReason: string;
};

export type EquityPoint = {
  date: string;
  equity: number;
  drawdownPct: number;
};

export type BacktestMetrics = {
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  winRatePct: number;
  expectancy: number;
  expectancyPct: number;
  totalReturn: number;
  totalReturnPct: number;
  trades: number;
  wins: number;
  losses: number;
};

export type BacktestResult = {
  symbol: string;
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  startDate: string;
  endDate: string;
  bars: number;
};

type OpenPosition = {
  entryDate: string;
  entryIndex: number;
  entryPrice: number;
  shares: number;
  entryFee: number;
};

function toFinite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smaAt(series: HistoricalBar[], index: number, period: number): number | null {
  if (period <= 0 || index < period - 1) return null;
  let sum = 0;
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    sum += series[cursor].close;
  }
  return sum / period;
}

function highestClose(series: HistoricalBar[], fromIndex: number, toIndex: number) {
  let highest = -Infinity;
  for (let idx = fromIndex; idx <= toIndex; idx += 1) {
    highest = Math.max(highest, series[idx].close);
  }
  return highest;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function normalizeBars(raw: HistoricalBar[], lookbackBars: number): HistoricalBar[] {
  const cleaned = raw
    .map((row) => ({
      date: String(row.date),
      close: toFinite(row.close, 0),
    }))
    .filter((row) => row.date && row.close > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return cleaned.slice(-lookbackBars);
}

function entrySignal(series: HistoricalBar[], index: number, config: BacktestConfig): boolean {
  if (index <= 0) return false;
  const fast = smaAt(series, index, config.fastPeriod);
  const slow = smaAt(series, index, config.slowPeriod);
  const prevFast = smaAt(series, index - 1, config.fastPeriod);
  const prevSlow = smaAt(series, index - 1, config.slowPeriod);
  const close = series[index].close;

  if (config.entryRule === "sma_cross") {
    if (fast === null || slow === null || prevFast === null || prevSlow === null) return false;
    return prevFast <= prevSlow && fast > slow;
  }

  if (index < config.breakoutLookback) return false;
  const breakoutHigh = highestClose(
    series,
    index - config.breakoutLookback,
    index - 1
  );

  if (fast === null || slow === null) {
    return close > breakoutHigh;
  }

  return close > breakoutHigh && fast > slow;
}

function exitSignal(
  series: HistoricalBar[],
  index: number,
  config: BacktestConfig
): boolean {
  if (index <= 0) return false;
  const fast = smaAt(series, index, config.fastPeriod);
  const slow = smaAt(series, index, config.slowPeriod);
  const prevFast = smaAt(series, index - 1, config.fastPeriod);
  const prevSlow = smaAt(series, index - 1, config.slowPeriod);
  const close = series[index].close;

  if (config.exitRule === "signal_reversal") {
    if (fast === null || slow === null || prevFast === null || prevSlow === null) return false;
    return prevFast >= prevSlow && fast < slow;
  }

  if (config.exitRule === "sma_break") {
    if (slow === null) return false;
    return close < slow;
  }

  return false;
}

function computeMetrics(
  initialCapital: number,
  finalEquity: number,
  equityCurve: EquityPoint[],
  trades: BacktestTrade[]
): BacktestMetrics {
  const totalReturn = finalEquity - initialCapital;
  const totalReturnPct = initialCapital > 0 ? (totalReturn / initialCapital) * 100 : 0;

  const bars = equityCurve.length;
  const years = bars > 0 ? bars / 252 : 0;
  const cagrPct =
    years > 0 && initialCapital > 0
      ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100
      : 0;

  const returns: number[] = [];
  for (let idx = 1; idx < equityCurve.length; idx += 1) {
    const prev = equityCurve[idx - 1].equity;
    const current = equityCurve[idx].equity;
    if (prev > 0) returns.push((current - prev) / prev);
  }
  const avgReturn =
    returns.length > 0
      ? returns.reduce((sum, value) => sum + value, 0) / returns.length
      : 0;
  const returnStd = stdDev(returns);
  const sharpe = returnStd > 0 ? (avgReturn / returnStd) * Math.sqrt(252) : 0;

  const wins = trades.filter((item) => item.pnl > 0).length;
  const losses = trades.filter((item) => item.pnl <= 0).length;
  const tradesCount = trades.length;
  const winRatePct = tradesCount > 0 ? (wins / tradesCount) * 100 : 0;

  const expectancy =
    tradesCount > 0
      ? trades.reduce((sum, item) => sum + item.pnl, 0) / tradesCount
      : 0;
  const expectancyPct =
    tradesCount > 0
      ? trades.reduce((sum, item) => sum + item.pnlPct, 0) / tradesCount
      : 0;

  const maxDrawdownPct =
    equityCurve.length > 0
      ? Math.abs(Math.min(...equityCurve.map((point) => point.drawdownPct)))
      : 0;

  return {
    cagrPct,
    maxDrawdownPct,
    sharpe,
    winRatePct,
    expectancy,
    expectancyPct,
    totalReturn,
    totalReturnPct,
    trades: tradesCount,
    wins,
    losses,
  };
}

export function defaultBacktestConfig(symbol: string): BacktestConfig {
  return {
    symbol: symbol.trim().toUpperCase() || "AAPL",
    initialCapital: 100_000,
    lookbackBars: 252,
    entryRule: "sma_cross",
    exitRule: "signal_reversal",
    fastPeriod: 20,
    slowPeriod: 50,
    breakoutLookback: 20,
    stopLossPct: 6,
    takeProfitPct: 12,
    riskPerTradePct: 1.5,
    maxPositionPct: 20,
    maxHoldBars: 45,
    slippageBps: 6,
    feeBps: 2,
  };
}

export function runBacktest(rawBars: HistoricalBar[], rawConfig: BacktestConfig): BacktestResult {
  const config: BacktestConfig = {
    ...rawConfig,
    symbol: rawConfig.symbol.trim().toUpperCase(),
    initialCapital: Math.max(1_000, toFinite(rawConfig.initialCapital, 100_000)),
    lookbackBars: Math.max(60, Math.floor(toFinite(rawConfig.lookbackBars, 252))),
    fastPeriod: Math.max(2, Math.floor(toFinite(rawConfig.fastPeriod, 20))),
    slowPeriod: Math.max(5, Math.floor(toFinite(rawConfig.slowPeriod, 50))),
    breakoutLookback: Math.max(5, Math.floor(toFinite(rawConfig.breakoutLookback, 20))),
    stopLossPct: clamp(toFinite(rawConfig.stopLossPct, 6), 0.2, 40),
    takeProfitPct: clamp(toFinite(rawConfig.takeProfitPct, 12), 0.2, 120),
    riskPerTradePct: clamp(toFinite(rawConfig.riskPerTradePct, 1.5), 0.1, 10),
    maxPositionPct: clamp(toFinite(rawConfig.maxPositionPct, 20), 1, 100),
    maxHoldBars: Math.max(2, Math.floor(toFinite(rawConfig.maxHoldBars, 45))),
    slippageBps: clamp(toFinite(rawConfig.slippageBps, 6), 0, 200),
    feeBps: clamp(toFinite(rawConfig.feeBps, 2), 0, 50),
  };

  if (config.fastPeriod >= config.slowPeriod) {
    config.fastPeriod = Math.max(2, config.slowPeriod - 1);
  }

  const bars = normalizeBars(rawBars, config.lookbackBars);

  if (bars.length < Math.max(config.slowPeriod + 5, 40)) {
    return {
      symbol: config.symbol,
      metrics: {
        cagrPct: 0,
        maxDrawdownPct: 0,
        sharpe: 0,
        winRatePct: 0,
        expectancy: 0,
        expectancyPct: 0,
        totalReturn: 0,
        totalReturnPct: 0,
        trades: 0,
        wins: 0,
        losses: 0,
      },
      trades: [],
      equityCurve: bars.map((item) => ({ date: item.date, equity: config.initialCapital, drawdownPct: 0 })),
      startDate: bars[0]?.date ?? "",
      endDate: bars[bars.length - 1]?.date ?? "",
      bars: bars.length,
    };
  }

  let cash = config.initialCapital;
  let position: OpenPosition | null = null;
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  const feeRate = config.feeBps / 10_000;
  const slipRate = config.slippageBps / 10_000;
  let peakEquity = config.initialCapital;

  const closePosition = (index: number, reason: string) => {
    if (!position) return;
    const close = bars[index].close;
    const exitPrice = close * (1 - slipRate);
    const grossProceeds = exitPrice * position.shares;
    const exitFee = grossProceeds * feeRate;
    cash += grossProceeds - exitFee;

    const grossPnl = (exitPrice - position.entryPrice) * position.shares;
    const netPnl = grossPnl - position.entryFee - exitFee;
    const costBasis = position.entryPrice * position.shares + position.entryFee;

    trades.push({
      entryDate: position.entryDate,
      exitDate: bars[index].date,
      entryPrice: roundMoney(position.entryPrice),
      exitPrice: roundMoney(exitPrice),
      shares: position.shares,
      holdingBars: Math.max(1, index - position.entryIndex),
      pnl: roundMoney(netPnl),
      pnlPct: costBasis > 0 ? (netPnl / costBasis) * 100 : 0,
      exitReason: reason,
    });

    position = null;
  };

  for (let index = 1; index < bars.length; index += 1) {
    const close = bars[index].close;

    if (position) {
      const stopTriggered = close <= position.entryPrice * (1 - config.stopLossPct / 100);
      const takeTriggered = close >= position.entryPrice * (1 + config.takeProfitPct / 100);
      const heldBars = index - position.entryIndex;
      const timedOut = config.exitRule === "time_stop" && heldBars >= config.maxHoldBars;
      const signalTriggered = exitSignal(bars, index, config);

      if (stopTriggered) {
        closePosition(index, "Stop Loss");
      } else if (takeTriggered) {
        closePosition(index, "Take Profit");
      } else if (timedOut) {
        closePosition(index, "Time Stop");
      } else if (signalTriggered) {
        closePosition(index, "Signal Reversal");
      }
    }

    if (!position && entrySignal(bars, index, config)) {
      const equity = cash;
      const entryPrice = close * (1 + slipRate);
      const stopDistance = Math.max(entryPrice * (config.stopLossPct / 100), entryPrice * 0.0025);
      const riskBudget = equity * (config.riskPerTradePct / 100);
      const riskSizedShares = Math.floor(riskBudget / stopDistance);
      const maxAllocationShares = Math.floor((equity * (config.maxPositionPct / 100)) / entryPrice);
      let shares = Math.min(riskSizedShares, maxAllocationShares);

      if (shares > 0) {
        const perShareWithFees = entryPrice * (1 + feeRate);
        const affordableShares = Math.floor(cash / perShareWithFees);
        shares = Math.min(shares, affordableShares);
      }

      if (shares > 0) {
        const grossCost = entryPrice * shares;
        const entryFee = grossCost * feeRate;
        cash -= grossCost + entryFee;
        position = {
          entryDate: bars[index].date,
          entryIndex: index,
          entryPrice,
          shares,
          entryFee,
        };
      }
    }

    const positionValue = position ? position.shares * close : 0;
    const equity = cash + positionValue;
    peakEquity = Math.max(peakEquity, equity);
    const drawdownPct = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : 0;

    equityCurve.push({
      date: bars[index].date,
      equity: roundMoney(equity),
      drawdownPct,
    });
  }

  if (position) {
    closePosition(bars.length - 1, "End Of Test");
    const close = bars[bars.length - 1].close;
    const equity = cash + (position ? position.shares * close : 0);
    peakEquity = Math.max(peakEquity, equity);
    const drawdownPct = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : 0;
    equityCurve.push({
      date: bars[bars.length - 1].date,
      equity: roundMoney(equity),
      drawdownPct,
    });
  }

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? cash;
  const metrics = computeMetrics(config.initialCapital, finalEquity, equityCurve, trades);

  return {
    symbol: config.symbol,
    metrics,
    trades: [...trades].reverse(),
    equityCurve,
    startDate: bars[0]?.date ?? "",
    endDate: bars[bars.length - 1]?.date ?? "",
    bars: bars.length,
  };
}
