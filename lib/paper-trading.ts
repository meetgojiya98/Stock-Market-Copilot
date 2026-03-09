"use client";

/* ─── Paper Trading Simulator ─── */

export type PaperPosition = {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
};

export type PaperOrder = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  type: "market" | "limit";
  status: "filled" | "pending" | "cancelled";
  timestamp: string;
};

export type PaperAccount = {
  balance: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  pnl: number;
  startingBalance: number;
};

const STORAGE_KEY = "zentrade_paper_trading_v1";
const STARTING_BALANCE = 100_000;

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

export function getMockPrice(symbol: string): number {
  if (MOCK_PRICES[symbol.toUpperCase()]) {
    return MOCK_PRICES[symbol.toUpperCase()];
  }
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) & 0xffffffff;
  }
  return 50 + (Math.abs(hash) % 400);
}

function defaultAccount(): PaperAccount {
  return {
    balance: STARTING_BALANCE,
    positions: [],
    orders: [],
    pnl: 0,
    startingBalance: STARTING_BALANCE,
  };
}

export function getPaperAccount(): PaperAccount {
  if (typeof window === "undefined") return defaultAccount();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const acct = defaultAccount();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acct));
    return acct;
  }
  return JSON.parse(raw);
}

function saveAccount(account: PaperAccount): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

export function resetPaperAccount(): PaperAccount {
  const acct = defaultAccount();
  saveAccount(acct);
  return acct;
}

export function executePaperOrder(order: {
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  type: "market" | "limit";
  limitPrice?: number;
}): { success: boolean; message: string; account: PaperAccount } {
  const account = getPaperAccount();
  const symbol = order.symbol.toUpperCase();
  const price =
    order.type === "limit" && order.limitPrice
      ? order.limitPrice
      : getMockPrice(symbol);

  const newOrder: PaperOrder = {
    id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    side: order.side,
    shares: order.shares,
    price,
    type: order.type,
    status: "filled",
    timestamp: new Date().toISOString(),
  };

  if (order.side === "buy") {
    const cost = price * order.shares;
    if (cost > account.balance) {
      newOrder.status = "cancelled";
      account.orders.unshift(newOrder);
      saveAccount(account);
      return {
        success: false,
        message: `Insufficient funds. Need $${cost.toFixed(2)}, have $${account.balance.toFixed(2)}.`,
        account,
      };
    }

    account.balance -= cost;

    const existing = account.positions.find((p) => p.symbol === symbol);
    if (existing) {
      const totalShares = existing.shares + order.shares;
      existing.avgCost =
        (existing.avgCost * existing.shares + price * order.shares) /
        totalShares;
      existing.shares = totalShares;
      existing.currentPrice = price;
    } else {
      account.positions.push({
        symbol,
        shares: order.shares,
        avgCost: price,
        currentPrice: price,
      });
    }
  } else {
    // sell
    const existing = account.positions.find((p) => p.symbol === symbol);
    if (!existing || existing.shares < order.shares) {
      newOrder.status = "cancelled";
      account.orders.unshift(newOrder);
      saveAccount(account);
      return {
        success: false,
        message: `Insufficient shares. Have ${existing?.shares ?? 0}, trying to sell ${order.shares}.`,
        account,
      };
    }

    account.balance += price * order.shares;
    existing.shares -= order.shares;

    if (existing.shares === 0) {
      account.positions = account.positions.filter(
        (p) => p.symbol !== symbol
      );
    }
  }

  account.orders.unshift(newOrder);
  account.pnl = calculatePnL(account);
  saveAccount(account);

  return {
    success: true,
    message: `${order.side === "buy" ? "Bought" : "Sold"} ${order.shares} shares of ${symbol} at $${price.toFixed(2)}.`,
    account,
  };
}

export function calculatePnL(account: PaperAccount): number {
  let unrealized = 0;
  for (const pos of account.positions) {
    const current = getMockPrice(pos.symbol);
    unrealized += (current - pos.avgCost) * pos.shares;
  }
  return unrealized;
}

export function getEquity(account: PaperAccount): number {
  let positionValue = 0;
  for (const pos of account.positions) {
    positionValue += getMockPrice(pos.symbol) * pos.shares;
  }
  return account.balance + positionValue;
}
