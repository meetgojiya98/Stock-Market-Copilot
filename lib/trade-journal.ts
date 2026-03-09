export type TradeEntry = {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  date: string;
  notes: string;
  tags: string[];
  agentAnalysis?: string;
  agentId?: string;
  pnl?: number;
  createdAt: string;
};

export type TradeStats = {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  bestTrade: TradeEntry | null;
  worstTrade: TradeEntry | null;
};

const STORAGE_KEY = "zentrade_trade_journal_v1";
const MAX_ENTRIES = 500;

function loadAll(): TradeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveAll(entries: TradeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* ignore */ }
}

export function saveTradeEntry(entry: TradeEntry) {
  const all = loadAll();
  const idx = all.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.unshift(entry);
  }
  saveAll(all);
}

export function loadTradeEntries(): TradeEntry[] {
  return loadAll();
}

export function deleteTradeEntry(id: string) {
  saveAll(loadAll().filter((e) => e.id !== id));
}

export function updateTradeEntry(id: string, updates: Partial<TradeEntry>) {
  const all = loadAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    saveAll(all);
  }
}

export function getTradeStats(): TradeStats {
  const entries = loadAll();
  const withPnl = entries.filter((e) => e.pnl !== undefined) as (TradeEntry & { pnl: number })[];

  const totalTrades = entries.length;
  const wins = withPnl.filter((e) => e.pnl > 0).length;
  const winRate = withPnl.length > 0 ? (wins / withPnl.length) * 100 : 0;
  const totalPnL = withPnl.reduce((sum, e) => sum + e.pnl, 0);
  const avgPnL = withPnl.length > 0 ? totalPnL / withPnl.length : 0;

  let bestTrade: TradeEntry | null = null;
  let worstTrade: TradeEntry | null = null;
  if (withPnl.length > 0) {
    bestTrade = withPnl.reduce((best, e) => (e.pnl > best.pnl ? e : best), withPnl[0]);
    worstTrade = withPnl.reduce((worst, e) => (e.pnl < worst.pnl ? e : worst), withPnl[0]);
  }

  return { totalTrades, winRate, totalPnL, avgPnL, bestTrade, worstTrade };
}

export function getTradesBySymbol(symbol: string): TradeEntry[] {
  const q = symbol.toUpperCase();
  return loadAll().filter((e) => e.symbol.toUpperCase() === q);
}

export function searchTrades(query: string): TradeEntry[] {
  const q = query.toLowerCase();
  return loadAll().filter(
    (e) =>
      e.symbol.toLowerCase().includes(q) ||
      e.notes.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
}
