"use client";

import { useState } from "react";
import { Bot, User, Copy, Check, ExternalLink, Lightbulb } from "lucide-react";
import ExportReportButton from "../ExportReportButton";

export type Source = {
  title: string;
  url?: string;
  snippet?: string;
};

export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  agentName?: string;
  timestamp: string;
  isStreaming?: boolean;
  thinkingSteps?: string[];
  sources?: Source[];
  followUps?: string[];
};

/* ── Perplexity-style search steps ── */
function ThinkingSteps({ steps }: { steps: string[] }) {
  return (
    <div className="mb-3 space-y-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{
              background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
              color: "var(--accent-2)",
            }}
          >
            {i + 1}
          </span>
          <span className="leading-snug">{step}</span>
          <Check size={10} className="text-[var(--positive)] shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ── Source cards ── */
function SourceCards({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-4 pt-3 border-t border-[var(--border)]">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-2">
        Sources
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-48 p-2.5 rounded-xl bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] border border-[var(--border)] hover:border-[var(--accent-2)]/40 transition-all group/src cursor-pointer"
          >
            <div className="flex items-start justify-between gap-1 mb-1">
              <span className="text-[10px] font-semibold text-[var(--accent-2)]">[{i + 1}]</span>
              <ExternalLink size={10} className="text-[var(--ink-muted)] opacity-0 group-hover/src:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs font-medium text-[var(--ink)] line-clamp-2 leading-snug">{s.title}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Follow-up suggestions ── */
function FollowUps({ questions, onSelect }: { questions: string[]; onSelect?: (q: string) => void }) {
  if (!questions.length) return null;
  return (
    <div className="mt-4 pt-3 border-t border-[var(--border)]">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb size={12} className="text-[var(--accent-2)]" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)]">
          Related
        </span>
      </div>
      <div className="space-y-1">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect?.(q)}
            className="w-full text-left px-3 py-2 rounded-xl text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--accent-2)_6%,transparent)] transition-all flex items-center gap-2 group/fq"
          >
            <span className="w-5 h-5 rounded-md flex items-center justify-center bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] text-[var(--accent-2)] text-[10px] font-bold shrink-0 group-hover/fq:bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)]">
              ?
            </span>
            <span className="flex-1">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── lightweight markdown ── */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-2 ml-4 space-y-1 list-disc text-sm text-[var(--ink)]">
        {listBuffer.map((item, i) => (
          <li key={i} className="leading-relaxed">{inlineFormat(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const styles: Record<number, string> = {
        1: "text-base font-bold mt-4 mb-2",
        2: "text-[15px] font-bold mt-3.5 mb-1.5",
        3: "text-sm font-semibold mt-3 mb-1",
      };
      elements.push(
        <div key={`h-${i}`} className={`${styles[level]} text-[var(--ink)]`}>
          {inlineFormat(content)}
        </div>
      );
      continue;
    }

    // bullet list items
    const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    // numbered list items
    const numMatch = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
    if (numMatch) {
      flushList();
      elements.push(
        <div key={`num-${i}`} className="flex gap-2 my-0.5 text-sm text-[var(--ink)]">
          <span className="text-[var(--accent-2)] font-semibold shrink-0">{numMatch[1]}.</span>
          <span className="leading-relaxed">{inlineFormat(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    flushList();

    // blank line
    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-[1.7] text-[var(--ink)] my-0.5">
        {inlineFormat(line)}
      </p>
    );
  }

  flushList();
  return elements;
}

function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[var(--ink)]">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 rounded-md text-[0.85em] font-mono bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] text-[var(--accent-2)]"
        >
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : [text];
}

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--accent-2)]"
          style={{
            animation: "termDotBounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`@keyframes termDotBounce { 0%,60%,100%{opacity:.25;transform:translateY(0)} 30%{opacity:1;transform:translateY(-3px)} }`}</style>
    </span>
  );
}

/* ── Agent color helpers ── */
const AGENT_COLORS: Record<string, string> = {
  "Market Scanner": "#6366f1",
  "Portfolio Guardian": "#f59e0b",
  "Research Analyst": "#10b981",
  "Risk Monitor": "#ef4444",
  "News Sentinel": "#3b82f6",
  "Trade Executor": "#8b5cf6",
};

/* ── Component ── */
export default function TerminalMessage({
  message,
  onFollowUp,
}: {
  message: Message;
  onFollowUp?: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const agentColor = AGENT_COLORS[message.agentName || ""] || "#10b981";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse">
        <div
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
            color: "var(--accent-2)",
          }}
        >
          <User size={16} />
        </div>
        <div className="max-w-[80%] text-right">
          <div className="flex items-center gap-2 mb-1 justify-end">
            <span className="text-xs font-semibold text-[var(--ink)]">You</span>
            <span className="text-[10px] text-[var(--ink-muted)]">{time}</span>
          </div>
          <div
            className="inline-block text-sm leading-relaxed p-3 rounded-2xl rounded-tr-md bg-[var(--accent-2)] text-white"
            style={{
              textAlign: "left",
              boxShadow: "0 2px 12px color-mix(in srgb, var(--accent-2) 25%, transparent)",
            }}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Agent message — Perplexity style
  return (
    <div className="flex gap-3">
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{
          background: `color-mix(in srgb, ${agentColor} 12%, transparent)`,
          color: agentColor,
        }}
      >
        <Bot size={16} />
      </div>
      <div className="flex-1 min-w-0 max-w-[90%]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: agentColor }}
          />
          <span className="text-xs font-bold text-[var(--ink)]">
            {message.agentName || "Agent"}
          </span>
          <span className="text-[10px] text-[var(--ink-muted)]">{time}</span>
        </div>

        {/* Thinking steps */}
        {message.thinkingSteps && message.thinkingSteps.length > 0 && (
          <ThinkingSteps steps={message.thinkingSteps} />
        )}

        {/* Main content */}
        <div className="group relative">
          <div className="text-sm leading-[1.7] text-[var(--ink)]">
            {message.content ? renderMarkdown(message.content) : null}
            {message.isStreaming && <TypingDots />}
            {message.isStreaming && !message.content && (
              <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                <div className="w-4 h-4 border-2 border-[var(--accent-2)] border-t-transparent rounded-full animate-spin" />
                <span>Analyzing...</span>
              </div>
            )}
          </div>

          {/* Copy + Export buttons */}
          {!message.isStreaming && message.content && (
            <div className="absolute -right-1 top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExportReportButton title={message.agentName || "Agent Report"} content={message.content} />
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-[var(--surface)] shadow-sm border border-[var(--border)] hover:border-[var(--accent-2)] text-[var(--ink-muted)] hover:text-[var(--accent-2)]"
                title="Copy to clipboard"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>

        {/* Sources */}
        {message.sources && <SourceCards sources={message.sources} />}

        {/* Follow-up suggestions */}
        {message.followUps && !message.isStreaming && (
          <FollowUps questions={message.followUps} onSelect={onFollowUp} />
        )}
      </div>
    </div>
  );
}
