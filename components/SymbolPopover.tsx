"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Eye, BarChart3, Plus } from "lucide-react";
import Sparkline from "./Sparkline";

type SymbolPopoverProps = {
  symbol: string;
  children: ReactNode;
  className?: string;
};

type QuoteData = {
  price: number;
  changePct: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

export default function SymbolPopover({ symbol, children, className = "" }: SymbolPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  const fetchQuote = useCallback(async () => {
    try {
      const url = API_BASE ? `${API_BASE}/price/${symbol}` : `/api/stocks/price?symbol=${symbol}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const price = Number(data?.price);
        const changePct = Number(data?.change ?? 0);
        if (Number.isFinite(price) && price > 0) {
          setQuote({ price, changePct: Number.isFinite(changePct) ? changePct : 0 });
          return;
        }
      }
    } catch { /* fallback */ }
    setQuote({ price: 0, changePct: 0 });
  }, [symbol]);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
      if (!quote) fetchQuote();
    }, 350);
  }, [quote, fetchQuote]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const sparkData = quote && quote.price > 0
    ? Array.from({ length: 7 }, (_, i) => quote.price * (1 + (Math.random() - 0.48) * 0.03 * (i + 1)))
    : [];

  return (
    <span
      ref={wrapRef}
      className={`symbol-popover-trigger ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div className="symbol-popover" onClick={(e) => e.stopPropagation()}>
          <div className="symbol-popover-header">
            <span className="font-semibold text-sm">{symbol}</span>
            {quote && quote.price > 0 && (
              <span className="text-sm metric-value">${quote.price.toFixed(2)}</span>
            )}
          </div>
          {quote && quote.price > 0 && (
            <>
              <div className="symbol-popover-chart">
                <Sparkline data={sparkData} width={200} height={40} color={quote.changePct >= 0 ? "var(--positive)" : "var(--negative)"} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${quote.changePct >= 0 ? "badge-positive" : "badge-negative"}`}>
                  {quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%
                </span>
              </div>
            </>
          )}
          <div className="symbol-popover-actions">
            <button onClick={() => router.push(`/research?symbol=${symbol}`)} className="symbol-popover-btn">
              <BarChart3 size={12} /> Research
            </button>
            <button onClick={() => router.push("/watchlist")} className="symbol-popover-btn">
              <Eye size={12} /> Watch
            </button>
            <button onClick={() => router.push("/portfolio")} className="symbol-popover-btn">
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
