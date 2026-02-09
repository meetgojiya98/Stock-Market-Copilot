"use client";

export type PaperOrderSide = "buy" | "sell";
export type PaperOrderType = "market" | "limit";
export type PaperOrderStatus = "open" | "filled" | "rejected" | "cancelled";
export type PaperIdeaSource = "watchlist" | "research" | "manual";

export type PaperPosition = {
  symbol: string;
  shares: number;
  averagePrice: number;
};

export type PaperOrder = {
  id: string;
  symbol: string;
  side: PaperOrderSide;
  orderType: PaperOrderType;
  status: PaperOrderStatus;
  quantity: number;
  requestedPrice: number;
  referencePrice: number;
  fillPrice?: number;
  slippageBps: number;
  notional: number;
  createdAt: string;
  filledAt?: string;
  reason?: string;
  realizedPnl?: number;
  ideaSource: PaperIdeaSource;
};

export type PaperTradingLedger = {
  startingCash: number;
  cash: number;
  realizedPnl: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  updatedAt: string;
};

type PaperQueryResult<T> = {
  data: T;
  mode: "local";
  detail?: string;
};

type PaperMutationResult = {
  ok: boolean;
  mode: "local";
  detail?: string;
};

export type SubmitPaperOrderInput = {
  symbol: string;
  side: PaperOrderSide;
  quantity: number;
  orderType: PaperOrderType;
  referencePrice: number;
  limitPrice?: number;
  baseSlippageBps?: number;
  ideaSource?: PaperIdeaSource;
};

type LedgerCore = Pick<PaperTradingLedger, "startingCash" | "cash" | "realizedPnl" | "positions">;

const LEDGER_STORAGE_KEY = "smc_paper_trading_ledger_v1";
const DEFAULT_STARTING_CASH = 100_000;

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function toFinite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function roundBps(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function createDefaultLedger(startingCash: number = DEFAULT_STARTING_CASH): PaperTradingLedger {
  return {
    startingCash: roundPrice(startingCash),
    cash: roundPrice(startingCash),
    realizedPnl: 0,
    positions: [],
    orders: [],
    updatedAt: nowIso(),
  };
}

function sanitizePosition(input: unknown): PaperPosition | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Partial<PaperPosition>;
  const symbol = normalizeSymbol(String(candidate.symbol ?? ""));
  const shares = Math.floor(toFinite(candidate.shares) ?? 0);
  const averagePrice = roundPrice(toFinite(candidate.averagePrice) ?? 0);

  if (!symbol || shares <= 0 || averagePrice <= 0) return null;
  return { symbol, shares, averagePrice };
}

function normalizeStatus(value: unknown): PaperOrderStatus {
  if (value === "open" || value === "filled" || value === "rejected" || value === "cancelled") {
    return value;
  }
  return "rejected";
}

function normalizeSide(value: unknown): PaperOrderSide {
  return value === "sell" ? "sell" : "buy";
}

function normalizeOrderType(value: unknown): PaperOrderType {
  return value === "limit" ? "limit" : "market";
}

function normalizeIdeaSource(value: unknown): PaperIdeaSource {
  if (value === "watchlist" || value === "research" || value === "manual") return value;
  return "manual";
}

function sanitizeOrder(input: unknown): PaperOrder | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Partial<PaperOrder>;
  const symbol = normalizeSymbol(String(candidate.symbol ?? ""));
  const quantity = Math.floor(toFinite(candidate.quantity) ?? 0);
  const requestedPrice = roundPrice(toFinite(candidate.requestedPrice) ?? 0);
  const referencePrice = roundPrice(toFinite(candidate.referencePrice) ?? requestedPrice);
  const notional = roundPrice(toFinite(candidate.notional) ?? requestedPrice * quantity);
  const slippageBps = roundBps(Math.max(0, toFinite(candidate.slippageBps) ?? 0));
  const fillPriceRaw = toFinite(candidate.fillPrice);
  const realizedRaw = toFinite(candidate.realizedPnl);

  if (!symbol || quantity <= 0 || requestedPrice <= 0 || referencePrice <= 0) return null;

  return {
    id: String(candidate.id ?? `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    symbol,
    side: normalizeSide(candidate.side),
    orderType: normalizeOrderType(candidate.orderType),
    status: normalizeStatus(candidate.status),
    quantity,
    requestedPrice,
    referencePrice,
    ...(fillPriceRaw && fillPriceRaw > 0 ? { fillPrice: roundPrice(fillPriceRaw) } : {}),
    slippageBps,
    notional,
    createdAt: String(candidate.createdAt ?? nowIso()),
    ...(candidate.filledAt ? { filledAt: String(candidate.filledAt) } : {}),
    ...(candidate.reason ? { reason: String(candidate.reason) } : {}),
    ...(realizedRaw !== null ? { realizedPnl: roundPrice(realizedRaw) } : {}),
    ideaSource: normalizeIdeaSource(candidate.ideaSource),
  };
}

function sortOrders(orders: PaperOrder[]) {
  return [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function readLedger(): PaperTradingLedger {
  const fallback = createDefaultLedger();
  const raw = safeRead<Partial<PaperTradingLedger>>(LEDGER_STORAGE_KEY, fallback);
  const startingCash = roundPrice(Math.max(1000, toFinite(raw.startingCash) ?? DEFAULT_STARTING_CASH));
  const cash = roundPrice(toFinite(raw.cash) ?? startingCash);
  const realizedPnl = roundPrice(toFinite(raw.realizedPnl) ?? 0);
  const positions = Array.isArray(raw.positions)
    ? raw.positions.map((row) => sanitizePosition(row)).filter((row): row is PaperPosition => Boolean(row))
    : [];
  const orders = Array.isArray(raw.orders)
    ? sortOrders(raw.orders.map((row) => sanitizeOrder(row)).filter((row): row is PaperOrder => Boolean(row)))
    : [];

  return {
    startingCash,
    cash,
    realizedPnl,
    positions,
    orders,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
  };
}

function writeLedger(ledger: PaperTradingLedger) {
  safeWrite(LEDGER_STORAGE_KEY, {
    ...ledger,
    cash: roundPrice(ledger.cash),
    startingCash: roundPrice(ledger.startingCash),
    realizedPnl: roundPrice(ledger.realizedPnl),
    updatedAt: nowIso(),
    positions: ledger.positions
      .map((row) => sanitizePosition(row))
      .filter((row): row is PaperPosition => Boolean(row)),
    orders: sortOrders(
      ledger.orders.map((row) => sanitizeOrder(row)).filter((row): row is PaperOrder => Boolean(row))
    ),
  } satisfies PaperTradingLedger);
}

function cloneCore(ledger: PaperTradingLedger): LedgerCore {
  return {
    startingCash: ledger.startingCash,
    cash: ledger.cash,
    realizedPnl: ledger.realizedPnl,
    positions: ledger.positions.map((row) => ({ ...row })),
  };
}

function composeLedger(core: LedgerCore, orders: PaperOrder[]): PaperTradingLedger {
  return {
    ...core,
    cash: roundPrice(core.cash),
    realizedPnl: roundPrice(core.realizedPnl),
    positions: core.positions
      .map((row) => sanitizePosition(row))
      .filter((row): row is PaperPosition => Boolean(row)),
    orders: sortOrders(orders),
    updatedAt: nowIso(),
  };
}

function estimateSlippageBps(baseBps: number, quantity: number, referencePrice: number) {
  const qtyImpact = Math.log10(Math.max(1, quantity)) * 1.2;
  const notionalImpact = Math.log10(Math.max(1, (quantity * referencePrice) / 1000)) * 0.8;
  const noise = (Math.random() - 0.5) * baseBps * 0.35;
  return roundBps(Math.max(0, baseBps + qtyImpact + notionalImpact + noise));
}

function marketExecutionPrice(side: PaperOrderSide, referencePrice: number, slippageBps: number) {
  const slip = slippageBps / 10_000;
  const impacted = side === "buy" ? referencePrice * (1 + slip) : referencePrice * (1 - slip);
  return roundPrice(Math.max(0.01, impacted));
}

function limitExecutionPrice(side: PaperOrderSide, limitPrice: number, quotePrice: number, slippageBps: number) {
  const impacted = marketExecutionPrice(side, quotePrice, slippageBps);
  return side === "buy"
    ? roundPrice(Math.min(limitPrice, impacted))
    : roundPrice(Math.max(limitPrice, impacted));
}

function limitTriggered(side: PaperOrderSide, limitPrice: number, quotePrice: number) {
  if (side === "buy") return quotePrice <= limitPrice;
  return quotePrice >= limitPrice;
}

function rejectOrder(order: PaperOrder, reason: string): PaperOrder {
  return {
    ...order,
    status: "rejected",
    reason,
    filledAt: nowIso(),
  };
}

function settleFilledOrder(
  core: LedgerCore,
  order: PaperOrder,
  executionPrice: number
): {
  core: LedgerCore;
  order: PaperOrder;
} {
  const price = roundPrice(executionPrice);
  const notional = roundPrice(price * order.quantity);
  const nextCore: LedgerCore = {
    ...core,
    positions: core.positions.map((row) => ({ ...row })),
  };

  if (order.side === "buy") {
    if (nextCore.cash + 1e-6 < notional) {
      return { core: nextCore, order: rejectOrder(order, "Insufficient paper cash for this buy order.") };
    }

    const index = nextCore.positions.findIndex((row) => row.symbol === order.symbol);
    if (index >= 0) {
      const existing = nextCore.positions[index];
      const totalCost = existing.averagePrice * existing.shares + price * order.quantity;
      const nextShares = existing.shares + order.quantity;
      nextCore.positions[index] = {
        ...existing,
        shares: nextShares,
        averagePrice: roundPrice(totalCost / nextShares),
      };
    } else {
      nextCore.positions.unshift({
        symbol: order.symbol,
        shares: order.quantity,
        averagePrice: price,
      });
    }

    nextCore.cash = roundPrice(nextCore.cash - notional);
    return {
      core: nextCore,
      order: {
        ...order,
        status: "filled",
        fillPrice: price,
        notional,
        filledAt: nowIso(),
      },
    };
  }

  const index = nextCore.positions.findIndex((row) => row.symbol === order.symbol);
  if (index < 0) {
    return {
      core: nextCore,
      order: rejectOrder(order, "No simulated long position available to sell."),
    };
  }

  const existing = nextCore.positions[index];
  if (existing.shares < order.quantity) {
    return {
      core: nextCore,
      order: rejectOrder(order, "Sell size exceeds simulated position."),
    };
  }

  const remainingShares = existing.shares - order.quantity;
  const realized = roundPrice((price - existing.averagePrice) * order.quantity);

  if (remainingShares > 0) {
    nextCore.positions[index] = {
      ...existing,
      shares: remainingShares,
    };
  } else {
    nextCore.positions.splice(index, 1);
  }

  nextCore.realizedPnl = roundPrice(nextCore.realizedPnl + realized);
  nextCore.cash = roundPrice(nextCore.cash + notional);

  return {
    core: nextCore,
    order: {
      ...order,
      status: "filled",
      fillPrice: price,
      notional,
      filledAt: nowIso(),
      realizedPnl: realized,
    },
  };
}

export async function fetchPaperTradingLedger(): Promise<PaperQueryResult<PaperTradingLedger>> {
  return {
    data: readLedger(),
    mode: "local",
  };
}

export async function submitPaperOrder(
  input: SubmitPaperOrderInput
): Promise<PaperMutationResult & { data: PaperTradingLedger; order?: PaperOrder }> {
  const symbol = normalizeSymbol(input.symbol);
  const quantity = Math.floor(toFinite(input.quantity) ?? 0);
  const referencePrice = roundPrice(toFinite(input.referencePrice) ?? 0);
  const orderType = normalizeOrderType(input.orderType);
  const side = normalizeSide(input.side);
  const ideaSource = normalizeIdeaSource(input.ideaSource);
  const baseSlippageBps = clamp(toFinite(input.baseSlippageBps) ?? 6, 0, 250);
  const slippageBps = estimateSlippageBps(baseSlippageBps, quantity, referencePrice);
  const limitPrice = roundPrice(toFinite(input.limitPrice) ?? 0);

  const ledger = readLedger();

  if (!symbol || quantity <= 0 || referencePrice <= 0) {
    return {
      ok: false,
      mode: "local",
      detail: "Provide a valid symbol, quantity, and reference price.",
      data: ledger,
    };
  }

  if (orderType === "limit" && limitPrice <= 0) {
    return {
      ok: false,
      mode: "local",
      detail: "Limit orders require a valid limit price.",
      data: ledger,
    };
  }

  const requestedPrice = orderType === "limit" ? limitPrice : referencePrice;
  const order: PaperOrder = {
    id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    side,
    orderType,
    status: "open",
    quantity,
    requestedPrice,
    referencePrice,
    slippageBps,
    notional: roundPrice(quantity * requestedPrice),
    createdAt: nowIso(),
    ideaSource,
  };

  const core = cloneCore(ledger);
  let nextCore = core;
  let settledOrder = order;

  if (orderType === "market") {
    const executionPrice = marketExecutionPrice(side, referencePrice, slippageBps);
    const result = settleFilledOrder(core, order, executionPrice);
    nextCore = result.core;
    settledOrder = result.order;
  } else if (limitTriggered(side, requestedPrice, referencePrice)) {
    const executionPrice = limitExecutionPrice(side, requestedPrice, referencePrice, slippageBps);
    const result = settleFilledOrder(core, order, executionPrice);
    nextCore = result.core;
    settledOrder = result.order;
  }

  const nextLedger = composeLedger(nextCore, [settledOrder, ...ledger.orders]);
  writeLedger(nextLedger);

  return {
    ok: settledOrder.status !== "rejected",
    mode: "local",
    ...(settledOrder.status === "rejected" && settledOrder.reason ? { detail: settledOrder.reason } : {}),
    data: nextLedger,
    order: settledOrder,
  };
}

export async function refreshOpenPaperOrders(
  quotes: Record<string, number>
): Promise<PaperQueryResult<PaperTradingLedger> & { filled: number; rejected: number }> {
  const ledger = readLedger();
  const openCount = ledger.orders.filter((row) => row.status === "open").length;
  if (!openCount) {
    return {
      data: ledger,
      mode: "local",
      filled: 0,
      rejected: 0,
    };
  }

  const quoteMap: Record<string, number> = {};
  Object.entries(quotes).forEach(([rawSymbol, rawPrice]) => {
    const symbol = normalizeSymbol(rawSymbol);
    const price = toFinite(rawPrice) ?? 0;
    if (symbol && price > 0) {
      quoteMap[symbol] = price;
    }
  });

  let core = cloneCore(ledger);
  let filled = 0;
  let rejected = 0;

  const nextOrders = ledger.orders.map((order) => {
    if (order.status !== "open") return order;
    const quote = quoteMap[order.symbol];
    if (!quote || !limitTriggered(order.side, order.requestedPrice, quote)) {
      return order;
    }

    const executionPrice = limitExecutionPrice(
      order.side,
      order.requestedPrice,
      quote,
      Math.max(0, order.slippageBps)
    );
    const result = settleFilledOrder(core, order, executionPrice);
    core = result.core;

    if (result.order.status === "filled") filled += 1;
    if (result.order.status === "rejected") rejected += 1;

    return result.order;
  });

  const nextLedger = composeLedger(core, nextOrders);
  writeLedger(nextLedger);

  return {
    data: nextLedger,
    mode: "local",
    ...(filled || rejected
      ? {
          detail: `${filled} limit order${filled === 1 ? "" : "s"} filled, ${rejected} rejected.`,
        }
      : {}),
    filled,
    rejected,
  };
}

export async function cancelPaperOrder(
  orderId: string
): Promise<PaperMutationResult & { data: PaperTradingLedger }> {
  const trimmed = orderId.trim();
  const ledger = readLedger();
  const index = ledger.orders.findIndex((row) => row.id === trimmed);

  if (index < 0) {
    return {
      ok: false,
      mode: "local",
      detail: "Order was not found.",
      data: ledger,
    };
  }

  const target = ledger.orders[index];
  if (target.status !== "open") {
    return {
      ok: false,
      mode: "local",
      detail: "Only open orders can be canceled.",
      data: ledger,
    };
  }

  const nextOrders = [...ledger.orders];
  nextOrders[index] = {
    ...target,
    status: "cancelled",
    reason: "Cancelled by user.",
    filledAt: nowIso(),
  };

  const nextLedger = composeLedger(cloneCore(ledger), nextOrders);
  writeLedger(nextLedger);

  return {
    ok: true,
    mode: "local",
    data: nextLedger,
  };
}

export async function resetPaperTradingLedger(
  startingCash: number = DEFAULT_STARTING_CASH
): Promise<PaperMutationResult & { data: PaperTradingLedger }> {
  const normalized = roundPrice(Math.max(1000, toFinite(startingCash) ?? DEFAULT_STARTING_CASH));
  const nextLedger = createDefaultLedger(normalized);
  writeLedger(nextLedger);

  return {
    ok: true,
    mode: "local",
    data: nextLedger,
  };
}
