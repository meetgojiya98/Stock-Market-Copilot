"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Minus, Wallet, TrendingUp, TrendingDown, Globe } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CryptoAsset = {
  symbol: string;
  name: string;
  basePrice: number;
  marketCap: string;
};

type PortfolioEntry = {
  symbol: string;
  shares: number;
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CRYPTOS: CryptoAsset[] = [
  { symbol: "BTC", name: "Bitcoin", basePrice: 67482.35, marketCap: "$1.33T" },
  { symbol: "ETH", name: "Ethereum", basePrice: 3521.18, marketCap: "$423B" },
  { symbol: "SOL", name: "Solana", basePrice: 172.44, marketCap: "$76.8B" },
  { symbol: "ADA", name: "Cardano", basePrice: 0.628, marketCap: "$22.3B" },
  { symbol: "XRP", name: "Ripple", basePrice: 0.621, marketCap: "$34.1B" },
  { symbol: "DOT", name: "Polkadot", basePrice: 7.83, marketCap: "$10.6B" },
  { symbol: "AVAX", name: "Avalanche", basePrice: 38.92, marketCap: "$14.7B" },
  { symbol: "MATIC", name: "Polygon", basePrice: 0.714, marketCap: "$6.6B" },
  { symbol: "LINK", name: "Chainlink", basePrice: 18.27, marketCap: "$10.7B" },
  { symbol: "DOGE", name: "Dogecoin", basePrice: 0.164, marketCap: "$23.5B" },
];

const STORAGE_KEY = "smc_crypto_portfolio_v1";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str: string) {
  return str.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 5), 31);
}

function generatePrice(crypto: CryptoAsset): { price: number; change24h: number } {
  // Use a time-based seed that changes every 30 seconds for a "live" feel
  const timeBucket = Math.floor(Date.now() / 30000);
  const rng = seeded(hashStr(crypto.symbol) + timeBucket);
  const drift = (rng() - 0.48) * 0.06; // slight upward bias
  const price = crypto.basePrice * (1 + drift);
  const change24h = +((drift + (rng() - 0.5) * 0.04) * 100).toFixed(2);
  return { price, change24h };
}

function formatPrice(p: number) {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

const ICON_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  ADA: "#0033ad",
  XRP: "#23292f",
  DOT: "#e6007a",
  AVAX: "#e84142",
  MATIC: "#8247e5",
  LINK: "#2a5ada",
  DOGE: "#c2a633",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CryptoPortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editShares, setEditShares] = useState("");
  const [tick, setTick] = useState(0);

  // Load portfolio from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPortfolio(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  // Save portfolio to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  // Refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Generate current prices (memo'd on tick)
  const prices = useMemo(() => {
    void tick; // ensure recalc on tick
    return CRYPTOS.map((c) => ({ ...c, ...generatePrice(c) }));
  }, [tick]);

  const addToPortfolio = useCallback(
    (symbol: string, shares: number) => {
      setPortfolio((prev) => {
        const existing = prev.find((e) => e.symbol === symbol);
        if (existing) {
          return prev.map((e) => (e.symbol === symbol ? { ...e, shares: e.shares + shares } : e));
        }
        return [...prev, { symbol, shares }];
      });
      setEditingSymbol(null);
      setEditShares("");
    },
    []
  );

  const removeFromPortfolio = useCallback((symbol: string) => {
    setPortfolio((prev) => prev.filter((e) => e.symbol !== symbol));
  }, []);

  // Portfolio total
  const portfolioTotal = useMemo(() => {
    return portfolio.reduce((sum, entry) => {
      const asset = prices.find((p) => p.symbol === entry.symbol);
      return sum + (asset ? asset.price * entry.shares : 0);
    }, 0);
  }, [portfolio, prices]);

  const portfolioEntryMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of portfolio) map[e.symbol] = e.shares;
    return map;
  }, [portfolio]);

  return (
    <div className="space-y-5">
      {/* Market status & portfolio summary */}
      <div className="flex flex-wrap items-center gap-3 fade-up">
        <div className="crypto-market-badge crypto-market-open inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold">
          <Globe size={13} />
          24/7 Market Open
        </div>
        {portfolio.length > 0 && (
          <div className="rounded-2xl surface-glass dynamic-surface px-5 py-3 inline-flex items-center gap-3">
            <Wallet size={15} className="text-[var(--accent)]" />
            <div>
              <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold">Portfolio Value</div>
              <div className="metric-value text-lg font-semibold">{formatMoney(portfolioTotal)}</div>
            </div>
            <span className="text-xs muted">({portfolio.length} assets)</span>
          </div>
        )}
      </div>

      {/* Crypto grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 fade-up">
        {prices.map((crypto) => {
          const held = portfolioEntryMap[crypto.symbol] ?? 0;
          const isEditing = editingSymbol === crypto.symbol;
          const isPositive = crypto.change24h >= 0;

          return (
            <div
              key={crypto.symbol}
              className="crypto-card rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 flex flex-col gap-3 transition-all hover:scale-[1.01]"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div
                  className="crypto-icon w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: ICON_COLORS[crypto.symbol] ?? "#6b7280" }}
                >
                  {crypto.symbol[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{crypto.name}</div>
                  <div className="text-xs muted font-mono">{crypto.symbol}</div>
                </div>
              </div>

              {/* Price & change */}
              <div className="crypto-price-24h flex items-end justify-between gap-2">
                <div className="metric-value text-xl font-semibold font-mono">${formatPrice(crypto.price)}</div>
                <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isPositive ? "+" : ""}{crypto.change24h}%
                </div>
              </div>

              {/* Market cap */}
              <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold">
                Market Cap: {crypto.marketCap}
              </div>

              {/* Holdings */}
              {held > 0 && (
                <div className="rounded-lg control-surface p-2 text-xs">
                  <span className="muted">Holdings:</span>{" "}
                  <span className="font-semibold font-mono">{held} {crypto.symbol}</span>
                  <span className="muted ml-1">= {formatMoney(held * crypto.price)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto">
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      value={editShares}
                      onChange={(e) => setEditShares(e.target.value)}
                      placeholder="Amount"
                      className="control-surface rounded-lg px-2 py-1.5 text-xs w-20 font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      min={0}
                      step="any"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        const n = parseFloat(editShares);
                        if (n > 0) addToPortfolio(crypto.symbol, n);
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border border-[var(--positive)] bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] text-[var(--positive)] hover:bg-[color-mix(in_srgb,var(--positive)_24%,transparent)] transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setEditingSymbol(null); setEditShares(""); }}
                      className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border border-[var(--surface-border)] hover:border-[var(--accent)] transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingSymbol(crypto.symbol); setEditShares(""); }}
                      className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_24%,transparent)] transition-colors inline-flex items-center gap-1"
                    >
                      <Plus size={11} /> Add
                    </button>
                    {held > 0 && (
                      <button
                        onClick={() => removeFromPortfolio(crypto.symbol)}
                        className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border border-[var(--negative)] bg-[color-mix(in_srgb,var(--negative)_14%,transparent)] text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_24%,transparent)] transition-colors inline-flex items-center gap-1"
                      >
                        <Minus size={11} /> Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
