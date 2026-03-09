/* ------------------------------------------------------------------ */
/*  Shared Watchlist System                                            */
/* ------------------------------------------------------------------ */

export interface SharedWatchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: string;
  createdBy: string;
}

const KEY_PREFIX = "zentrade_shared_watchlist_";
const USER_WATCHLIST_KEY = "zentrade_watchlist_v1";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}

function getCurrentUser(): string {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return "anonymous";
    /* Try to decode JWT payload for a display name / email */
    const payload = JSON.parse(atob(token.split(".")[1] || "{}"));
    return payload.email || payload.sub || "anonymous";
  } catch {
    return "anonymous";
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Creates a share link for a watchlist.
 * Stores the watchlist in localStorage and returns the shareable URL path.
 */
export function generateWatchlistShareLink(
  name: string,
  symbols: string[]
): string {
  const id = generateId();
  const watchlist: SharedWatchlist = {
    id,
    name,
    symbols: [...symbols],
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUser(),
  };

  try {
    localStorage.setItem(KEY_PREFIX + id, JSON.stringify(watchlist));
  } catch {
    /* storage full or blocked */
  }

  return `/watchlist/shared?id=${id}`;
}

/**
 * Loads a shared watchlist by ID from localStorage.
 * Returns null if not found or invalid.
 */
export function loadSharedWatchlist(id: string): SharedWatchlist | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    const parsed: SharedWatchlist = JSON.parse(raw);
    if (!parsed.id || !Array.isArray(parsed.symbols)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Imports a shared watchlist by merging its symbols into the user's
 * main watchlist stored under `zentrade_watchlist_v1`.
 * Returns true on success, false if the shared watchlist was not found.
 */
export function importSharedWatchlist(id: string): boolean {
  const shared = loadSharedWatchlist(id);
  if (!shared) return false;

  try {
    const raw = localStorage.getItem(USER_WATCHLIST_KEY);
    let existing: string[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      existing = Array.isArray(parsed) ? parsed : [];
    }

    const merged = Array.from(new Set([...existing, ...shared.symbols]));
    localStorage.setItem(USER_WATCHLIST_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

/**
 * Exports a list of symbols as a CSV string.
 */
export function exportWatchlistAsCSV(symbols: string[]): string {
  const header = "Symbol";
  const rows = symbols.map((s) => s.toUpperCase());
  return [header, ...rows].join("\n");
}
