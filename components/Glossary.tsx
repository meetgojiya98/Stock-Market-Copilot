"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronDown, ChevronRight, Hash } from "lucide-react";

type Term = { term: string; definition: string };

const TERMS: Term[] = [
  { term: "Alpha", definition: "A measure of how much better (or worse) an investment performed compared to a benchmark like the S&P 500. Positive alpha means it beat the benchmark." },
  { term: "Bear Market", definition: "A market where prices are falling or expected to fall, usually by 20% or more from recent highs. Investors tend to be pessimistic during bear markets." },
  { term: "Beta", definition: "A number that shows how much a stock moves compared to the overall market. A beta of 1 means it moves with the market. Above 1 means more volatile, below 1 means less." },
  { term: "Blue Chip", definition: "A large, well-known company with a strong track record of stable earnings and reliable dividends. Think of names like Apple, Johnson & Johnson, or Coca-Cola." },
  { term: "Bull Market", definition: "A market where prices are rising or expected to rise. Investors are optimistic and confident during bull markets." },
  { term: "Day Trading", definition: "Buying and selling stocks within the same trading day. Day traders try to profit from short-term price movements and close all positions before the market closes." },
  { term: "Diversification", definition: "Spreading your money across different investments to reduce risk. If one stock drops, others may hold steady or rise, protecting your overall portfolio." },
  { term: "Dividend Yield", definition: "The annual dividend payment divided by the stock price, shown as a percentage. A 3% yield means you earn $3 per year for every $100 invested." },
  { term: "EPS", definition: "Earnings Per Share. A company's profit divided by the number of shares outstanding. Higher EPS generally means the company is more profitable per share." },
  { term: "ETF", definition: "Exchange-Traded Fund. A basket of stocks or bonds that trades on an exchange like a single stock. ETFs let you invest in many companies at once." },
  { term: "Fundamental Analysis", definition: "Evaluating a stock by looking at the company's financials, earnings, revenue, and business model to determine if it's a good investment." },
  { term: "Growth Stock", definition: "A stock of a company expected to grow its revenue and earnings faster than average. These stocks often reinvest profits instead of paying dividends." },
  { term: "IPO", definition: "Initial Public Offering. When a private company sells shares to the public for the first time, allowing anyone to buy and trade its stock." },
  { term: "Limit Order", definition: "An order to buy or sell a stock at a specific price or better. A buy limit order only executes at or below your set price." },
  { term: "MACD", definition: "Moving Average Convergence Divergence. A technical indicator that shows the relationship between two moving averages. Traders use it to spot trend changes and momentum." },
  { term: "Market Cap", definition: "The total value of a company's outstanding shares. Calculated by multiplying the stock price by the number of shares. It tells you how big a company is." },
  { term: "Market Order", definition: "An order to buy or sell a stock immediately at the current market price. It's the fastest way to trade but you might not get the exact price you see." },
  { term: "Moving Average", definition: "The average price of a stock over a set period (like 50 or 200 days). It smooths out price swings and helps identify trends." },
  { term: "Mutual Fund", definition: "A pool of money from many investors that is managed by a professional. The manager picks stocks or bonds on behalf of all the investors in the fund." },
  { term: "Options", definition: "Contracts that give you the right (but not the obligation) to buy or sell a stock at a set price before a certain date. They can be used for hedging or speculation." },
  { term: "P/E Ratio", definition: "Price-to-Earnings Ratio. The stock price divided by earnings per share. A high P/E may mean the stock is expensive or that investors expect strong growth." },
  { term: "Penny Stock", definition: "A stock that trades for less than $5 per share, often from very small companies. Penny stocks are highly risky and can be very volatile." },
  { term: "Portfolio", definition: "The collection of all your investments, including stocks, bonds, ETFs, and cash. A well-built portfolio balances risk and reward." },
  { term: "Resistance", definition: "A price level where a stock tends to stop rising and may pull back. Sellers often step in near resistance levels, creating a ceiling." },
  { term: "RSI", definition: "Relative Strength Index. A number from 0 to 100 that shows if a stock is overbought (above 70) or oversold (below 30). Traders use it to time entries and exits." },
  { term: "Short Selling", definition: "Borrowing shares and selling them, hoping the price will drop so you can buy them back cheaper. You profit from the difference, but losses can be unlimited if the price rises." },
  { term: "Stop-Loss", definition: "An order that automatically sells your stock if it falls to a certain price. It's a safety net to limit your losses on a trade." },
  { term: "Support", definition: "A price level where a stock tends to stop falling and may bounce back up. Buyers often step in near support levels, creating a floor." },
  { term: "Swing Trading", definition: "Holding stocks for days to weeks to profit from expected price swings. Swing traders look for short-to-medium-term patterns and trends." },
  { term: "Technical Analysis", definition: "Studying stock charts, patterns, and indicators to predict future price movements. It focuses on price and volume data rather than company fundamentals." },
  { term: "Value Stock", definition: "A stock that appears to be trading below its true worth based on fundamentals. Value investors look for bargains the market has overlooked." },
  { term: "Volatility", definition: "How much a stock's price moves up and down over time. High volatility means big swings, which means more risk but also more opportunity." },
  { term: "Volume", definition: "The number of shares traded in a given period. High volume means lots of activity and interest. Low volume can mean a stock is harder to buy or sell quickly." },
];

export default function Glossary() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TERMS;
    return TERMS.filter(
      (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, Term[]> = {};
    for (const t of filtered) {
      const letter = t.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (term: string) => {
    setExpanded((prev) => (prev === term ? null : term));
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <BookOpen size={13} /> Total terms
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">{TERMS.length}</div>
        </div>
        <div className="rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-1">
            <Hash size={13} /> Showing
          </div>
          <div className="mt-1 text-lg metric-value font-semibold">
            {filtered.length} {filtered.length !== TERMS.length && `of ${TERMS.length}`}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms or definitions..."
          className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 pl-8 pr-3 py-2 text-sm"
        />
      </div>

      {/* Letter groups */}
      {grouped.length === 0 && (
        <div className="rounded-xl control-surface p-4 text-sm muted">
          No terms match your search. Try a different keyword.
        </div>
      )}

      {grouped.map(([letter, terms]) => (
        <div key={letter} className="space-y-1">
          <div className="text-[11px] tracking-[0.12em] uppercase font-semibold px-1 mt-3" style={{ color: "var(--accent)" }}>
            {letter}
          </div>
          <div className="space-y-1">
            {terms.map((t) => {
              const isOpen = expanded === t.term;
              return (
                <div key={t.term} className="rounded-2xl surface-glass dynamic-surface fade-up overflow-hidden">
                  <button
                    onClick={() => toggle(t.term)}
                    className="w-full flex items-center gap-2 p-4 sm:p-5 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown size={14} className="flex-shrink-0" style={{ color: "var(--accent)" }} />
                    ) : (
                      <ChevronRight size={14} className="flex-shrink-0 muted" />
                    )}
                    <span className="font-semibold text-sm section-title">{t.term}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                      <div className="rounded-xl control-surface p-3">
                        <p className="text-sm muted leading-relaxed">{t.definition}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
