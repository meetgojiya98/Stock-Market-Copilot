"use client";

import { useMemo, useState } from "react";
import { MessageSquare, RefreshCw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  id: string;
  question: string;
  answer: string;
  mode: "live" | "deterministic";
  createdAt: string;
};

interface ChatRAGProps {
  stock: {
    symbol: string;
    [key: string]: unknown;
  };
}

function normalizeSymbol(value: string | undefined) {
  return (value || "AAPL").trim().toUpperCase() || "AAPL";
}

function timestampLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatRAG({ stock }: ChatRAGProps) {
  const symbol = normalizeSymbol(stock.symbol);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quickPrompts = useMemo(
    () => [
      `Build a 5-day risk-managed plan for ${symbol}.`,
      `What invalidates a bullish thesis on ${symbol} this week?`,
      `How should I hedge ${symbol} if Nasdaq drops 4%?`,
    ],
    [symbol]
  );

  const handleAsk = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? query).trim();
    if (!prompt) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt, symbol }),
      });

      const data = await response.json().catch(() => ({}));
      const answer = String(data?.answer ?? "").trim();

      if (!response.ok || !answer) {
        const detail =
          typeof data?.detail === "string" && data.detail.trim()
            ? data.detail
            : `Ask API failed (${response.status}).`;
        throw new Error(detail);
      }

      const mode: ChatMessage["mode"] = data?.mode === "deterministic" ? "deterministic" : "live";
      setMessages((current) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            question: prompt,
            answer,
            mode,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20)
      );
      setQuery("");
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Unable to generate a response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/95 rounded-2xl shadow-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-[#131D3B] inline-flex items-center gap-2">
          <MessageSquare size={16} />
          Ask AI
        </h3>
        <span className="text-[11px] rounded-full px-2 py-0.5 bg-black/5 text-[#131D3B]">
          Symbol: {symbol}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleAsk(prompt)}
            disabled={loading}
            className="text-[11px] rounded-full px-2.5 py-1 border border-black/10 bg-white/90 disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={query}
          placeholder={`Ask anything about ${symbol}...`}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAsk();
          }}
          disabled={loading}
        />
        <Button
          onClick={() => handleAsk()}
          disabled={loading}
          className="bg-[#FFA500] text-black font-bold hover:bg-[#FFD580]"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span className="ml-1">{loading ? "Thinking" : "Ask"}</span>
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-300/55 bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-6 italic">
            Start a conversation about {symbol}.
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="rounded-lg border border-black/10 bg-white/85 px-3 py-2">
            <div className="font-semibold text-[#131D3B]">
              Q: <span className="font-normal">{message.question}</span>
            </div>
            <div className="mt-1 ml-2 text-gray-700 border-l-2 border-[#FFA500] pl-2 whitespace-pre-wrap">
              A: {message.answer}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
              <span>{timestampLabel(message.createdAt)}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  message.mode === "live" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"
                }`}
              >
                {message.mode === "live" ? "Live AI" : "Deterministic Fallback"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
