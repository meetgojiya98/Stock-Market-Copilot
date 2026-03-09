"use client";

import { useState, useCallback } from "react";
import { Loader2, Play, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { AgentRunResult, AgentId } from "../lib/agents/types";
import { runAgent } from "../lib/agents/run-agent";
import { getAgentConfig } from "../lib/agents/configs";

const AGENT_IDS: AgentId[] = [
  "market-scanner",
  "portfolio-guardian",
  "research-analyst",
  "risk-monitor",
  "news-sentinel",
  "trade-executor",
];

type ScanResult = {
  symbol: string;
  status: "pending" | "running" | "done" | "error";
  result?: AgentRunResult;
  error?: string;
};

type Props = {
  onComplete?: (results: Map<string, AgentRunResult>) => void;
};

export default function MultiSymbolScanner({ onComplete }: Props) {
  const [agentId, setAgentId] = useState<AgentId>("market-scanner");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (symbol: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const startScan = useCallback(async () => {
    let symbols: string[] = [];
    try {
      const raw = localStorage.getItem("zentrade_watchlist_v1");
      if (raw) symbols = JSON.parse(raw);
    } catch {}
    if (!symbols.length) {
      symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
    }

    setScanning(true);
    const initial: ScanResult[] = symbols.map((s) => ({ symbol: s, status: "pending" }));
    setResults(initial);

    const completedResults = new Map<string, AgentRunResult>();

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r))
      );

      try {
        const result = await runAgent(agentId, [symbol]);
        completedResults.set(symbol, result);
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "done", result } : r))
        );
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: String(err) } : r
          )
        );
      }
    }

    setScanning(false);
    onComplete?.(completedResults);
  }, [agentId, onComplete]);

  const doneCount = results.filter((r) => r.status === "done").length;
  const totalCount = results.length;
  const config = getAgentConfig(agentId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value as AgentId)}
          disabled={scanning}
          className="px-3 py-2 rounded-lg text-sm bg-[var(--surface)] text-[var(--ink)] border border-[var(--surface-border)] outline-none"
        >
          {AGENT_IDS.map((id) => {
            const c = getAgentConfig(id);
            return (
              <option key={id} value={id}>
                {c?.name || id}
              </option>
            );
          })}
        </select>

        <button
          onClick={startScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--accent-2)" }}
        >
          {scanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scanning {doneCount}/{totalCount}...
            </>
          ) : (
            <>
              <Play size={14} />
              Scan All Watchlist
            </>
          )}
        </button>

        {config && (
          <span className="text-xs text-[var(--ink-muted)]">
            Using: {config.name}
          </span>
        )}
      </div>

      {scanning && totalCount > 0 && (
        <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(doneCount / totalCount) * 100}%`,
              background: "var(--accent-2)",
            }}
          />
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((r) => (
            <div key={r.symbol} className="glass-card p-3">
              <button
                onClick={() => r.status === "done" && toggleExpand(r.symbol)}
                className="w-full flex items-center gap-3"
              >
                {r.status === "pending" && (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--ink-muted)] opacity-30" />
                )}
                {r.status === "running" && (
                  <Loader2 size={18} className="animate-spin text-[var(--accent-2)]" />
                )}
                {r.status === "done" && (
                  <CheckCircle size={18} className="text-green-500" />
                )}
                {r.status === "error" && (
                  <AlertCircle size={18} className="text-red-500" />
                )}

                <span className="font-mono font-semibold text-sm text-[var(--ink)]">
                  {r.symbol}
                </span>

                {r.result && (
                  <span className="text-xs text-[var(--ink-muted)] flex-1 text-left truncate ml-2">
                    {r.result.summary}
                  </span>
                )}
                {r.error && (
                  <span className="text-xs text-red-400 flex-1 text-left truncate ml-2">
                    {r.error}
                  </span>
                )}

                {r.status === "done" && (
                  <span className="ml-auto text-[var(--ink-muted)]">
                    {expanded.has(r.symbol) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                )}
              </button>

              {expanded.has(r.symbol) && r.result && (
                <div className="mt-3 pt-3 border-t border-[var(--surface-border)] text-xs text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
                  {r.result.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
