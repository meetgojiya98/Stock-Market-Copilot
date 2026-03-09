"use client";

import { useState, useRef, useEffect } from "react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { streamAgent } from "../../lib/agents/run-agent";
import {
  UserCheck,
  Search,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Activity,
} from "lucide-react";

/* ── Types ── */
type InsiderTrade = {
  name: string;
  title: string;
  type: "Buy" | "Sell";
  shares: number;
  price: number;
  value: number;
  date: string;
};

/* ── Deterministic seed from symbol string ── */
function hashSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/* ── Generate mock insider trades ── */
function generateInsiderTrades(symbol: string, currentPrice: number): InsiderTrade[] {
  const seed = hashSeed(symbol);
  const rand = seededRandom(seed);

  const executives = [
    { name: "James Mitchell", title: "CEO" },
    { name: "Sarah Chen", title: "CFO" },
    { name: "Robert Williams", title: "COO" },
    { name: "Emily Parker", title: "VP Engineering" },
    { name: "Michael Torres", title: "Director" },
    { name: "Lisa Anderson", title: "SVP Sales" },
    { name: "David Kim", title: "VP Product" },
    { name: "Jennifer Scott", title: "General Counsel" },
    { name: "Thomas Brown", title: "Director" },
    { name: "Amanda Foster", title: "CTO" },
  ];

  const count = 8 + Math.floor(rand() * 3); // 8-10 trades
  const trades: InsiderTrade[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const exec = executives[i % executives.length];
    const isBuy = rand() > 0.45;
    const daysAgo = Math.floor(rand() * 60) + 1;
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const priceVariation = currentPrice * (0.92 + rand() * 0.16);
    const price = Math.round(priceVariation * 100) / 100;
    const shares = Math.floor((500 + rand() * 49500) / 100) * 100;
    const value = Math.round(shares * price * 100) / 100;

    trades.push({
      name: exec.name,
      title: exec.title,
      type: isBuy ? "Buy" : "Sell",
      shares,
      price,
      value,
      date: date.toISOString().split("T")[0],
    });
  }

  return trades.sort((a, b) => b.date.localeCompare(a.date));
}

/* ── Format helpers ── */
function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

/* ── Simple Markdown Renderer ── */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-[15px] font-bold text-[var(--ink)] mt-5 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-[var(--ink)] mt-6 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.match(/^[\s]*[-*]\s/)) {
      elements.push(
        <li key={i} className="ml-4 pl-1 text-sm text-[var(--ink)] leading-[1.7] list-disc">
          {renderInlineText(line.replace(/^[\s]*[-*]\s/, ""))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-[var(--ink)] leading-[1.7] my-0.5">
          {renderInlineText(line)}
        </p>
      );
    }
  }

  return elements;
}

function renderInlineText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold text-[var(--ink)]">{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] text-[var(--accent-2)] text-xs font-mono">
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/* ── Main Page ── */
export default function InsidersPage() {
  const [symbol, setSymbol] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [aiResult]);

  const handleSearch = async () => {
    const sym = inputValue.trim().toUpperCase();
    if (!sym) return;

    setLoading(true);
    setError("");
    setTrades([]);
    setAiResult("");

    try {
      const res = await fetch(`/api/stocks/quote?symbol=${sym}`);
      if (!res.ok) {
        setError("Symbol not found. Please enter a valid ticker.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      const price = data.price || data.c || data.latestPrice || 150;
      setSymbol(sym);
      setTrades(generateInsiderTrades(sym, price));
    } catch {
      setError("Failed to fetch stock data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalysis = () => {
    if (!symbol || !trades.length) return;
    setAiLoading(true);
    setAiResult("");

    const tradesSummary = trades
      .map((t) => `${t.date}: ${t.name} (${t.title}) ${t.type} ${fmtNum(t.shares)} shares at $${t.price.toFixed(2)} ($${fmtNum(t.value)})`)
      .join("\n");

    streamAgent(
      "research-analyst",
      [symbol],
      `Analyze insider trading patterns for ${symbol}. Here is the recent insider activity:\n\n${tradesSummary}\n\nProvide insights on:\n1. Overall insider sentiment (bullish/bearish)\n2. Notable large transactions\n3. Patterns in buying/selling by role\n4. What this might signal for investors\n5. Historical context of insider trading accuracy`,
      (text) => setAiResult(text),
      () => setAiLoading(false),
    );
  };

  // Compute summary stats
  const totalBuyVolume = trades.filter((t) => t.type === "Buy").reduce((sum, t) => sum + t.value, 0);
  const totalSellVolume = trades.filter((t) => t.type === "Sell").reduce((sum, t) => sum + t.value, 0);
  const buyCount = trades.filter((t) => t.type === "Buy").length;
  const sellCount = trades.filter((t) => t.type === "Sell").length;
  const ratio = sellCount > 0 ? (buyCount / sellCount).toFixed(2) : buyCount > 0 ? "N/A" : "0";
  const netActivity = totalBuyVolume - totalSellVolume;

  return (
    <AuthGuard>
      <PageShell title="Insider Trading" subtitle="Track insider buying and selling activity">
        <div className="space-y-5">
          {/* ── Search Bar ── */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={16} style={{ color: "var(--accent-2)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Search Insider Activity
              </span>
            </div>
            <div className="flex gap-3 mt-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter symbol (e.g. AAPL)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] text-sm font-mono text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] transition-all"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !inputValue.trim()}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 80%, #8b5cf6))",
                  boxShadow: loading || !inputValue.trim() ? "none" : "0 2px 12px color-mix(in srgb, var(--accent-2) 30%, transparent)",
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>
            {error && <p className="text-xs mt-2" style={{ color: "var(--negative)" }}>{error}</p>}
          </div>

          {/* ── Summary Stats ── */}
          {trades.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="stat-card-label">Total Buy Volume</span>
                    <TrendingUp size={13} style={{ color: "var(--positive)" }} />
                  </div>
                  <div className="stat-card-value" style={{ color: "var(--positive)" }}>{fmtCurrency(totalBuyVolume)}</div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="stat-card-label">Total Sell Volume</span>
                    <TrendingDown size={13} style={{ color: "var(--negative)" }} />
                  </div>
                  <div className="stat-card-value" style={{ color: "var(--negative)" }}>{fmtCurrency(totalSellVolume)}</div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="stat-card-label">Buy/Sell Ratio</span>
                    <ArrowUpDown size={13} style={{ color: "var(--accent-2)" }} />
                  </div>
                  <div className="stat-card-value">{ratio}</div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="stat-card-label">Net Activity</span>
                    <Activity size={13} style={{ color: netActivity >= 0 ? "var(--positive)" : "var(--negative)" }} />
                  </div>
                  <div className="stat-card-value" style={{ color: netActivity >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {netActivity >= 0 ? "+" : ""}{fmtCurrency(Math.abs(netActivity))}
                  </div>
                </div>
              </div>

              {/* ── Trades Table ── */}
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                      Insider Transactions
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                      style={{
                        background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                        color: "var(--accent-2)",
                      }}
                    >
                      {symbol}
                    </span>
                  </div>
                  <button
                    onClick={handleAiAnalysis}
                    disabled={aiLoading}
                    className="px-4 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 80%, #8b5cf6))",
                      boxShadow: aiLoading ? "none" : "0 2px 12px color-mix(in srgb, var(--accent-2) 30%, transparent)",
                    }}
                  >
                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Analysis
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-left text-[10px] uppercase tracking-wider font-semibold"
                        style={{ color: "var(--ink-muted)", borderBottom: "1px solid var(--border)" }}
                      >
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Insider Name</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Shares</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade, i) => (
                        <tr
                          key={i}
                          className="transition-colors hover:bg-[color-mix(in_srgb,var(--accent-2)_4%,transparent)]"
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                            {trade.date}
                          </td>
                          <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
                            {trade.name}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--ink-muted)" }}>
                            {trade.title}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                background: trade.type === "Buy"
                                  ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                                  : "color-mix(in srgb, var(--negative) 12%, transparent)",
                                color: trade.type === "Buy" ? "var(--positive)" : "var(--negative)",
                              }}
                            >
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                            {fmtNum(trade.shares)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                            ${trade.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-semibold" style={{ color: "var(--ink)" }}>
                            {fmtCurrency(trade.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── AI Analysis Result ── */}
              {(aiResult || aiLoading) && (
                <div ref={resultRef} className="glass-card p-6 max-h-[60vh] overflow-y-auto">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 60%, #8b5cf6))",
                      }}
                    >
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[var(--ink)]">Insider Trading Analysis</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                            color: "var(--accent-2)",
                          }}
                        >
                          {symbol}
                        </span>
                        {aiLoading && (
                          <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
                            <Loader2 size={10} className="animate-spin" /> Analyzing...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="prose-custom">{renderMarkdown(aiResult)}</div>
                </div>
              )}
            </>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  );
}
