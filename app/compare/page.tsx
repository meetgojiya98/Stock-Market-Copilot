"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import Sparkline from "../../components/Sparkline";
import { streamAgent } from "../../lib/agents/run-agent";

/* ── Types ── */
type StockData = {
  symbol: string;
  price?: number;
  change?: string;
  changePercent?: string;
  chartData?: number[];
  loading: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
};

const POPULAR = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "JPM"];

/** Extract readable markdown from raw text that might be JSON */
function extractReadableContent(raw: string): string {
  // If it looks like JSON, try to extract the "details" field
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("```json") || trimmed.startsWith("```\n{")) {
    // Strip code fences
    const cleaned = trimmed.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.details) return parsed.details;
      if (parsed.summary && parsed.signals) {
        // Build readable output from structured JSON
        let md = `## ${parsed.summary}\n\n`;
        if (Array.isArray(parsed.signals)) {
          for (const s of parsed.signals) {
            const icon = s.type === "bullish" ? "🟢" : s.type === "bearish" ? "🔴" : "🟡";
            md += `${icon} **${s.symbol}** — ${s.message} (${s.confidence}% confidence)\n\n`;
          }
        }
        if (parsed.details) md += `\n---\n\n${parsed.details}`;
        return md;
      }
    } catch {
      // JSON is incomplete (still streaming) — try partial extraction
      const detailsMatch = cleaned.match(/"details"\s*:\s*"([\s\S]+?)(?:"\s*[,}]|$)/);
      if (detailsMatch) {
        return detailsMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }
      // If we can't parse at all, show nothing during streaming rather than raw JSON
      if (trimmed.startsWith("{")) return "";
    }
  }
  return raw;
}

const QUICK_PROMPTS = [
  "Which stock is a better buy right now?",
  "Compare valuations and growth",
  "Risk analysis for each",
  "Technical analysis comparison",
];

/* ── Lightweight markdown renderer ── */
function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      parts.push(<strong key={`b-${match.index}`} className="font-semibold text-[var(--ink)]">{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(
        <code key={`c-${match.index}`} className="px-1.5 py-0.5 rounded-md text-[0.85em] font-mono bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] text-[var(--accent-2)]">
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-2 ml-4 space-y-1 list-disc text-sm text-[var(--ink)]">
        {listBuffer.map((item, i) => <li key={i} className="leading-relaxed">{inlineFormat(item)}</li>)}
      </ul>
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      flushList();
      const lvl = hm[1].length;
      const cls = lvl === 1 ? "text-base font-bold mt-4 mb-2" : lvl === 2 ? "text-[15px] font-bold mt-3.5 mb-1.5" : "text-sm font-semibold mt-3 mb-1";
      elements.push(<div key={`h-${i}`} className={`${cls} text-[var(--ink)]`}>{inlineFormat(hm[2])}</div>);
      continue;
    }
    const bm = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (bm) { listBuffer.push(bm[1]); continue; }
    const nm = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
    if (nm) {
      flushList();
      elements.push(
        <div key={`num-${i}`} className="flex gap-2 my-0.5 text-sm text-[var(--ink)]">
          <span className="text-[var(--accent-2)] font-semibold shrink-0">{nm[1]}.</span>
          <span className="leading-relaxed">{inlineFormat(nm[2])}</span>
        </div>
      );
      continue;
    }
    flushList();
    if (line.trim() === "") { elements.push(<div key={`br-${i}`} className="h-2" />); continue; }
    elements.push(<p key={`p-${i}`} className="text-sm leading-[1.7] text-[var(--ink)] my-0.5">{inlineFormat(line)}</p>);
  }
  flushList();
  return elements;
}

/* ── Typing dots ── */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--accent-2)]"
          style={{ animation: "compareDotBounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <style>{`@keyframes compareDotBounce { 0%,60%,100%{opacity:.25;transform:translateY(0)} 30%{opacity:1;transform:translateY(-3px)} }`}</style>
    </span>
  );
}

/* ── Main Page ── */
export default function ComparePage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [stocks, setStocks] = useState<Record<string, StockData>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const addSymbol = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s || symbols.includes(s) || symbols.length >= 4) return;
    setSymbols((prev) => [...prev, s]);
    setInput("");
  };

  const removeSymbol = (sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
    setStocks((prev) => { const next = { ...prev }; delete next[sym]; return next; });
  };

  // Fetch data for each symbol
  useEffect(() => {
    for (const sym of symbols) {
      if (stocks[sym] && !stocks[sym].loading) continue;
      setStocks((prev) => ({ ...prev, [sym]: { symbol: sym, loading: true } }));
      (async () => {
        try {
          const [priceRes, chartRes] = await Promise.all([
            fetch(`/api/stocks/price?symbol=${sym}`),
            fetch(`/api/stocks/chart?symbol=${sym}&limit=30`),
          ]);
          const priceData = priceRes.ok ? await priceRes.json() : {};
          const chartData = chartRes.ok ? await chartRes.json() : {};
          const closes = (chartData.data || []).map((d: { close: number }) => d.close).reverse();
          setStocks((prev) => ({
            ...prev,
            [sym]: { symbol: sym, price: priceData.price, change: priceData.change, changePercent: priceData.changePercent, chartData: closes, loading: false },
          }));
        } catch {
          setStocks((prev) => ({ ...prev, [sym]: { ...prev[sym], loading: false } }));
        }
      })();
    }
  }, [symbols]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming || symbols.length < 2) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const agentMsgId = crypto.randomUUID();
    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: "agent",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setChatInput("");
    setIsStreaming(true);

    const context = `${text.trim()}\n\nStocks being compared: ${symbols.join(" vs ")}. Provide detailed analysis with markdown formatting. Be specific with numbers and data.\n\nIMPORTANT: Respond ONLY in clean markdown. Do NOT wrap your response in JSON. Do NOT use \`\`\`json code blocks. Write your analysis directly as readable markdown with headers, bullet points, and tables.`;

    await streamAgent(
      "research-analyst",
      symbols,
      context,
      (fullText) => {
        // Try to extract markdown from JSON if the model returns JSON anyway
        const display = extractReadableContent(fullText);
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMsgId ? { ...m, content: display } : m))
        );
      },
      (result) => {
        // Use parsed details from the result which extracts from JSON properly
        const finalContent = result.details || extractReadableContent("");
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMsgId ? { ...m, content: finalContent, isStreaming: false } : m))
        );
        setIsStreaming(false);
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setIsStreaming(false);
  };

  const isPositive = (change?: string) => !change?.startsWith("-");

  return (
    <AuthGuard>
      <PageShell title="Compare Stocks" subtitle="Side-by-side analysis with AI-powered conversation">
        <div className="flex flex-col gap-4 h-[calc(100vh-180px)] min-h-[500px]">

          {/* ── Symbol Input Bar ── */}
          <div className="glass-card p-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                {symbols.map((sym) => {
                  const data = stocks[sym];
                  const positive = isPositive(data?.change);
                  return (
                    <div
                      key={sym}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background: "color-mix(in srgb, var(--accent-2) 6%, transparent)",
                        borderColor: "color-mix(in srgb, var(--accent-2) 20%, transparent)",
                        color: "var(--ink)",
                      }}
                    >
                      <span className="font-bold">{sym}</span>
                      {data?.price && (
                        <span className={`tabular-nums ${positive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                          ${data.price.toFixed(2)}
                        </span>
                      )}
                      {data?.loading && (
                        <span className="w-3 h-3 border-2 border-[var(--accent-2)] border-t-transparent rounded-full animate-spin" />
                      )}
                      <button onClick={() => removeSymbol(sym)} className="ml-0.5 text-[var(--ink-muted)] hover:text-[var(--negative)] transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                {symbols.length < 4 && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && addSymbol(input)}
                      placeholder={symbols.length === 0 ? "Add stocks to compare..." : "+ Add"}
                      className="bg-transparent text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] outline-none w-28"
                      maxLength={10}
                    />
                    {input.trim() && (
                      <button onClick={() => addSymbol(input)} className="p-1 rounded-md text-white" style={{ background: "var(--accent-2)" }}>
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {symbols.length > 0 && (
                <button
                  onClick={() => setShowCards((v) => !v)}
                  className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors shrink-0"
                  title={showCards ? "Hide cards" : "Show cards"}
                >
                  <ChevronDown size={14} className={`transition-transform ${showCards ? "" : "-rotate-90"}`} />
                </button>
              )}
            </div>
            {/* Quick add chips */}
            {symbols.length < 2 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-[var(--surface-border)]">
                <span className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)] font-medium self-center mr-1">Popular:</span>
                {POPULAR.filter((s) => !symbols.includes(s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSymbol(s)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-[var(--ink-muted)] hover:text-[var(--accent-2)] border border-[var(--surface-border)] hover:border-[var(--accent-2)] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Stock Comparison Cards ── */}
          {symbols.length > 0 && showCards && (
            <div className={`grid gap-3 shrink-0 ${symbols.length === 1 ? "grid-cols-1" : symbols.length === 2 ? "grid-cols-2" : symbols.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
              {symbols.map((sym) => {
                const data = stocks[sym];
                const positive = isPositive(data?.change);
                return (
                  <div key={sym} className="glass-card p-4 relative group">
                    <button
                      onClick={() => removeSymbol(sym)}
                      className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--ink-muted)] hover:text-[var(--negative)] transition-all"
                    >
                      <X size={14} />
                    </button>
                    <div className="text-sm font-bold text-[var(--ink-muted)] mb-0.5">{sym}</div>
                    {data?.loading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="w-20 h-6 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
                        <div className="w-full h-10 rounded bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]" />
                      </div>
                    ) : data?.price ? (
                      <>
                        <div className="text-xl font-bold text-[var(--ink)] tabular-nums">
                          ${data.price.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 mt-1 mb-2">
                          {positive ? <TrendingUp size={11} className="text-[var(--positive)]" /> : <TrendingDown size={11} className="text-[var(--negative)]" />}
                          <span className={`text-[11px] font-semibold tabular-nums ${positive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                            {data.change} ({data.changePercent})
                          </span>
                        </div>
                        {data.chartData && data.chartData.length > 1 && (
                          <Sparkline data={data.chartData} width={200} height={40} color={positive ? "var(--positive)" : "var(--negative)"} />
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-[var(--ink-muted)]">Loading...</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Chat Area ── */}
          <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--surface-border)] shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--accent-2) 12%, transparent)" }}
                >
                  <Bot size={13} className="text-[var(--accent-2)]" />
                </div>
                <span className="text-sm font-semibold text-[var(--ink)]">Research Analyst</span>
                {isStreaming && (
                  <span className="text-[10px] font-medium text-[var(--accent-2)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] animate-pulse" />
                    Analyzing
                  </span>
                )}
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                  title="Clear chat"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  {symbols.length < 2 ? (
                    <>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: "color-mix(in srgb, var(--accent-2) 8%, transparent)" }}
                      >
                        <Sparkles size={22} className="text-[var(--accent-2)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--ink)] mb-1">Add at least 2 stocks</p>
                      <p className="text-xs text-[var(--ink-muted)] max-w-xs">
                        Select stocks above to start comparing. The AI analyst will help you analyze them side by side.
                      </p>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: "color-mix(in srgb, var(--accent-2) 8%, transparent)" }}
                      >
                        <Zap size={22} className="text-[var(--accent-2)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--ink)] mb-1">
                        Ready to compare {symbols.join(" vs ")}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)] max-w-xs mb-4">
                        Ask anything about these stocks or use a quick prompt below.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                        {QUICK_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => sendMessage(prompt)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--surface-border)] hover:border-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_4%,transparent)] transition-all group"
                          >
                            <ArrowRight size={12} className="text-[var(--ink-muted)] group-hover:text-[var(--accent-2)] shrink-0 transition-colors" />
                            <span>{prompt}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="px-4 pb-3 pt-2 border-t border-[var(--surface-border)] shrink-0">
              {symbols.length >= 2 && messages.length > 0 && !isStreaming && (
                <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                  {["Deeper analysis", "Bull vs bear case", "Entry/exit levels", "Compare fundamentals"].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--ink-muted)] hover:text-[var(--accent-2)] border border-[var(--surface-border)] hover:border-[var(--accent-2)] transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={symbols.length < 2 ? "Add at least 2 stocks to start..." : `Ask about ${symbols.join(" vs ")}...`}
                  disabled={symbols.length < 2 || isStreaming}
                  rows={1}
                  className="flex-1 bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] outline-none rounded-xl px-4 py-2.5 resize-none disabled:opacity-40 focus:ring-1 focus:ring-[var(--accent-2)] transition-all"
                  style={{ maxHeight: 120 }}
                />
                <button
                  onClick={() => sendMessage(chatInput)}
                  disabled={!chatInput.trim() || symbols.length < 2 || isStreaming}
                  className="p-2.5 rounded-xl text-white transition-all disabled:opacity-30 shrink-0"
                  style={{ background: "var(--accent-2)" }}
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] mt-1.5 text-center opacity-60">
                Press Enter to send · Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}

/* ── Chat Bubble Component ── */
function ChatBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%]">
          <div className="flex items-center gap-2 mb-1 justify-end">
            <span className="text-[10px] text-[var(--ink-muted)]">{time}</span>
          </div>
          <div
            className="inline-block text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-md text-white"
            style={{ background: "var(--accent-2)", boxShadow: "0 2px 12px color-mix(in srgb, var(--accent-2) 20%, transparent)" }}
          >
            {message.content}
          </div>
        </div>
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--accent-2) 12%, transparent)", color: "var(--accent-2)" }}
        >
          <User size={14} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: "color-mix(in srgb, var(--accent-3) 12%, transparent)", color: "var(--accent-3)" }}
      >
        <Bot size={14} />
      </div>
      <div className="flex-1 min-w-0 max-w-[90%] group">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-[var(--ink)]">Research Analyst</span>
          <span className="text-[10px] text-[var(--ink-muted)]">{time}</span>
        </div>
        <div
          className="rounded-2xl rounded-tl-md px-4 py-3 relative"
          style={{ background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}
        >
          {message.content ? (
            <div className="text-sm leading-[1.7] text-[var(--ink)]">
              {renderMarkdown(message.content)}
            </div>
          ) : null}
          {message.isStreaming && <TypingDots />}
          {message.isStreaming && !message.content && (
            <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] py-1">
              <div className="w-4 h-4 border-2 border-[var(--accent-2)] border-t-transparent rounded-full animate-spin" />
              <span>Gathering data and analyzing...</span>
            </div>
          )}
          {/* Copy button */}
          {!message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-[var(--surface)] shadow-sm border border-[var(--surface-border)] hover:border-[var(--accent-2)] text-[var(--ink-muted)] hover:text-[var(--accent-2)] transition-all"
              title="Copy"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
