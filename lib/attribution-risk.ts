"use client";

import sp500 from "../app/data/sp500.json";

export type AttributionPositionInput = {
  symbol: string;
  shares: number;
  averagePrice: number;
  marketPrice: number;
};

export type TimingOrderInput = {
  side: "buy" | "sell";
  quantity: number;
  referencePrice: number;
  fillPrice: number;
};

export type HistoryBar = {
  date: string;
  close: number;
};

export type SymbolContribution = {
  symbol: string;
  sector: string;
  shares: number;
  weightPct: number;
  marketValue: number;
  costBasis: number;
  pnl: number;
  returnPct: number;
  contributionPct: number;
  beta: number;
  momentumPct: number;
  volatilityPct: number;
  timingEdgePct: number;
};

export type SectorContribution = {
  sector: string;
  weightPct: number;
  pnl: number;
  contributionPct: number;
};

export type FactorContribution = {
  factor: string;
  contributionPct: number;
};

export type TimingContribution = {
  bucket: string;
  contributionPct: number;
  pnl: number;
  count: number;
};

export type StressSymbolImpact = {
  symbol: string;
  shockPct: number;
  pnl: number;
};

export type StressScenario = {
  id: string;
  name: string;
  projectedPnl: number;
  projectedReturnPct: number;
  shockedEquity: number;
  symbolImpacts: StressSymbolImpact[];
};

export type AttributionSummary = {
  totalMarketValue: number;
  totalCostBasis: number;
  totalPnl: number;
  weightedBeta: number;
  weightedVolatilityPct: number;
  totalContributionPct: number;
  explainedContributionPct: number;
};

export type AttributionResult = {
  symbols: SymbolContribution[];
  sectors: SectorContribution[];
  factors: FactorContribution[];
  timing: TimingContribution[];
  stress: StressScenario[];
  summary: AttributionSummary;
  benchmark: {
    symbol: string;
    returnPct: number;
  };
};

type BuildAttributionInput = {
  positions: AttributionPositionInput[];
  cash: number;
  historyBySymbol: Record<string, HistoryBar[]>;
  benchmarkSymbol: string;
  timingOrders?: TimingOrderInput[];
};

type Sp500Entry = {
  symbol: string;
  name: string;
};

const SYMBOL_NAME_MAP = Object.fromEntries(
  ((sp500 as unknown as Sp500Entry[]) || []).map((item) => [
    item.symbol.trim().toUpperCase(),
    item.name,
  ])
) as Record<string, string>;

const SECTOR_OVERRIDES: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  AVGO: "Technology",
  AMD: "Technology",
  INTC: "Technology",
  ORCL: "Technology",
  CSCO: "Technology",
  QCOM: "Technology",
  CRM: "Technology",
  ADBE: "Technology",
  AMZN: "Consumer Discretionary",
  TSLA: "Consumer Discretionary",
  HD: "Consumer Discretionary",
  MCD: "Consumer Discretionary",
  NKE: "Consumer Discretionary",
  TGT: "Consumer Discretionary",
  WMT: "Consumer Staples",
  COST: "Consumer Staples",
  PG: "Consumer Staples",
  KO: "Consumer Staples",
  PEP: "Consumer Staples",
  PM: "Consumer Staples",
  MO: "Consumer Staples",
  META: "Communication Services",
  GOOGL: "Communication Services",
  GOOG: "Communication Services",
  NFLX: "Communication Services",
  DIS: "Communication Services",
  VZ: "Communication Services",
  T: "Communication Services",
  XOM: "Energy",
  CVX: "Energy",
  SLB: "Energy",
  EOG: "Energy",
  MPC: "Energy",
  JPM: "Financials",
  BAC: "Financials",
  WFC: "Financials",
  C: "Financials",
  GS: "Financials",
  MS: "Financials",
  BLK: "Financials",
  SCHW: "Financials",
  V: "Financials",
  MA: "Financials",
  UNH: "Healthcare",
  LLY: "Healthcare",
  MRK: "Healthcare",
  ABBV: "Healthcare",
  PFE: "Healthcare",
  ABT: "Healthcare",
  AMGN: "Healthcare",
  DHR: "Healthcare",
  TMO: "Healthcare",
  CAT: "Industrials",
  HON: "Industrials",
  GE: "Industrials",
  UNP: "Industrials",
  RTX: "Industrials",
  DE: "Industrials",
  FDX: "Industrials",
  AMT: "Real Estate",
  PLD: "Real Estate",
  DUK: "Utilities",
  SO: "Utilities",
  NEE: "Utilities",
  XLU: "Utilities",
};

const RATES_SENSITIVITY_PER_100BPS: Record<string, number> = {
  Technology: -8,
  "Communication Services": -6,
  "Consumer Discretionary": -5,
  "Consumer Staples": -1.5,
  Financials: 3,
  Healthcare: -2.5,
  Industrials: -3,
  Materials: -3,
  Energy: -2,
  Utilities: -4,
  "Real Estate": -9,
  Unknown: -3,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function returnsFromHistory(history: HistoryBar[]) {
  const returns: number[] = [];
  for (let idx = 1; idx < history.length; idx += 1) {
    const prev = history[idx - 1].close;
    const current = history[idx].close;
    if (prev > 0) {
      returns.push((current - prev) / prev);
    }
  }
  return returns;
}

function totalReturnPct(history: HistoryBar[]) {
  if (history.length < 2) return 0;
  const first = history[0].close;
  const last = history[history.length - 1].close;
  if (first <= 0) return 0;
  return ((last - first) / first) * 100;
}

function momentumPct(history: HistoryBar[], lookback = 21) {
  if (history.length <= lookback) return 0;
  const start = history[history.length - lookback - 1].close;
  const end = history[history.length - 1].close;
  if (start <= 0) return 0;
  return ((end - start) / start) * 100;
}

function volatilityPct(history: HistoryBar[]) {
  const returns = returnsFromHistory(history);
  if (!returns.length) return 0;
  return std(returns) * Math.sqrt(252) * 100;
}

function sma(history: HistoryBar[], period: number) {
  if (history.length < period) return null;
  const slice = history.slice(-period);
  return mean(slice.map((item) => item.close));
}

function betaToBenchmark(asset: HistoryBar[], benchmark: HistoryBar[]) {
  const assetReturns = returnsFromHistory(asset);
  const benchmarkReturns = returnsFromHistory(benchmark);
  const n = Math.min(assetReturns.length, benchmarkReturns.length);
  if (n < 20) return 1;

  const x = assetReturns.slice(-n);
  const y = benchmarkReturns.slice(-n);
  const xMean = mean(x);
  const yMean = mean(y);

  let covariance = 0;
  let variance = 0;
  for (let idx = 0; idx < n; idx += 1) {
    covariance += (x[idx] - xMean) * (y[idx] - yMean);
    variance += (y[idx] - yMean) ** 2;
  }

  if (variance <= 1e-10) return 1;
  return clamp(covariance / variance, -2.5, 3.5);
}

function inferSectorFromName(name: string) {
  const lower = name.toLowerCase();

  if (
    /(bank|financial|insurance|capital|bancorp|payment|visa|mastercard|asset management)/.test(
      lower
    )
  ) {
    return "Financials";
  }
  if (/(energy|petroleum|oil|gas|resources|drilling)/.test(lower)) return "Energy";
  if (/(pharma|health|medical|biotech|laboratories|therapeutic|care)/.test(lower)) {
    return "Healthcare";
  }
  if (
    /(software|semiconductor|technology|systems|micro|digital|cloud|electronics|data)/.test(
      lower
    )
  ) {
    return "Technology";
  }
  if (/(communication|media|telecom|entertainment|internet|streaming|interactive)/.test(lower)) {
    return "Communication Services";
  }
  if (
    /(retail|restaurant|hotel|travel|automotive|auto|apparel|home depot|booking|marriott)/.test(
      lower
    )
  ) {
    return "Consumer Discretionary";
  }
  if (/(beverage|food|household|consumer|tobacco|grocery|pepsi|coca)/.test(lower)) {
    return "Consumer Staples";
  }
  if (
    /(industrial|aerospace|defense|rail|machinery|logistics|construction|airline|freight)/.test(
      lower
    )
  ) {
    return "Industrials";
  }
  if (/(utility|electric|power|water|renewable)/.test(lower)) return "Utilities";
  if (/(realty|properties|reit|estate)/.test(lower)) return "Real Estate";
  if (/(materials|chemical|mining|steel|paper)/.test(lower)) return "Materials";

  return "Unknown";
}

export function inferSector(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  if (SECTOR_OVERRIDES[normalized]) return SECTOR_OVERRIDES[normalized];
  const name = SYMBOL_NAME_MAP[normalized] || normalized;
  return inferSectorFromName(name);
}

export function buildAttributionResult(input: BuildAttributionInput): AttributionResult {
  const benchmark = input.historyBySymbol[input.benchmarkSymbol] || [];
  const benchmarkReturn = totalReturnPct(benchmark);

  const normalizedPositions = input.positions
    .map((item) => ({
      symbol: normalizeSymbol(item.symbol),
      shares: Math.max(0, Math.floor(item.shares)),
      averagePrice: Math.max(0, item.averagePrice),
      marketPrice: Math.max(0, item.marketPrice),
    }))
    .filter((item) => item.symbol && item.shares > 0 && item.marketPrice > 0 && item.averagePrice > 0);

  const totalMarketValue = normalizedPositions.reduce(
    (sum, item) => sum + item.marketPrice * item.shares,
    0
  );
  const totalCostBasis = normalizedPositions.reduce(
    (sum, item) => sum + item.averagePrice * item.shares,
    0
  );
  const totalPnl = totalMarketValue - totalCostBasis;

  const symbolRows: SymbolContribution[] = normalizedPositions
    .map((item) => {
      const history = input.historyBySymbol[item.symbol] || [];
      const sector = inferSector(item.symbol);
      const marketValue = item.marketPrice * item.shares;
      const costBasis = item.averagePrice * item.shares;
      const pnl = marketValue - costBasis;
      const weightPct = totalMarketValue > 0 ? (marketValue / totalMarketValue) * 100 : 0;
      const contributionPct = totalMarketValue > 0 ? (pnl / totalMarketValue) * 100 : 0;
      const returnPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      const timingBaseline = sma(history, 20);
      const timingEdgePct =
        timingBaseline && timingBaseline > 0
          ? ((timingBaseline - item.averagePrice) / timingBaseline) * 100
          : 0;

      return {
        symbol: item.symbol,
        sector,
        shares: item.shares,
        weightPct,
        marketValue: round(marketValue),
        costBasis: round(costBasis),
        pnl: round(pnl),
        returnPct,
        contributionPct,
        beta: betaToBenchmark(history, benchmark),
        momentumPct: momentumPct(history),
        volatilityPct: volatilityPct(history),
        timingEdgePct,
      };
    })
    .sort((a, b) => Math.abs(b.contributionPct) - Math.abs(a.contributionPct));

  const sectorAgg = symbolRows.reduce<
    Record<string, { marketValue: number; pnl: number }>
  >((acc, item) => {
    if (!acc[item.sector]) acc[item.sector] = { marketValue: 0, pnl: 0 };
    acc[item.sector].marketValue += item.marketValue;
    acc[item.sector].pnl += item.pnl;
    return acc;
  }, {});

  const sectors: SectorContribution[] = Object.entries(sectorAgg)
    .map(([sector, row]) => ({
      sector,
      weightPct: totalMarketValue > 0 ? (row.marketValue / totalMarketValue) * 100 : 0,
      pnl: round(row.pnl),
      contributionPct: totalMarketValue > 0 ? (row.pnl / totalMarketValue) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.contributionPct) - Math.abs(a.contributionPct));

  const marketFactor = symbolRows.reduce(
    (sum, item) =>
      sum + (item.weightPct / 100) * item.beta * benchmarkReturn,
    0
  );
  const momentumFactor = symbolRows.reduce(
    (sum, item) => sum + (item.weightPct / 100) * item.momentumPct * 0.25,
    0
  );
  const volatilityDrag = symbolRows.reduce(
    (sum, item) => sum + (item.weightPct / 100) * -Math.max(0, item.volatilityPct - 28) * 0.15,
    0
  );
  const ratesFactor = symbolRows.reduce((sum, item) => {
    const sensitivity = RATES_SENSITIVITY_PER_100BPS[item.sector] ?? RATES_SENSITIVITY_PER_100BPS.Unknown;
    return sum + (item.weightPct / 100) * sensitivity * 0.5;
  }, 0);

  const totalContributionPct =
    totalMarketValue > 0 ? (totalPnl / totalMarketValue) * 100 : 0;
  const explainedContributionPct =
    marketFactor + momentumFactor + volatilityDrag + ratesFactor;
  const idiosyncratic = totalContributionPct - explainedContributionPct;

  const factors: FactorContribution[] = [
    { factor: "Market Beta (vs Nasdaq)", contributionPct: marketFactor },
    { factor: "Momentum Tilt", contributionPct: momentumFactor },
    { factor: "Volatility Drag", contributionPct: volatilityDrag },
    { factor: "Rates Sensitivity (+50bps)", contributionPct: ratesFactor },
    { factor: "Selection Alpha (Residual)", contributionPct: idiosyncratic },
  ];

  const timingBuckets: Record<
    string,
    { contributionPct: number; pnl: number; count: number }
  > = {};

  const addTiming = (bucket: string, contributionPct: number, pnl: number) => {
    if (!timingBuckets[bucket]) {
      timingBuckets[bucket] = { contributionPct: 0, pnl: 0, count: 0 };
    }
    timingBuckets[bucket].contributionPct += contributionPct;
    timingBuckets[bucket].pnl += pnl;
    timingBuckets[bucket].count += 1;
  };

  symbolRows.forEach((item) => {
    const bucket =
      item.timingEdgePct >= 1.5
        ? "Early / Value Entries"
        : item.timingEdgePct <= -1.5
        ? "Late / Chasing Entries"
        : "Neutral Timing";
    addTiming(bucket, item.contributionPct, item.pnl);
  });

  const executionEdgeDollar = (input.timingOrders || []).reduce((sum, item) => {
    if (item.quantity <= 0 || item.fillPrice <= 0 || item.referencePrice <= 0) return sum;
    const edgePerShare =
      item.side === "buy"
        ? item.referencePrice - item.fillPrice
        : item.fillPrice - item.referencePrice;
    return sum + edgePerShare * item.quantity;
  }, 0);

  if (Math.abs(executionEdgeDollar) > 0.01) {
    addTiming(
      "Execution Quality (Fill vs Reference)",
      totalMarketValue > 0 ? (executionEdgeDollar / totalMarketValue) * 100 : 0,
      executionEdgeDollar
    );
  }

  const timing: TimingContribution[] = Object.entries(timingBuckets)
    .map(([bucket, row]) => ({
      bucket,
      contributionPct: row.contributionPct,
      pnl: round(row.pnl),
      count: row.count,
    }))
    .sort((a, b) => Math.abs(b.contributionPct) - Math.abs(a.contributionPct));

  const totalEquity = input.cash + totalMarketValue;

  const scenarioFromShock = (
    id: string,
    name: string,
    shockForSymbol: (row: SymbolContribution) => number
  ): StressScenario => {
    const impacts = symbolRows.map((row) => {
      const shockPct = shockForSymbol(row);
      const pnl = row.marketValue * (shockPct / 100);
      return {
        symbol: row.symbol,
        shockPct,
        pnl: round(pnl),
      };
    });

    const projectedPnl = impacts.reduce((sum, item) => sum + item.pnl, 0);
    const projectedReturnPct = totalEquity > 0 ? (projectedPnl / totalEquity) * 100 : 0;

    return {
      id,
      name,
      projectedPnl: round(projectedPnl),
      projectedReturnPct,
      shockedEquity: round(totalEquity + projectedPnl),
      symbolImpacts: impacts.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 5),
    };
  };

  const stress: StressScenario[] = [
    scenarioFromShock("nasdaq-down-8", "What If Nasdaq -8%?", (row) =>
      clamp(row.beta * -8, -30, 18)
    ),
    scenarioFromShock("rates-plus-50", "What If Rates +50bps?", (row) => {
      const sensitivity =
        RATES_SENSITIVITY_PER_100BPS[row.sector] ?? RATES_SENSITIVITY_PER_100BPS.Unknown;
      return sensitivity * 0.5;
    }),
    scenarioFromShock(
      "combo",
      "What If Nasdaq -8% and Rates +50bps?",
      (row) => {
        const rateSensitivity =
          RATES_SENSITIVITY_PER_100BPS[row.sector] ?? RATES_SENSITIVITY_PER_100BPS.Unknown;
        return clamp(row.beta * -8 + rateSensitivity * 0.5, -35, 20);
      }
    ),
  ];

  const weightedBeta = symbolRows.reduce(
    (sum, row) => sum + (row.weightPct / 100) * row.beta,
    0
  );
  const weightedVolatilityPct = symbolRows.reduce(
    (sum, row) => sum + (row.weightPct / 100) * row.volatilityPct,
    0
  );

  return {
    symbols: symbolRows,
    sectors,
    factors,
    timing,
    stress,
    summary: {
      totalMarketValue: round(totalMarketValue),
      totalCostBasis: round(totalCostBasis),
      totalPnl: round(totalPnl),
      weightedBeta,
      weightedVolatilityPct,
      totalContributionPct,
      explainedContributionPct,
    },
    benchmark: {
      symbol: input.benchmarkSymbol,
      returnPct: benchmarkReturn,
    },
  };
}
