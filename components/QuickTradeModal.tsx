"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "smc_quick_trades_v1";

const POPULAR_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
  "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "NFLX",
  "PYPL", "ADBE", "CRM", "INTC", "AMD", "QCOM", "COST", "PEP", "KO",
  "ABBV", "MRK", "TMO", "AVGO", "ORCL", "CSCO", "ACN", "TXN", "LLY",
  "NKE", "MCD", "BA", "GS", "MS", "SPY", "QQQ", "IWM", "VTI", "VOO",
];

/* Synthetic last prices for estimate calculations */
const SYMBOL_PRICES: Record<string, number> = {
  AAPL: 189.50, MSFT: 415.20, GOOGL: 151.80, AMZN: 185.60, NVDA: 875.30,
  META: 510.40, TSLA: 195.70, "BRK.B": 412.00, JPM: 198.50, V: 282.30,
  JNJ: 155.80, WMT: 172.40, PG: 168.20, MA: 462.10, UNH: 528.90,
  HD: 378.60, DIS: 112.40, NFLX: 620.80, PYPL: 68.50, ADBE: 580.20,
  CRM: 295.40, INTC: 42.80, AMD: 172.60, QCOM: 168.90, COST: 735.20,
  PEP: 172.50, KO: 62.30, ABBV: 178.40, MRK: 128.60, TMO: 575.80,
  AVGO: 1380.20, ORCL: 125.40, CSCO: 52.70, ACN: 365.40, TXN: 172.80,
  LLY: 780.50, NKE: 98.70, MCD: 295.30, BA: 215.60, GS: 398.70,
  MS: 95.40, SPY: 505.80, QQQ: 438.60, IWM: 205.30, VTI: 262.40,
  VOO: 465.20,
};

type OrderSide = "buy" | "sell";
type OrderType = "market" | "limit";

type Trade = {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  limitPrice: number | null;
  estimatedTotal: number;
  timestamp: number;
};

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveTrades(trades: Trade[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function generateId(): string {
  return `qt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   QuickTradeModal Component
   ──────────────────────────────────────────────────────────────────────────── */

export default function QuickTradeModal() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<OrderSide>("buy");
  const [quantity, setQuantity] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [submitted, setSubmitted] = useState(false);

  const symbolRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const limitRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  /* Autocomplete suggestions */
  const suggestions = useMemo(() => {
    const q = symbol.trim().toUpperCase();
    if (q.length === 0) return [];
    return POPULAR_SYMBOLS.filter((s) => s.startsWith(q) && s !== q).slice(0, 6);
  }, [symbol]);

  /* Estimated price */
  const symbolUpper = symbol.trim().toUpperCase();
  const currentPrice = SYMBOL_PRICES[symbolUpper] ?? 0;
  const qty = Math.max(0, parseInt(quantity, 10) || 0);
  const lp = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "limit" && lp > 0 ? lp : currentPrice;
  const estimatedTotal = qty * effectivePrice;

  /* Open on T key press */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleClose();
        return;
      }

      if (
        (e.key === "t" || e.key === "T") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isInputFocused() &&
        !open
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  /* Focus symbol input on open */
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        symbolRef.current?.focus();
      });
      setSubmitted(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSymbol("");
    setSide("buy");
    setQuantity("");
    setOrderType("market");
    setLimitPrice("");
    setShowSuggestions(false);
    setActiveIdx(-1);
    setSubmitted(false);
  }, []);

  /* Select a suggestion */
  const selectSuggestion = useCallback((s: string) => {
    setSymbol(s);
    setShowSuggestions(false);
    setActiveIdx(-1);
    quantityRef.current?.focus();
  }, []);

  /* Handle symbol input keyboard */
  const handleSymbolKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (suggestions.length > 0 && showSuggestions) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIdx((prev) => Math.max(prev - 1, -1));
          return;
        }
        if (e.key === "Enter" && activeIdx >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIdx]);
          return;
        }
      }

      if (e.key === "Tab" && !e.shiftKey) {
        // If there is exactly one suggestion or an active one, auto-complete
        if (suggestions.length === 1) {
          e.preventDefault();
          selectSuggestion(suggestions[0]);
          return;
        }
        if (activeIdx >= 0 && activeIdx < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIdx]);
          return;
        }
      }
    },
    [suggestions, showSuggestions, activeIdx, selectSuggestion]
  );

  /* Submit trade */
  const handleSubmit = useCallback(() => {
    if (!symbolUpper || qty <= 0) return;

    const trade: Trade = {
      id: generateId(),
      symbol: symbolUpper,
      side,
      quantity: qty,
      orderType,
      limitPrice: orderType === "limit" ? lp : null,
      estimatedTotal,
      timestamp: Date.now(),
    };

    const existing = loadTrades();
    existing.push(trade);
    saveTrades(existing);

    setSubmitted(true);
    setTimeout(() => {
      handleClose();
    }, 800);
  }, [symbolUpper, side, qty, orderType, lp, estimatedTotal, handleClose]);

  /* Handle backdrop click */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    },
    [handleClose]
  );

  /* Shared input styles */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.45rem 0.6rem",
    fontSize: "0.82rem",
    background: "var(--surface-emphasis)",
    border: "1px solid var(--surface-border)",
    borderRadius: "0.4rem",
    color: "var(--ink)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--ink-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.3rem",
    display: "block",
  };

  const canSubmit = symbolUpper.length > 0 && qty > 0 && !submitted;

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
      }}
      onClick={handleBackdropClick}
    >
      <div className="quick-trade-modal" ref={modalRef}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Zap size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>
              Quick Trade
            </span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-muted)",
              padding: "0.2rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Symbol */}
        <div style={{ marginBottom: "0.6rem", position: "relative" }}>
          <label style={labelStyle}>Symbol</label>
          <input
            ref={symbolRef}
            type="text"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value.toUpperCase());
              setShowSuggestions(true);
              setActiveIdx(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay so click on suggestion registers
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={handleSymbolKeyDown}
            placeholder="e.g. AAPL"
            style={inputStyle}
            autoComplete="off"
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                background: "var(--bg-canvas)",
                border: "1px solid var(--surface-border)",
                borderRadius: "0.35rem",
                marginTop: "0.2rem",
                listStyle: "none",
                padding: "0.2rem 0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                maxHeight: "180px",
                overflowY: "auto",
              }}
            >
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  onMouseDown={() => selectSuggestion(s)}
                  style={{
                    padding: "0.35rem 0.6rem",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--ink)",
                    background: i === activeIdx
                      ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                      : "transparent",
                  }}
                >
                  {s}
                  {SYMBOL_PRICES[s] && (
                    <span style={{ marginLeft: "0.5rem", fontWeight: 400, color: "var(--ink-muted)", fontSize: "0.75rem" }}>
                      ${SYMBOL_PRICES[s].toFixed(2)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side toggle */}
        <div style={{ marginBottom: "0.6rem" }}>
          <label style={labelStyle}>Side</label>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  border: "1px solid",
                  borderColor: side === s
                    ? s === "buy" ? "var(--positive)" : "var(--negative)"
                    : "var(--surface-border)",
                  borderRadius: "0.35rem",
                  cursor: "pointer",
                  color: side === s
                    ? "#fff"
                    : "var(--ink-muted)",
                  background: side === s
                    ? s === "buy" ? "var(--positive)" : "var(--negative)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                  transition: "all 0.15s ease",
                }}
              >
                {s === "buy" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div style={{ marginBottom: "0.6rem" }}>
          <label style={labelStyle}>Quantity</label>
          <input
            ref={quantityRef}
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>

        {/* Order Type */}
        <div style={{ marginBottom: "0.6rem" }}>
          <label style={labelStyle}>Order Type</label>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["market", "limit"] as const).map((ot) => (
              <button
                key={ot}
                onClick={() => {
                  setOrderType(ot);
                  if (ot === "limit") {
                    requestAnimationFrame(() => limitRef.current?.focus());
                  }
                }}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  border: "1px solid",
                  borderColor: orderType === ot ? "var(--accent)" : "var(--surface-border)",
                  borderRadius: "0.35rem",
                  cursor: "pointer",
                  color: orderType === ot ? "var(--accent)" : "var(--ink-muted)",
                  background: orderType === ot
                    ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                    : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                {ot}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price (conditional) */}
        {orderType === "limit" && (
          <div style={{ marginBottom: "0.6rem" }}>
            <label style={labelStyle}>Limit Price</label>
            <input
              ref={limitRef}
              type="number"
              min="0.01"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "$0.00"}
              style={inputStyle}
            />
          </div>
        )}

        {/* Estimated Total */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.55rem 0.65rem",
            background: "var(--surface-emphasis)",
            borderRadius: "0.4rem",
            marginBottom: "0.75rem",
            border: "1px solid var(--surface-border)",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
            Estimated Total
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: estimatedTotal > 0 ? "var(--ink)" : "var(--ink-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${estimatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          style={{
            width: "100%",
            padding: "0.55rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#fff",
            background: submitted
              ? "var(--positive)"
              : canSubmit
                ? side === "buy" ? "var(--positive)" : "var(--negative)"
                : "var(--surface-border)",
            border: "none",
            borderRadius: "0.4rem",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "all 0.15s ease",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {submitted
            ? "Order Placed!"
            : `${side === "buy" ? "Buy" : "Sell"} ${symbolUpper || "..."}`}
        </button>

        {/* Footer hint */}
        <div
          style={{
            marginTop: "0.6rem",
            textAlign: "center",
            fontSize: "0.65rem",
            color: "var(--ink-muted)",
          }}
        >
          Press <kbd style={{ fontFamily: "monospace", fontWeight: 600 }}>Tab</kbd> to navigate
          &middot; <kbd style={{ fontFamily: "monospace", fontWeight: 600 }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
