"use client";

export type BrokerProvider =
  | "alpaca"
  | "interactive_brokers"
  | "schwab"
  | "robinhood";

export type BrokerPosition = {
  symbol: string;
  shares: number;
  price: number;
  marketValue: number;
};

export type BrokerAccount = {
  id: string;
  provider: BrokerProvider;
  label: string;
  mode: "read-only";
  status: "connected" | "disconnected";
  connectedAt: string;
  lastSyncedAt?: string;
  balance: number;
  equity: number;
  positions: BrokerPosition[];
};

type LocalResult<T> = {
  ok: boolean;
  data: T;
  mode: "local";
  detail?: string;
};

type SyncInput = {
  cash: number;
  positions: Array<{
    symbol: string;
    shares: number;
    averagePrice: number;
  }>;
  quotes: Record<string, { price: number }>;
};

const STORAGE_KEY = "smc_broker_accounts_v1";

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function round(value: number) {
  return Math.round(value * 100) / 100;
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

function sanitizeAccount(raw: unknown): BrokerAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<BrokerAccount>;

  const provider: BrokerProvider =
    candidate.provider === "interactive_brokers" ||
    candidate.provider === "schwab" ||
    candidate.provider === "robinhood"
      ? candidate.provider
      : "alpaca";
  const label = String(candidate.label ?? "").trim();
  if (!label) return null;

  const positions = Array.isArray(candidate.positions)
    ? candidate.positions
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Partial<BrokerPosition>;
          const symbol = normalizeSymbol(String(row.symbol ?? ""));
          const shares = Math.max(0, Math.floor(Number(row.shares ?? 0)));
          const price = Number(row.price ?? 0);
          const marketValue = Number(row.marketValue ?? price * shares);
          if (!symbol || !shares || !Number.isFinite(price) || price <= 0) return null;
          return {
            symbol,
            shares,
            price: round(price),
            marketValue: round(marketValue),
          };
        })
        .filter((item): item is BrokerPosition => Boolean(item))
    : [];

  return {
    id: String(candidate.id ?? `broker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    provider,
    label,
    mode: "read-only",
    status: candidate.status === "disconnected" ? "disconnected" : "connected",
    connectedAt: String(candidate.connectedAt ?? nowIso()),
    ...(candidate.lastSyncedAt ? { lastSyncedAt: String(candidate.lastSyncedAt) } : {}),
    balance: round(Number(candidate.balance ?? 0)),
    equity: round(Number(candidate.equity ?? 0)),
    positions,
  };
}

function readAccounts() {
  const raw = safeRead<BrokerAccount[]>(STORAGE_KEY, []);
  return raw
    .map((item) => sanitizeAccount(item))
    .filter((item): item is BrokerAccount => Boolean(item))
    .sort((a, b) => Date.parse(b.connectedAt) - Date.parse(a.connectedAt));
}

function writeAccounts(accounts: BrokerAccount[]) {
  safeWrite(
    STORAGE_KEY,
    accounts
      .map((item) => sanitizeAccount(item))
      .filter((item): item is BrokerAccount => Boolean(item))
  );
}

function providerLabel(provider: BrokerProvider) {
  if (provider === "interactive_brokers") return "Interactive Brokers";
  if (provider === "schwab") return "Charles Schwab";
  if (provider === "robinhood") return "Robinhood";
  return "Alpaca";
}

export function providerDisplayName(provider: BrokerProvider) {
  return providerLabel(provider);
}

export async function fetchBrokerAccounts(): Promise<LocalResult<BrokerAccount[]>> {
  return {
    ok: true,
    data: readAccounts(),
    mode: "local",
  };
}

export async function connectBrokerAccount(input: {
  provider: BrokerProvider;
  label: string;
}): Promise<LocalResult<BrokerAccount[]> & { account?: BrokerAccount }> {
  const label = input.label.trim();
  const provider = input.provider;
  const current = readAccounts();

  if (!label) {
    return {
      ok: false,
      data: current,
      mode: "local",
      detail: "Broker account label is required.",
    };
  }

  const account: BrokerAccount = {
    id: `broker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    provider,
    label,
    mode: "read-only",
    status: "connected",
    connectedAt: nowIso(),
    balance: 0,
    equity: 0,
    positions: [],
  };

  const next = [account, ...current];
  writeAccounts(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    account,
  };
}

export async function disconnectBrokerAccount(
  accountId: string
): Promise<LocalResult<BrokerAccount[]>> {
  const current = readAccounts();
  const next = current.map((item) =>
    item.id === accountId ? { ...item, status: "disconnected" as const } : item
  );
  writeAccounts(next);
  return {
    ok: true,
    data: next,
    mode: "local",
  };
}

function positionsFromPaper(input: SyncInput) {
  return input.positions
    .map((position) => {
      const symbol = normalizeSymbol(position.symbol);
      const shares = Math.max(0, Math.floor(position.shares));
      if (!symbol || shares <= 0) return null;
      const quote = input.quotes[symbol]?.price;
      const price = quote && quote > 0 ? quote : position.averagePrice;
      if (!price || price <= 0) return null;
      return {
        symbol,
        shares,
        price: round(price),
        marketValue: round(price * shares),
      };
    })
    .filter((item): item is BrokerPosition => Boolean(item));
}

export async function syncBrokerAccountFromPaper(
  accountId: string,
  input: SyncInput
): Promise<LocalResult<BrokerAccount[]> & { account?: BrokerAccount }> {
  const current = readAccounts();
  const index = current.findIndex((item) => item.id === accountId);
  if (index < 0) {
    return {
      ok: false,
      data: current,
      mode: "local",
      detail: "Broker account not found.",
    };
  }

  const account = current[index];
  if (account.status !== "connected") {
    return {
      ok: false,
      data: current,
      mode: "local",
      detail: "Connect this account before syncing.",
    };
  }

  const positions = positionsFromPaper(input);
  const positionsValue = positions.reduce((sum, item) => sum + item.marketValue, 0);
  const cash = Number.isFinite(input.cash) ? input.cash : 0;

  const updated: BrokerAccount = {
    ...account,
    lastSyncedAt: nowIso(),
    balance: round(cash),
    equity: round(cash + positionsValue),
    positions,
  };

  const next = [...current];
  next[index] = updated;
  writeAccounts(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    account: updated,
  };
}
