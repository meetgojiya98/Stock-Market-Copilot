/**
 * WebSocket simulation engine for real-time price ticks.
 * Generates realistic price movement via random walks and emits updates
 * at random intervals (1-5 seconds). Fully client-side with localStorage
 * persistence for subscribed symbols.
 */

export type WsPriceUpdate = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  bid: number;
  ask: number;
};

export type WsConnectionStatus = "live" | "offline";

type PriceListener = (update: WsPriceUpdate) => void;
type StatusListener = (status: WsConnectionStatus) => void;

const STORAGE_KEY = "smc_ws_symbols_v1";
const PORTFOLIO_KEY = "smc_local_portfolio_v2";

// Realistic base prices for common symbols
const BASE_PRICES: Record<string, number> = {
  AAPL: 189.84,
  MSFT: 420.55,
  GOOGL: 176.23,
  AMZN: 185.07,
  NVDA: 878.37,
  TSLA: 177.48,
  META: 505.75,
  JPM: 196.62,
  V: 281.44,
  UNH: 527.32,
  HD: 363.18,
  PG: 164.20,
  DIS: 112.85,
  NFLX: 628.50,
  PYPL: 63.12,
  CRM: 272.33,
  AMD: 178.92,
  INTC: 43.71,
  BA: 185.60,
  COST: 738.45,
  WMT: 172.11,
  KO: 60.88,
  PEP: 169.35,
  ABBV: 171.42,
  MRK: 127.68,
};

function getBasePrice(symbol: string): number {
  return BASE_PRICES[symbol] ?? 50 + Math.random() * 450;
}

class WebSocketStream {
  private symbols = new Map<string, { price: number; basePrice: number; volume: number }>();
  private priceListeners = new Set<PriceListener>();
  private statusListeners = new Set<StatusListener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private status: WsConnectionStatus = "offline";
  private running = false;

  constructor() {
    this.loadPersistedSymbols();
  }

  /** Get current connection status */
  getStatus(): WsConnectionStatus {
    return this.status;
  }

  /** Subscribe to a symbol's price stream */
  subscribe(symbol: string): void {
    const sym = symbol.trim().toUpperCase();
    if (!sym || this.symbols.has(sym)) return;

    const basePrice = getBasePrice(sym);
    // Add slight randomness so price starts near but not exactly at base
    const startPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);

    this.symbols.set(sym, {
      price: parseFloat(startPrice.toFixed(2)),
      basePrice,
      volume: Math.floor(500000 + Math.random() * 5000000),
    });

    this.persistSymbols();

    if (this.running) {
      this.startSymbolTicker(sym);
      // Emit an initial update immediately
      this.emitUpdate(sym);
    }
  }

  /** Unsubscribe from a symbol */
  unsubscribe(symbol: string): void {
    const sym = symbol.trim().toUpperCase();
    if (!this.symbols.has(sym)) return;

    const timer = this.timers.get(sym);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sym);
    }

    this.symbols.delete(sym);
    this.persistSymbols();

    if (this.symbols.size === 0 && this.running) {
      this.setStatus("offline");
    }
  }

  /** Get all currently subscribed symbols */
  getSubscribedSymbols(): string[] {
    return Array.from(this.symbols.keys());
  }

  /** Register a price update listener. Returns cleanup function. */
  onPrice(listener: PriceListener): () => void {
    this.priceListeners.add(listener);
    return () => {
      this.priceListeners.delete(listener);
    };
  }

  /** Register a status listener. Returns cleanup function. */
  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** Start the simulation engine */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.setStatus(this.symbols.size > 0 ? "live" : "offline");

    for (const sym of this.symbols.keys()) {
      this.startSymbolTicker(sym);
    }
  }

  /** Stop the simulation engine */
  stop(): void {
    this.running = false;
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.setStatus("offline");
  }

  /** Destroy the stream completely */
  destroy(): void {
    this.stop();
    this.priceListeners.clear();
    this.statusListeners.clear();
    this.symbols.clear();
  }

  /** Get current snapshot for a symbol */
  getSnapshot(symbol: string): WsPriceUpdate | null {
    const sym = symbol.trim().toUpperCase();
    const data = this.symbols.get(sym);
    if (!data) return null;

    const change = data.price - data.basePrice;
    const changePercent = (change / data.basePrice) * 100;
    const spread = data.price * 0.0003;

    return {
      symbol: sym,
      price: data.price,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: data.volume,
      timestamp: Date.now(),
      bid: parseFloat((data.price - spread).toFixed(2)),
      ask: parseFloat((data.price + spread).toFixed(2)),
    };
  }

  // ── Private ──────────────────────────────────────────────

  private setStatus(next: WsConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  private startSymbolTicker(sym: string): void {
    const tick = () => {
      if (!this.running || !this.symbols.has(sym)) return;

      this.simulatePriceMove(sym);
      this.emitUpdate(sym);

      // Random interval between 1-5 seconds
      const delay = 1000 + Math.random() * 4000;
      this.timers.set(sym, setTimeout(tick, delay));
    };

    // Start with a random initial delay (0.5-2s) so all symbols don't tick at once
    const initialDelay = 500 + Math.random() * 1500;
    this.timers.set(sym, setTimeout(tick, initialDelay));
  }

  private simulatePriceMove(sym: string): void {
    const data = this.symbols.get(sym);
    if (!data) return;

    // Random walk with mean reversion toward base price
    const drift = (data.basePrice - data.price) * 0.001; // gentle pull back
    const volatility = data.price * 0.0015; // ~0.15% per tick
    const shock = (Math.random() - 0.5) * 2 * volatility;

    const newPrice = Math.max(0.01, data.price + drift + shock);
    const volumeDelta = Math.floor((Math.random() - 0.3) * 50000);

    data.price = parseFloat(newPrice.toFixed(2));
    data.volume = Math.max(10000, data.volume + volumeDelta);
  }

  private emitUpdate(sym: string): void {
    const update = this.getSnapshot(sym);
    if (!update) return;

    if (this.status !== "live") {
      this.setStatus("live");
    }

    this.priceListeners.forEach((fn) => {
      try {
        fn(update);
      } catch {
        // Don't let a bad listener break the stream
      }
    });
  }

  private persistSymbols(): void {
    if (typeof window === "undefined") return;
    try {
      const syms = Array.from(this.symbols.keys());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(syms));
    } catch {
      // ignore
    }
  }

  private loadPersistedSymbols(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const syms = JSON.parse(raw) as string[];
        if (Array.isArray(syms)) {
          syms.forEach((sym) => {
            if (typeof sym === "string" && sym.trim()) {
              const s = sym.trim().toUpperCase();
              const basePrice = getBasePrice(s);
              const startPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);
              this.symbols.set(s, {
                price: parseFloat(startPrice.toFixed(2)),
                basePrice,
                volume: Math.floor(500000 + Math.random() * 5000000),
              });
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }

  /** Load portfolio symbols and auto-subscribe to them */
  loadPortfolioSymbols(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PORTFOLIO_KEY);
      if (raw) {
        const portfolio = JSON.parse(raw) as Array<{ symbol: string }>;
        if (Array.isArray(portfolio)) {
          portfolio.forEach((row) => {
            if (row.symbol) {
              this.subscribe(row.symbol);
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }
}

// ── Singleton ──────────────────────────────────────────────

let instance: WebSocketStream | null = null;

export function createWebSocketStream(): WebSocketStream {
  if (!instance) {
    instance = new WebSocketStream();
  }
  return instance;
}
