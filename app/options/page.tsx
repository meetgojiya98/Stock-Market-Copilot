"use client";

import { useState, useRef, useEffect } from "react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { streamAgent } from "../../lib/agents/run-agent";
import {
  GitBranch,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";

/* ── Types ── */
type OptionRow = {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  iv: number;
  delta: number;
  gamma: number;
};

/* ── Deterministic random ── */
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

/* ── Generate expiration dates (4 weekly Fridays from now) ── */
function generateExpirations(): string[] {
  const dates: string[] = [];
  const now = new Date();
  // Find next Friday
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);

  for (let i = 0; i < 4; i++) {
    const d = new Date(nextFriday);
    d.setDate(nextFriday.getDate() + i * 7);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

/* ── Normal CDF approximation for Black-Scholes delta ── */
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

/* ── Generate mock options chain ── */
function generateOptionsChain(
  symbol: string,
  currentPrice: number,
  expDate: string,
  isCall: boolean,
): OptionRow[] {
  const seed = hashSeed(symbol + expDate + (isCall ? "C" : "P"));
  const rand = seededRandom(seed);

  // Calculate DTE
  const now = new Date();
  const exp = new Date(expDate);
  const dte = Math.max(1, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const timeToExp = dte / 365;

  // Round to nearest $5 for strike base
  const baseStrike = Math.round(currentPrice / 5) * 5;
  const strikes: number[] = [];
  for (let i = -5; i <= 4; i++) {
    strikes.push(baseStrike + i * 5);
  }

  return strikes.map((strike) => {
    const moneyness = currentPrice / strike;
    const logMoneyness = Math.log(moneyness);

    // Implied volatility: base 25-45%, higher for OTM
    const baseIV = 0.25 + rand() * 0.20;
    const skew = Math.abs(logMoneyness) * 0.15;
    const iv = baseIV + skew;

    // Simplified Black-Scholes delta
    const d1 = (logMoneyness + (0.05 + iv * iv / 2) * timeToExp) / (iv * Math.sqrt(timeToExp));
    const rawDelta = isCall ? normCdf(d1) : normCdf(d1) - 1;
    const delta = Math.round(rawDelta * 1000) / 1000;

    // Gamma
    const gammaPeak = Math.exp(-d1 * d1 / 2) / (strike * iv * Math.sqrt(2 * Math.PI * timeToExp));
    const gamma = Math.round(gammaPeak * 10000) / 10000;

    // Price approximation
    const itm = isCall ? Math.max(0, currentPrice - strike) : Math.max(0, strike - currentPrice);
    const timeValue = currentPrice * iv * Math.sqrt(timeToExp) * 0.4 * (0.8 + rand() * 0.4);
    const theoreticalPrice = itm + timeValue * Math.max(0.05, 1 - Math.abs(logMoneyness) * 2);

    const mid = Math.max(0.01, Math.round(theoreticalPrice * 100) / 100);
    const spread = Math.max(0.01, mid * (0.02 + rand() * 0.06));
    const bid = Math.max(0.01, Math.round((mid - spread / 2) * 100) / 100);
    const ask = Math.round((mid + spread / 2) * 100) / 100;
    const last = Math.round((bid + rand() * (ask - bid)) * 100) / 100;

    const volume = Math.floor(rand() * 5000);
    const openInterest = Math.floor(500 + rand() * 20000);

    return {
      strike,
      bid,
      ask,
      last,
      volume,
      openInterest,
      iv: Math.round(iv * 10000) / 100,
      delta,
      gamma,
    };
  });
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
export default function OptionsPage() {
  const [symbol, setSymbol] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [chain, setChain] = useState<OptionRow[]>([]);
  const [tab, setTab] = useState<"Calls" | "Puts">("Calls");
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState("");
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

  // Regenerate chain when tab or expiration changes
  useEffect(() => {
    if (symbol && currentPrice && selectedExp) {
      setChain(generateOptionsChain(symbol, currentPrice, selectedExp, tab === "Calls"));
    }
  }, [symbol, currentPrice, selectedExp, tab]);

  const handleSearch = async () => {
    const sym = inputValue.trim().toUpperCase();
    if (!sym) return;

    setLoading(true);
    setError("");
    setChain([]);
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
      setCurrentPrice(price);

      const exps = generateExpirations();
      setExpirations(exps);
      setSelectedExp(exps[0]);
      setTab("Calls");
      setChain(generateOptionsChain(sym, price, exps[0], true));
    } catch {
      setError("Failed to fetch stock data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalysis = () => {
    if (!symbol || !chain.length) return;
    setAiLoading(true);
    setAiResult("");

    const chainSummary = chain
      .map((o) => `Strike $${o.strike}: Bid ${o.bid} Ask ${o.ask} Vol ${o.volume} OI ${o.openInterest} IV ${o.iv}% Delta ${o.delta}`)
      .join("\n");

    streamAgent(
      "research-analyst",
      [symbol],
      `Analyze the options chain for ${symbol} (current price: $${currentPrice.toFixed(2)}).\nType: ${tab}\nExpiration: ${selectedExp}\n\n${chainSummary}\n\nProvide insights on:\n1. Unusual volume or open interest patterns\n2. Implied volatility skew analysis\n3. Suggested options strategies based on the chain\n4. Key strike levels to watch\n5. Risk/reward assessment`,
      (text) => setAiResult(text),
      () => setAiLoading(false),
    );
  };

  // Greeks summary
  const avgIV = chain.length ? chain.reduce((s, o) => s + o.iv, 0) / chain.length : 0;
  const avgDelta = chain.length ? chain.reduce((s, o) => s + Math.abs(o.delta), 0) / chain.length : 0;
  const avgGamma = chain.length ? chain.reduce((s, o) => s + o.gamma, 0) / chain.length : 0;
  const totalVolume = chain.reduce((s, o) => s + o.volume, 0);
  const totalOI = chain.reduce((s, o) => s + o.openInterest, 0);

  return (
    <AuthGuard>
      <PageShell title="Options Chain" subtitle="View options pricing, Greeks, and implied volatility">
        <div className="space-y-5">
          {/* ── Search Bar ── */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={16} style={{ color: "var(--accent-2)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Options Chain Viewer
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

          {/* ── Options Chain Content ── */}
          {chain.length > 0 && (
            <>
              {/* ── Controls: Expiration Selector + Calls/Puts Toggle ── */}
              <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                      {symbol}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--ink-muted)" }}>
                      ${currentPrice.toFixed(2)}
                    </span>
                    <select
                      value={selectedExp}
                      onChange={(e) => setSelectedExp(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent-2)] transition-all"
                    >
                      {expirations.map((exp) => (
                        <option key={exp} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)]">
                    {(["Calls", "Puts"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: tab === t
                            ? "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 80%, #8b5cf6))"
                            : "transparent",
                          color: tab === t ? "white" : "var(--ink-muted)",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Options Table ── */}
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {tab} — Exp: {selectedExp}
                  </span>
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
                    AI Options Analysis
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-left text-[10px] uppercase tracking-wider font-semibold"
                        style={{ color: "var(--ink-muted)", borderBottom: "1px solid var(--border)" }}
                      >
                        <th className="px-4 py-3">Strike</th>
                        <th className="px-4 py-3 text-right">Bid</th>
                        <th className="px-4 py-3 text-right">Ask</th>
                        <th className="px-4 py-3 text-right">Last</th>
                        <th className="px-4 py-3 text-right">Volume</th>
                        <th className="px-4 py-3 text-right">OI</th>
                        <th className="px-4 py-3 text-right">IV%</th>
                        <th className="px-4 py-3 text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chain.map((row, i) => {
                        const isITM = tab === "Calls"
                          ? row.strike < currentPrice
                          : row.strike > currentPrice;

                        return (
                          <tr
                            key={i}
                            className="transition-colors hover:bg-[color-mix(in_srgb,var(--accent-2)_4%,transparent)]"
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background: isITM
                                ? "color-mix(in srgb, var(--accent-2) 4%, transparent)"
                                : undefined,
                            }}
                          >
                            <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                              ${row.strike.toFixed(2)}
                              {isITM && (
                                <span
                                  className="ml-1.5 text-[9px] px-1 py-0.5 rounded font-semibold"
                                  style={{
                                    background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
                                    color: "var(--accent-2)",
                                  }}
                                >
                                  ITM
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                              {row.bid.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                              {row.ask.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                              {row.last.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                              {row.volume.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                              {row.openInterest.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                              {row.iv.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--ink)" }}>
                              {row.delta.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* ── Greeks Summary Row ── */}
                    <tfoot>
                      <tr
                        className="text-[10px] uppercase tracking-wider font-bold"
                        style={{
                          color: "var(--accent-2)",
                          borderTop: "2px solid var(--border)",
                          background: "color-mix(in srgb, var(--accent-2) 3%, transparent)",
                        }}
                      >
                        <td className="px-4 py-3">Summary</td>
                        <td className="px-4 py-3 text-right" />
                        <td className="px-4 py-3 text-right" />
                        <td className="px-4 py-3 text-right" />
                        <td className="px-4 py-3 text-right font-mono">{totalVolume.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">{totalOI.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">Avg {avgIV.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right font-mono">
                          Avg {avgDelta.toFixed(3)} | &gamma; {avgGamma.toFixed(4)}
                        </td>
                      </tr>
                    </tfoot>
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
                      <span className="text-sm font-bold text-[var(--ink)]">Options Analysis</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                            color: "var(--accent-2)",
                          }}
                        >
                          {symbol} {tab}
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
