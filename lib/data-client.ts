"use client";

type DataMode = "remote" | "local";

type PortfolioRow = {
  symbol: string;
  shares: number;
};

type WatchlistRow = {
  symbol: string;
};

type TrendingRow = {
  symbol: string;
  count: number;
};

type NotificationRow = {
  id?: string;
  symbol: string;
  message: string;
  time: string;
  type?: string;
};

type QueryResult<T> = {
  data: T;
  mode: DataMode;
  detail?: string;
};

type MutationResult = {
  ok: boolean;
  mode: DataMode;
  detail?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const AUTH_MODE_KEY = "smc_auth_mode_v1";

const LOCAL_PORTFOLIO_KEY = "smc_local_portfolio_v2";
const LOCAL_WATCHLIST_KEY = "smc_local_watchlist_v2";
const LOCAL_NOTIFICATIONS_KEY = "smc_local_notifications_v2";

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function preferRemote() {
  if (!API_BASE) return false;
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTH_MODE_KEY) !== "local";
}

function readLocalPortfolio() {
  const rows = safeRead<PortfolioRow[]>(LOCAL_PORTFOLIO_KEY, []);
  return Array.isArray(rows)
    ? rows
        .map((row) => ({
          symbol: normalizeSymbol(row.symbol),
          shares: Number(row.shares),
        }))
        .filter((row) => row.symbol && Number.isFinite(row.shares) && row.shares > 0)
    : [];
}

function writeLocalPortfolio(rows: PortfolioRow[]) {
  safeWrite(LOCAL_PORTFOLIO_KEY, rows);
}

function readLocalWatchlist() {
  const rows = safeRead<WatchlistRow[]>(LOCAL_WATCHLIST_KEY, []);
  return Array.isArray(rows)
    ? rows
        .map((row) => ({ symbol: normalizeSymbol(row.symbol) }))
        .filter((row) => Boolean(row.symbol))
    : [];
}

function writeLocalWatchlist(rows: WatchlistRow[]) {
  safeWrite(LOCAL_WATCHLIST_KEY, rows);
}

function readLocalNotifications() {
  const rows = safeRead<NotificationRow[]>(LOCAL_NOTIFICATIONS_KEY, []);
  return Array.isArray(rows)
    ? rows
        .map((row) => ({
          id: row.id,
          symbol: normalizeSymbol(row.symbol || "SYS"),
          message: String(row.message || ""),
          time: String(row.time || new Date().toISOString()),
          type: row.type || "info",
        }))
        .filter((row) => row.message)
        .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
    : [];
}

function writeLocalNotifications(rows: NotificationRow[]) {
  safeWrite(LOCAL_NOTIFICATIONS_KEY, rows.slice(0, 200));
}

function pushLocalNotification(symbol: string, message: string, type: string = "info") {
  const next: NotificationRow = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    symbol: normalizeSymbol(symbol || "SYS"),
    message,
    time: new Date().toISOString(),
    type,
  };

  writeLocalNotifications([next, ...readLocalNotifications()]);
}

async function remoteGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const detail =
      (await response
        .json()
        .then((data) => data?.detail as string | undefined)
        .catch(() => undefined)) || `Request failed (${response.status})`;
    throw new Error(detail);
  }

  return response.json();
}

async function remoteJsonMutation<T>(
  path: string,
  method: "POST" | "DELETE",
  token: string | undefined,
  body?: object
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const detail =
      (await response
        .json()
        .then((data) => data?.detail as string | undefined)
        .catch(() => undefined)) || `Request failed (${response.status})`;
    throw new Error(detail);
  }

  return response.json();
}

export async function fetchPortfolioData(token?: string): Promise<QueryResult<PortfolioRow[]>> {
  if (preferRemote()) {
    try {
      const data = await remoteGet<PortfolioRow[]>("/portfolio", token);
      return {
        data: Array.isArray(data)
          ? data.map((row) => ({ symbol: normalizeSymbol(row.symbol), shares: Number(row.shares) }))
          : [],
        mode: "remote",
      };
    } catch (error) {
      return {
        data: readLocalPortfolio(),
        mode: "local",
        detail: error instanceof Error ? error.message : "Remote portfolio unavailable.",
      };
    }
  }

  return { data: readLocalPortfolio(), mode: "local" };
}

export async function addPortfolioPosition(
  symbol: string,
  shares: number,
  token?: string
): Promise<MutationResult> {
  const normalized = normalizeSymbol(symbol);
  const quantity = Number(shares);

  if (!normalized || !Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, mode: "local", detail: "Enter a valid symbol and shares quantity." };
  }

  if (preferRemote()) {
    try {
      await remoteJsonMutation("/portfolio", "POST", token, {
        symbol: normalized,
        shares: quantity,
      });
      return { ok: true, mode: "remote" };
    } catch (error) {
      const local = addPortfolioPositionLocal(normalized, quantity);
      return {
        ok: local.ok,
        mode: "local",
        detail: error instanceof Error ? error.message : local.detail,
      };
    }
  }

  return addPortfolioPositionLocal(normalized, quantity);
}

function addPortfolioPositionLocal(symbol: string, shares: number): MutationResult {
  const rows = readLocalPortfolio();
  const index = rows.findIndex((row) => row.symbol === symbol);

  if (index >= 0) {
    rows[index] = { ...rows[index], shares: rows[index].shares + shares };
  } else {
    rows.unshift({ symbol, shares });
  }

  writeLocalPortfolio(rows);
  pushLocalNotification(symbol, `${symbol} added to portfolio (${shares} shares).`, "portfolio");
  return { ok: true, mode: "local" };
}

export async function removePortfolioPosition(symbol: string, token?: string): Promise<MutationResult> {
  const normalized = normalizeSymbol(symbol);

  if (preferRemote()) {
    try {
      await remoteJsonMutation(`/portfolio?symbol=${normalized}`, "DELETE", token);
      return { ok: true, mode: "remote" };
    } catch (error) {
      const local = removePortfolioPositionLocal(normalized);
      return {
        ok: local.ok,
        mode: "local",
        detail: error instanceof Error ? error.message : local.detail,
      };
    }
  }

  return removePortfolioPositionLocal(normalized);
}

function removePortfolioPositionLocal(symbol: string): MutationResult {
  const rows = readLocalPortfolio();
  const next = rows.filter((row) => row.symbol !== symbol);
  writeLocalPortfolio(next);
  pushLocalNotification(symbol, `${symbol} removed from portfolio.`, "portfolio");
  return { ok: true, mode: "local" };
}

export async function fetchWatchlistData(token?: string): Promise<QueryResult<WatchlistRow[]>> {
  if (preferRemote()) {
    try {
      const data = await remoteGet<WatchlistRow[]>("/watchlist", token);
      return {
        data: Array.isArray(data)
          ? data.map((row) => ({ symbol: normalizeSymbol(row.symbol) }))
          : [],
        mode: "remote",
      };
    } catch (error) {
      return {
        data: readLocalWatchlist(),
        mode: "local",
        detail: error instanceof Error ? error.message : "Remote watchlist unavailable.",
      };
    }
  }

  return { data: readLocalWatchlist(), mode: "local" };
}

export async function addWatchlistSymbol(symbol: string, token?: string): Promise<MutationResult> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return { ok: false, mode: "local", detail: "Enter a valid symbol." };
  }

  if (preferRemote()) {
    try {
      await remoteJsonMutation("/watchlist", "POST", token, { symbol: normalized });
      return { ok: true, mode: "remote" };
    } catch (error) {
      const local = addWatchlistSymbolLocal(normalized);
      return {
        ok: local.ok,
        mode: "local",
        detail: error instanceof Error ? error.message : local.detail,
      };
    }
  }

  return addWatchlistSymbolLocal(normalized);
}

function addWatchlistSymbolLocal(symbol: string): MutationResult {
  const rows = readLocalWatchlist();
  if (!rows.some((row) => row.symbol === symbol)) {
    rows.unshift({ symbol });
    writeLocalWatchlist(rows);
  }

  pushLocalNotification(symbol, `${symbol} added to watchlist.`, "watchlist");
  return { ok: true, mode: "local" };
}

export async function removeWatchlistSymbol(symbol: string, token?: string): Promise<MutationResult> {
  const normalized = normalizeSymbol(symbol);

  if (preferRemote()) {
    try {
      await remoteJsonMutation(`/watchlist?symbol=${normalized}`, "DELETE", token);
      return { ok: true, mode: "remote" };
    } catch (error) {
      const local = removeWatchlistSymbolLocal(normalized);
      return {
        ok: local.ok,
        mode: "local",
        detail: error instanceof Error ? error.message : local.detail,
      };
    }
  }

  return removeWatchlistSymbolLocal(normalized);
}

function removeWatchlistSymbolLocal(symbol: string): MutationResult {
  const rows = readLocalWatchlist();
  writeLocalWatchlist(rows.filter((row) => row.symbol !== symbol));
  pushLocalNotification(symbol, `${symbol} removed from watchlist.`, "watchlist");
  return { ok: true, mode: "local" };
}

export async function fetchTrendingData(token?: string): Promise<QueryResult<TrendingRow[]>> {
  if (preferRemote()) {
    try {
      const data = await remoteGet<TrendingRow[]>("/trending", token);
      if (Array.isArray(data) && data.length) {
        return { data: data.slice(0, 12), mode: "remote" };
      }
    } catch {
      // fallback below
    }
  }

  const watch = readLocalWatchlist();
  const portfolio = readLocalPortfolio();
  const counts: Record<string, number> = {};

  watch.forEach((row) => {
    counts[row.symbol] = (counts[row.symbol] || 0) + 1;
  });
  portfolio.forEach((row) => {
    counts[row.symbol] = (counts[row.symbol] || 0) + Math.max(1, Math.round(row.shares / 10));
  });

  const fallbackPool = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"];
  fallbackPool.forEach((symbol, idx) => {
    counts[symbol] = Math.max(counts[symbol] || 0, fallbackPool.length - idx);
  });

  const ranked = Object.entries(counts)
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return { data: ranked, mode: "local" };
}

export async function fetchNotificationsData(token?: string): Promise<QueryResult<NotificationRow[]>> {
  if (preferRemote()) {
    try {
      const data = await remoteGet<NotificationRow[]>("/notifications", token);
      if (Array.isArray(data)) {
        return {
          data: data
            .map((row) => ({
              ...row,
              symbol: normalizeSymbol(row.symbol || "SYS"),
              message: String(row.message || ""),
              time: String(row.time || new Date().toISOString()),
            }))
            .filter((row) => row.message)
            .sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
          mode: "remote",
        };
      }
    } catch (error) {
      return {
        data: readLocalNotifications(),
        mode: "local",
        detail: error instanceof Error ? error.message : "Remote notifications unavailable.",
      };
    }
  }

  return { data: readLocalNotifications(), mode: "local" };
}

export function createLocalAlert(symbol: string, message: string, type: string = "manual") {
  pushLocalNotification(symbol, message, type);
}
