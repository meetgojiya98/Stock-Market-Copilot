"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  DollarSign,
  Globe,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
  /** rate per 1 USD */
  rate: number;
  /** daily change % (mock) */
  change: number;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar",         flag: "\ud83c\uddfa\ud83c\uddf8", rate: 1.0,      change: 0.0 },
  { code: "EUR", name: "Euro",              flag: "\ud83c\uddea\ud83c\uddfa", rate: 0.9218,   change: -0.12 },
  { code: "GBP", name: "British Pound",     flag: "\ud83c\uddec\ud83c\udde7", rate: 0.7864,   change: 0.08 },
  { code: "JPY", name: "Japanese Yen",      flag: "\ud83c\uddef\ud83c\uddf5", rate: 149.52,   change: -0.31 },
  { code: "INR", name: "Indian Rupee",      flag: "\ud83c\uddee\ud83c\uddf3", rate: 83.12,    change: -0.05 },
  { code: "CAD", name: "Canadian Dollar",   flag: "\ud83c\udde8\ud83c\udde6", rate: 1.3562,   change: 0.14 },
  { code: "AUD", name: "Australian Dollar", flag: "\ud83c\udde6\ud83c\uddfa", rate: 1.5341,   change: -0.22 },
  { code: "CHF", name: "Swiss Franc",       flag: "\ud83c\udde8\ud83c\udded", rate: 0.8791,   change: 0.06 },
];

const STORAGE_KEY = "smc_currency_v1";

/* ------------------------------------------------------------------ */
/*  Mock FX gain/loss data                                             */
/* ------------------------------------------------------------------ */

interface FxGainLoss {
  symbol: string;
  usdValue: number;
  fxGain: number;
}

const MOCK_FX_GAINS: FxGainLoss[] = [
  { symbol: "AAPL", usdValue: 18420.0, fxGain: 127.45 },
  { symbol: "MSFT", usdValue: 12850.0, fxGain: -42.18 },
  { symbol: "GOOGL", usdValue: 9340.0, fxGain: 88.92 },
  { symbol: "TSLA", usdValue: 7120.0, fxGain: -156.30 },
  { symbol: "NVDA", usdValue: 15600.0, fxGain: 234.10 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadSavedCurrency(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && CURRENCIES.some((c) => c.code === raw)) return raw;
    return "USD";
  } catch {
    return "USD";
  }
}

function formatNumber(n: number, decimals: number = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CurrencyConverter() {
  const [selectedCode, setSelectedCode] = useState("USD");
  const [usdAmount, setUsdAmount] = useState("1000");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState(false);

  /* ---------- Load saved currency ---------- */

  useEffect(() => {
    setSelectedCode(loadSavedCurrency());
  }, []);

  /* ---------- Current currency object ---------- */

  const selectedCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === selectedCode) ?? CURRENCIES[0],
    [selectedCode]
  );

  /* ---------- Converted amount ---------- */

  const parsedUsd = useMemo(() => {
    const n = parseFloat(usdAmount.replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }, [usdAmount]);

  const convertedAmount = useMemo(
    () => parsedUsd * selectedCurrency.rate,
    [parsedUsd, selectedCurrency]
  );

  /* ---------- Apply to portfolio ---------- */

  const applyToPortfolio = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedCode);
    } catch {
      /* ignore */
    }
    setAppliedMsg(true);
    setTimeout(() => setAppliedMsg(false), 2000);
  }, [selectedCode]);

  /* ---------- Total FX gain/loss ---------- */

  const totalFxGain = useMemo(
    () => MOCK_FX_GAINS.reduce((sum, g) => sum + g.fxGain, 0),
    []
  );

  return (
    <div
      className="currency-selector"
      style={{
        background: "var(--surface-strong, #1e1e2e)",
        border: "1px solid var(--surface-border, #333)",
        borderRadius: 16,
        padding: 24,
        fontFamily: "inherit",
        color: "var(--ink, #e0e0e0)",
        maxWidth: 560,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Globe size={20} style={{ color: "var(--accent, #8b5cf6)" }} />
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
          Currency Converter
        </h3>
      </div>

      {/* Currency selector dropdown */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <button
          onClick={() => setDropdownOpen((p) => !p)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid var(--surface-border, #444)",
            background: "rgba(255,255,255,0.03)",
            color: "inherit",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 15,
          }}
        >
          <span className="currency-flag" style={{ fontSize: 22 }}>
            {selectedCurrency.flag}
          </span>
          <span style={{ fontWeight: 600 }}>{selectedCurrency.code}</span>
          <span style={{ opacity: 0.5, fontSize: 13 }}>
            {selectedCurrency.name}
          </span>
          <ChevronDown
            size={16}
            style={{
              marginLeft: "auto",
              opacity: 0.4,
              transition: "transform 0.2s",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "var(--surface-strong, #1e1e2e)",
              border: "1px solid var(--surface-border, #444)",
              borderRadius: 12,
              zIndex: 50,
              boxShadow: "0 12px 40px rgba(0,0,0,.4)",
              overflow: "hidden",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                className="currency-option"
                onClick={() => {
                  setSelectedCode(c.code);
                  setDropdownOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  border: "none",
                  background:
                    c.code === selectedCode
                      ? "rgba(139, 92, 246, 0.12)"
                      : "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (c.code !== selectedCode) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    c.code === selectedCode
                      ? "rgba(139, 92, 246, 0.12)"
                      : "transparent";
                }}
              >
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span style={{ fontWeight: 600, minWidth: 36 }}>{c.code}</span>
                <span style={{ opacity: 0.5, fontSize: 13, flex: 1 }}>
                  {c.name}
                </span>
                {c.code === selectedCode && (
                  <Check size={14} style={{ color: "var(--accent, #8b5cf6)" }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversion display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--surface-border, #444)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <DollarSign size={16} style={{ opacity: 0.4 }} />
          <input
            type="text"
            value={usdAmount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.,]/g, "");
              setUsdAmount(val);
            }}
            placeholder="Enter USD amount"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          />
          <span style={{ opacity: 0.4, fontSize: 13 }}>USD</span>
        </div>

        <ArrowLeftRight size={18} style={{ opacity: 0.3, flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--surface-border, #444)",
            background: "rgba(var(--accent, 139, 92, 246), 0.05)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>{selectedCurrency.flag}</span>
          <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>
            {formatNumber(convertedAmount)}
          </span>
          <span style={{ opacity: 0.4, fontSize: 13 }}>
            {selectedCurrency.code}
          </span>
        </div>
      </div>

      {/* Exchange rate info */}
      <div
        style={{
          fontSize: 12,
          opacity: 0.45,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        1 USD = {formatNumber(selectedCurrency.rate, 4)} {selectedCurrency.code}
        {selectedCurrency.change !== 0 && (
          <span
            style={{
              marginLeft: 8,
              color: selectedCurrency.change > 0 ? "#10b981" : "#ef4444",
              fontWeight: 600,
            }}
          >
            {selectedCurrency.change > 0 ? "+" : ""}
            {selectedCurrency.change}%
          </span>
        )}
      </div>

      {/* Currency rate grid */}
      <div
        className="currency-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {CURRENCIES.filter((c) => c.code !== "USD").map((c) => (
          <div
            key={c.code}
            className="currency-rate"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border:
                c.code === selectedCode
                  ? "1px solid var(--accent, #8b5cf6)"
                  : "1px solid var(--surface-border, #333)",
              background:
                c.code === selectedCode
                  ? "rgba(139, 92, 246, 0.08)"
                  : "rgba(255,255,255,0.02)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onClick={() => setSelectedCode(c.code)}
          >
            <span style={{ fontSize: 16 }}>{c.flag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {c.code}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: c.change > 0 ? "#10b981" : c.change < 0 ? "#ef4444" : "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    marginLeft: "auto",
                  }}
                >
                  {c.change > 0 ? (
                    <TrendingUp size={10} />
                  ) : c.change < 0 ? (
                    <TrendingDown size={10} />
                  ) : null}
                  {c.change !== 0 ? `${c.change > 0 ? "+" : ""}${c.change}%` : ""}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.45, marginTop: 1 }}>
                {formatNumber(c.rate, c.rate > 10 ? 2 : 4)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FX Gain/Loss display */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--surface-border, #333)",
          padding: 16,
          marginBottom: 20,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Wallet size={14} style={{ opacity: 0.5 }} />
          FX Gain / Loss (Mock)
          <span
            style={{
              marginLeft: "auto",
              fontSize: 14,
              fontWeight: 700,
              color: totalFxGain >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {totalFxGain >= 0 ? "+" : ""}
            ${formatNumber(totalFxGain)}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MOCK_FX_GAINS.map((g) => (
            <div
              key={g.symbol}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 600, minWidth: 48 }}>{g.symbol}</span>
              <span style={{ opacity: 0.45, flex: 1 }}>
                ${formatNumber(g.usdValue)}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: g.fxGain >= 0 ? "#10b981" : "#ef4444",
                  fontSize: 12,
                }}
              >
                {g.fxGain >= 0 ? "+" : ""}${formatNumber(g.fxGain)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <button
        onClick={applyToPortfolio}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 20px",
          borderRadius: 12,
          border: "none",
          background: "var(--accent, #8b5cf6)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        {appliedMsg ? (
          <>
            <Check size={16} /> Applied {selectedCurrency.code} to Portfolio
          </>
        ) : (
          <>
            <RefreshCw size={16} /> Apply {selectedCurrency.code} to Portfolio
          </>
        )}
      </button>
    </div>
  );
}
