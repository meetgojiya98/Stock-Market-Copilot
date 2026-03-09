"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  Search,
} from "lucide-react";

/* ── Markdown Renderer ── */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-[15px] font-bold text-[var(--ink)] mt-5 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-[var(--ink)] mt-6 mb-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[\s]*[-*]\s/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s/)) {
        items.push(
          <li key={i} className="ml-4 pl-1 text-sm text-[var(--ink)] leading-[1.7] list-disc">
            {renderInline(lines[i].replace(/^[\s]*[-*]\s/, ""))}
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="my-2 space-y-0.5">{items}</ul>);
      continue;
    }

    // Numbered list
    if (line.match(/^[\s]*\d+\.\s/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s/)) {
        items.push(
          <li key={i} className="ml-4 pl-1 text-sm text-[var(--ink)] leading-[1.7] list-decimal">
            {renderInline(lines[i].replace(/^[\s]*\d+\.\s/, ""))}
          </li>
        );
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="my-2 space-y-0.5">{items}</ol>);
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-sm text-[var(--ink)] leading-[1.7] my-0.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode[] {
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

/* ── Skeleton ── */
function SkeletonBlock() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded-md"
          style={{
            width: `${60 + Math.random() * 40}%`,
            background: "linear-gradient(90deg, color-mix(in srgb, var(--ink) 6%, transparent) 25%, color-mix(in srgb, var(--ink) 12%, transparent) 50%, color-mix(in srgb, var(--ink) 6%, transparent) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

/* ── Thinking Steps (Perplexity-style) ── */
function ThinkingSteps({ steps, active }: { steps: string[]; active: boolean }) {
  return (
    <div className="mb-4 p-3 rounded-xl bg-[color-mix(in_srgb,var(--accent-2)_4%,transparent)] border border-[color-mix(in_srgb,var(--accent-2)_12%,transparent)]">
      <div className="flex items-center gap-2 mb-2.5">
        <Search size={12} className="text-[var(--accent-2)]" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--accent-2)]">
          {active ? "Researching..." : "Research complete"}
        </span>
        {active && <Loader2 size={10} className="animate-spin text-[var(--accent-2)]" />}
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{
                background: "color-mix(in srgb, var(--accent-2) 15%, transparent)",
                color: "var(--accent-2)",
              }}
            >
              {i + 1}
            </span>
            <span>{step}</span>
            <Check size={10} className="text-[var(--positive)] shrink-0 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Source Cards (Perplexity-style) ── */
type SourceItem = { title: string; source: string; url?: string };

function SourceCards({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) return null;
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-2.5">
        Sources ({sources.length})
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-52 p-3 rounded-xl bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] border border-[var(--border)] hover:border-[var(--accent-2)]/40 hover:shadow-md hover:shadow-[var(--accent-2)]/5 transition-all group/src"
          >
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold text-[var(--accent-2)]">[{i + 1}]</span>
              <ExternalLink size={10} className="text-[var(--ink-muted)] opacity-0 group-hover/src:opacity-100 transition-opacity shrink-0" />
            </div>
            <p className="text-xs font-medium text-[var(--ink)] line-clamp-2 leading-snug mb-1">{s.title}</p>
            <p className="text-[10px] text-[var(--ink-muted)] truncate">{s.source}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Main ── */
const POPULAR_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "SPY", "QQQ"];

const THINKING_STEPS = [
  "Searching for relevant data",
  "Reading financial reports & news",
  "Analyzing technical indicators",
  "Synthesizing research",
];

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (symbolRef.current && !symbolRef.current.contains(e.target as Node)) {
        setSymbolOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleResearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult("");
    setSources([]);
    setThinkingSteps([]);
    setShowThinking(true);

    // Animate thinking steps
    for (let i = 0; i < THINKING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
      setThinkingSteps((prev) => [...prev, THINKING_STEPS[i]]);
    }

    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, symbol }),
      });

      if (!res.ok || !res.body) {
        setResult("Research request failed. Please try again.");
        setLoading(false);
        setShowThinking(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const block of events) {
          const lines = block.split("\n");
          let eventName = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            if (line.startsWith("data: ")) dataStr = line.slice(6);
          }

          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);

            if (eventName === "sources" && payload.sources) {
              const parsed = payload.sources.map((s: { title?: string; source?: string; url?: string; snippet?: string }) => ({
                title: s.title || s.snippet || "Source",
                source: s.source || "Web",
                url: s.url,
              }));
              setSources(parsed.slice(0, 6));
            } else if (eventName === "chunk" && payload.text) {
              fullText += payload.text;
              setResult(fullText);
            } else if (eventName === "error") {
              setResult(fullText || `Error: ${payload.detail || "Unknown error"}`);
            }
          } catch { /* skip malformed */ }
        }
      }

      if (!fullText) {
        setResult("No response received. Please try again.");
      }
    } catch {
      setResult("An error occurred during research. Please try again.");
    } finally {
      setLoading(false);
      setShowThinking(false);
    }
  };

  const quickPrompts = [
    "What are the key support/resistance levels?",
    "Summarize recent earnings and guidance",
    "What's the bull vs bear case?",
    "Analyze the risk/reward for a swing trade",
    "What are the upcoming catalysts?",
    "How does it compare to competitors?",
  ];

  const followUps = [
    `What's the 12-month price target for ${symbol}?`,
    `What are the main risks for ${symbol}?`,
    `Is ${symbol} a good buy right now?`,
  ];

  return (
    <AuthGuard>
      <PageShell title="Research" subtitle="AI-powered deep research with source grounding">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Input Panel */}
          <div className="glass-card p-5">
            <div className="flex gap-3 mb-4">
              {/* Symbol selector */}
              <div ref={symbolRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSymbolOpen(!symbolOpen)}
                  className="flex items-center gap-1.5 w-28 px-3 py-2.5 rounded-xl bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] border border-[color-mix(in_srgb,var(--accent-2)_25%,transparent)] text-sm font-mono font-bold text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] transition-colors focus:outline-none justify-between"
                >
                  <span>{symbol || "SYM"}</span>
                  <ChevronDown size={13} className={`transition-transform ${symbolOpen ? "rotate-180" : ""}`} />
                </button>
                {symbolOpen && (
                  <div className="absolute z-20 top-full mt-1 left-0 w-28 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] shadow-xl backdrop-blur-xl overflow-hidden">
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") setSymbolOpen(false); }}
                      placeholder="Type..."
                      autoFocus
                      className="w-full px-3 py-2 text-xs font-mono bg-transparent border-b border-[var(--border)] text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none"
                    />
                    <div className="max-h-36 overflow-y-auto">
                      {POPULAR_SYMBOLS.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSymbol(s); setSymbolOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)] transition-colors ${s === symbol ? "text-[var(--accent-2)] font-bold" : "text-[var(--ink)]"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                placeholder="What would you like to research about this stock?"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] transition-all"
              />

              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 80%, #8b5cf6))",
                  boxShadow: loading || !query.trim() ? "none" : "0 2px 12px color-mix(in srgb, var(--accent-2) 30%, transparent)",
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Research
              </button>
            </div>

            {/* Quick prompts */}
            {!result && !loading && (
              <div>
                <p className="text-[10px] text-[var(--ink-muted)] mb-2.5 font-semibold tracking-widest uppercase">
                  Quick prompts
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setQuery(prompt)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--accent-2)_6%,transparent)] text-[var(--accent-2)] border border-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] hover:border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          {(result || loading) && (
            <div ref={resultRef} className="glass-card p-6 max-h-[70vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 60%, #8b5cf6))",
                    }}
                  >
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--ink)]">Research Analysis</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)] font-bold">
                        {symbol}
                      </span>
                      {loading && (
                        <span className="text-[10px] text-[var(--ink-muted)] flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Generating...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {result && !loading && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] transition-all border border-transparent hover:border-[var(--border)]"
                  >
                    {copied ? <><Check size={12} className="text-[var(--positive)]" /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                )}
              </div>

              {/* Thinking steps */}
              {showThinking && thinkingSteps.length > 0 && (
                <ThinkingSteps steps={thinkingSteps} active={loading} />
              )}

              {/* Sources */}
              {sources.length > 0 && <SourceCards sources={sources} />}

              {/* Content */}
              <div className="prose-custom">
                {result ? renderMarkdown(result) : null}
                {loading && !result && <SkeletonBlock />}
              </div>

              {/* Follow-up suggestions */}
              {result && !loading && (
                <div className="mt-6 pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Lightbulb size={12} className="text-[var(--accent-2)]" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)]">
                      Follow-up questions
                    </span>
                  </div>
                  <div className="space-y-1">
                    {followUps.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuery(q); setResult(""); setSources([]); setThinkingSteps([]); setShowThinking(false); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--accent-2)_6%,transparent)] transition-all flex items-center gap-2 group/fq"
                      >
                        <span className="w-5 h-5 rounded-md flex items-center justify-center bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] text-[var(--accent-2)] text-[10px] font-bold shrink-0 group-hover/fq:bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)]">
                          ?
                        </span>
                        <span className="flex-1">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  );
}
