"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Download, Loader2 } from "lucide-react";
import {
  loadSharedWatchlist,
  importSharedWatchlist,
  type SharedWatchlist,
} from "../../../lib/shared-watchlists";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SymbolQuote {
  symbol: string;
  price: number | null;
  change: number | null;
}

/* ------------------------------------------------------------------ */
/*  Inner component (needs useSearchParams → must be inside Suspense)  */
/* ------------------------------------------------------------------ */

function SharedWatchlistContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [watchlist, setWatchlist] = useState<SharedWatchlist | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, SymbolQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [imported, setImported] = useState(false);

  /* ---------- Load watchlist from localStorage ---------- */

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const wl = loadSharedWatchlist(id);
    if (!wl) {
      setNotFound(true);
      return;
    }
    setWatchlist(wl);
  }, [id]);

  /* ---------- Fetch prices for each symbol ---------- */

  useEffect(() => {
    if (!watchlist || watchlist.symbols.length === 0) return;

    let cancelled = false;
    setLoadingQuotes(true);

    async function fetchQuotes() {
      const results: Record<string, SymbolQuote> = {};

      await Promise.all(
        watchlist!.symbols.map(async (symbol) => {
          try {
            const res = await fetch(
              `/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`
            );
            if (res.ok) {
              const data = await res.json();
              results[symbol] = {
                symbol,
                price: data.price ?? data.c ?? null,
                change: data.change ?? data.dp ?? null,
              };
            } else {
              results[symbol] = { symbol, price: null, change: null };
            }
          } catch {
            results[symbol] = { symbol, price: null, change: null };
          }
        })
      );

      if (!cancelled) {
        setQuotes(results);
        setLoadingQuotes(false);
      }
    }

    fetchQuotes();
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  /* ---------- Import handler ---------- */

  const handleImport = useCallback(() => {
    if (!id) return;
    const ok = importSharedWatchlist(id);
    if (ok) setImported(true);
  }, [id]);

  /* ---------- Not found ---------- */

  if (notFound) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "80px auto",
          padding: "0 20px",
          textAlign: "center",
          color: "var(--ink, #e0e0e0)",
        }}
      >
        <div
          style={{
            background: "rgba(30,30,46,0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "48px 32px",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Shared watchlist not found or expired
          </h2>
          <p style={{ fontSize: 14, opacity: 0.5, marginBottom: 24 }}>
            The watchlist you are looking for may have been removed or the link
            is no longer valid.
          </p>
          <Link
            href="/watchlist"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 10,
              background: "var(--accent-2, #3b82f6)",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            Back to Watchlist
          </Link>
        </div>
      </div>
    );
  }

  /* ---------- Loading state ---------- */

  if (!watchlist) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          color: "var(--ink, #e0e0e0)",
          opacity: 0.5,
        }}
      >
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  /* ---------- Main view ---------- */

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "48px auto",
        padding: "0 20px",
        color: "var(--ink, #e0e0e0)",
      }}
    >
      {/* Card */}
      <div
        style={{
          background: "rgba(30,30,46,0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 16px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            {watchlist.name}
          </h1>
          <p
            style={{
              fontSize: 13,
              opacity: 0.4,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Shared by {watchlist.createdBy} &middot;{" "}
            {new Date(watchlist.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Symbols list */}
        <div style={{ padding: "0 28px 8px" }}>
          {watchlist.symbols.map((symbol) => {
            const q = quotes[symbol];
            return (
              <div
                key={symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>
                  {symbol}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {loadingQuotes ? (
                    <span style={{ opacity: 0.3, fontSize: 13 }}>...</span>
                  ) : q?.price != null ? (
                    <>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        ${q.price.toFixed(2)}
                      </span>
                      {q.change != null && (
                        <span
                          style={{
                            color:
                              q.change >= 0 ? "#22c55e" : "#ef4444",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {q.change >= 0 ? "+" : ""}
                          {q.change.toFixed(2)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ opacity: 0.3, fontSize: 13 }}>N/A</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 28px 24px",
          }}
        >
          <button
            onClick={handleImport}
            disabled={imported}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: imported
                ? "rgba(34,197,94,0.15)"
                : "var(--accent-2, #3b82f6)",
              color: imported ? "#22c55e" : "#fff",
              cursor: imported ? "default" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
          >
            {imported ? (
              <>
                <Check size={16} /> Imported
              </>
            ) : (
              <>
                <Download size={16} /> Import to My Watchlist
              </>
            )}
          </button>

          <Link
            href="/watchlist"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "var(--ink, #e0e0e0)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} /> Back to Watchlist
          </Link>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page (wrapped in Suspense for useSearchParams)                     */
/* ------------------------------------------------------------------ */

export default function SharedWatchlistPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            color: "var(--ink, #e0e0e0)",
            opacity: 0.5,
          }}
        >
          Loading...
        </div>
      }
    >
      <SharedWatchlistContent />
    </Suspense>
  );
}
