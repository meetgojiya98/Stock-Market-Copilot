"use client";

/* ─── Multi-Portfolio Support ─── */

export type Position = {
  symbol: string;
  shares: number;
  avgCost: number;
};

export type Portfolio = {
  id: string;
  name: string;
  description: string;
  positions: Position[];
  createdAt: string;
  color: string;
};

const STORAGE_KEY = "zentrade_portfolios_v1";

const MOCK_PRICES: Record<string, number> = {
  AAPL: 189.84,
  MSFT: 378.91,
  GOOGL: 141.8,
  AMZN: 178.25,
  TSLA: 248.42,
  NVDA: 495.22,
  META: 390.42,
  JPM: 172.13,
  V: 275.48,
  JNJ: 156.74,
  NFLX: 476.3,
  DIS: 92.15,
  AMD: 124.68,
  INTC: 43.92,
  BA: 214.55,
  WMT: 162.38,
  KO: 59.87,
  PEP: 173.45,
  PYPL: 63.12,
  SQ: 72.34,
};

export function getMockCurrentPrice(symbol: string): number {
  if (MOCK_PRICES[symbol.toUpperCase()]) {
    return MOCK_PRICES[symbol.toUpperCase()];
  }
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) & 0xffffffff;
  }
  return 50 + (Math.abs(hash) % 400);
}

function defaultPortfolios(): Portfolio[] {
  return [
    {
      id: "portfolio_main",
      name: "Main Portfolio",
      description: "Primary long-term investment portfolio",
      positions: [
        { symbol: "AAPL", shares: 50, avgCost: 175.0 },
        { symbol: "MSFT", shares: 30, avgCost: 350.0 },
        { symbol: "NVDA", shares: 20, avgCost: 450.0 },
      ],
      createdAt: new Date().toISOString(),
      color: "#3b82f6",
    },
    {
      id: "portfolio_retirement",
      name: "Retirement",
      description: "Long-term retirement savings",
      positions: [
        { symbol: "V", shares: 40, avgCost: 260.0 },
        { symbol: "JNJ", shares: 60, avgCost: 150.0 },
        { symbol: "KO", shares: 100, avgCost: 55.0 },
      ],
      createdAt: new Date().toISOString(),
      color: "#10b981",
    },
    {
      id: "portfolio_daytrading",
      name: "Day Trading",
      description: "Short-term active trading positions",
      positions: [
        { symbol: "TSLA", shares: 15, avgCost: 240.0 },
        { symbol: "AMD", shares: 50, avgCost: 120.0 },
      ],
      createdAt: new Date().toISOString(),
      color: "#f59e0b",
    },
  ];
}

export function getPortfolios(): Portfolio[] {
  if (typeof window === "undefined") return defaultPortfolios();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const defaults = defaultPortfolios();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(raw);
}

export function savePortfolio(portfolio: Portfolio): void {
  const portfolios = getPortfolios();
  const idx = portfolios.findIndex((p) => p.id === portfolio.id);
  if (idx >= 0) {
    portfolios[idx] = portfolio;
  } else {
    portfolios.push(portfolio);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
}

export function deletePortfolio(id: string): void {
  const portfolios = getPortfolios().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
}

export function addPosition(
  portfolioId: string,
  position: Position
): void {
  const portfolios = getPortfolios();
  const portfolio = portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return;

  const existing = portfolio.positions.find(
    (p) => p.symbol.toUpperCase() === position.symbol.toUpperCase()
  );
  if (existing) {
    const totalShares = existing.shares + position.shares;
    existing.avgCost =
      (existing.avgCost * existing.shares +
        position.avgCost * position.shares) /
      totalShares;
    existing.shares = totalShares;
  } else {
    portfolio.positions.push({
      ...position,
      symbol: position.symbol.toUpperCase(),
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
}

export function removePosition(
  portfolioId: string,
  symbol: string
): void {
  const portfolios = getPortfolios();
  const portfolio = portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return;
  portfolio.positions = portfolio.positions.filter(
    (p) => p.symbol.toUpperCase() !== symbol.toUpperCase()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
}

export function getPortfolioValue(
  portfolio: Portfolio
): {
  totalValue: number;
  totalCost: number;
  dayChange: number;
  totalPnL: number;
  totalPnLPercent: number;
} {
  let totalValue = 0;
  let totalCost = 0;

  for (const pos of portfolio.positions) {
    const price = getMockCurrentPrice(pos.symbol);
    totalValue += price * pos.shares;
    totalCost += pos.avgCost * pos.shares;
  }

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  // Mock day change as a small % of total value
  const dayChange = totalValue * 0.0042;

  return { totalValue, totalCost, dayChange, totalPnL, totalPnLPercent };
}
