/**
 * Real-time price streaming utility.
 * Uses polling at 10-second intervals with fallback endpoints,
 * exponential backoff on errors, and a singleton pattern.
 */

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type PriceUpdate = {
  symbol: string;
  price: number;
  changePct: number;
  timestamp: number;
};

type PriceListener = (update: PriceUpdate) => void;

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "")
  : "";

const POLL_INTERVAL = 10_000;
const MAX_BACKOFF = 120_000;
const INITIAL_BACKOFF = 2_000;

export class PriceStream {
  private subscriptions = new Map<string, number>(); // symbol -> refcount
  private prices = new Map<string, PriceUpdate>();
  private listeners = new Set<PriceListener>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private status: ConnectionStatus = "disconnected";
  private backoff = INITIAL_BACKOFF;
  private consecutiveErrors = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  /** Subscribe a symbol. Returns an unsubscribe function. */
  subscribe(symbol: string): () => void {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return () => {};

    const current = this.subscriptions.get(normalized) ?? 0;
    this.subscriptions.set(normalized, current + 1);

    // Start polling if this is the first subscription
    if (this.subscriptions.size === 1 && current === 0) {
      this.start();
    }

    // If we already have a price, don't wait for next poll — fire immediately
    if (current === 0) {
      this.fetchSingle(normalized);
    }

    return () => {
      this.unsubscribe(normalized);
    };
  }

  /** Decrement the refcount for a symbol; remove if zero. */
  unsubscribe(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    const current = this.subscriptions.get(normalized) ?? 0;
    if (current <= 1) {
      this.subscriptions.delete(normalized);
      this.prices.delete(normalized);
    } else {
      this.subscriptions.set(normalized, current - 1);
    }

    // Stop polling if nothing subscribed
    if (this.subscriptions.size === 0) {
      this.stop();
    }
  }

  /** Register a listener for price updates. Returns cleanup function. */
  onPrice(listener: PriceListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Register a listener for connection status changes. Returns cleanup function. */
  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Fire current status immediately
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** Get the current connection status. */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Get all current prices. */
  getPrices(): Map<string, PriceUpdate> {
    return new Map(this.prices);
  }

  /** Get a single symbol's latest price. */
  getPrice(symbol: string): PriceUpdate | undefined {
    return this.prices.get(symbol.trim().toUpperCase());
  }

  /** Tear down the stream completely. */
  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.listeners.clear();
    this.statusListeners.clear();
    this.subscriptions.clear();
    this.prices.clear();
  }

  // ─── Private ────────────────────────────────────────────────

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  private start() {
    if (this.destroyed) return;
    this.clearReconnectTimer();
    this.setStatus("connecting");
    this.poll(); // immediate first fetch
    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  private stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.clearReconnectTimer();
    this.setStatus("disconnected");
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.subscriptions.size === 0) return;
    this.clearReconnectTimer();

    const delay = Math.min(this.backoff * Math.pow(1.5, this.consecutiveErrors - 1), MAX_BACKOFF);
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed && this.subscriptions.size > 0) {
        this.start();
      }
    }, delay);
  }

  private async poll() {
    if (this.destroyed || this.subscriptions.size === 0) return;

    const symbols = Array.from(this.subscriptions.keys());

    try {
      const results = await Promise.allSettled(
        symbols.map((sym) => this.fetchSymbolPrice(sym))
      );

      let anySuccess = false;
      results.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value) {
          anySuccess = true;
          const update = result.value;
          this.prices.set(symbols[idx], update);
          this.emit(update);
        }
      });

      if (anySuccess) {
        this.consecutiveErrors = 0;
        this.backoff = INITIAL_BACKOFF;
        this.setStatus("connected");
      } else if (symbols.length > 0) {
        // All symbols failed
        this.handlePollError();
      }
    } catch {
      this.handlePollError();
    }
  }

  private handlePollError() {
    this.consecutiveErrors += 1;
    this.setStatus("error");

    // Stop the regular interval and schedule a reconnect with backoff
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.scheduleReconnect();
  }

  private async fetchSingle(symbol: string) {
    try {
      const update = await this.fetchSymbolPrice(symbol);
      if (update) {
        this.prices.set(symbol, update);
        this.emit(update);
        if (this.status !== "connected") {
          this.setStatus("connected");
        }
      }
    } catch {
      // Silently fail for single fetch; the poll will pick it up
    }
  }

  private async fetchSymbolPrice(symbol: string): Promise<PriceUpdate | null> {
    // Try primary endpoint first
    if (API_BASE) {
      try {
        const resp = await fetch(`${API_BASE}/price/${symbol}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const price = Number(data?.price);
          if (Number.isFinite(price) && price > 0) {
            return {
              symbol,
              price,
              changePct: Number.isFinite(data?.change) ? Number(data.change) : 0,
              timestamp: Date.now(),
            };
          }
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback to local API route
    try {
      const resp = await fetch(`/api/stocks/price?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const price = Number(data?.price);
        if (Number.isFinite(price) && price > 0) {
          return {
            symbol,
            price,
            changePct: Number.isFinite(data?.change) ? Number(data.change) : 0,
            timestamp: Date.now(),
          };
        }
      }
    } catch {
      // Both endpoints failed
    }

    return null;
  }

  private emit(update: PriceUpdate) {
    this.listeners.forEach((fn) => {
      try {
        fn(update);
      } catch {
        // Don't let a bad listener break the stream
      }
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────

let singletonInstance: PriceStream | null = null;

export function getPriceStream(): PriceStream {
  if (!singletonInstance) {
    singletonInstance = new PriceStream();
  }
  return singletonInstance;
}
