"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Radar, Terminal } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import AgentCatalog from "../../components/agent/AgentCatalog";
import AgentRunHistory from "../../components/agent/AgentRunHistory";
import AgentSignalFeed from "../../components/agent/AgentSignalFeed";
import { useAgents } from "../../lib/agents/agent-store";

type Tab = "catalog" | "deployed" | "signals";

function GettingStarted() {
  const router = useRouter();

  return (
    <div className="glass-card p-6 mb-6 border-[var(--accent-2)]/30">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] shrink-0">
          <Bot size={22} className="text-[var(--accent-2)]" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--ink)] mb-1">How to use AI Agents</h3>
          <div className="space-y-3 text-sm text-[var(--ink-muted)]">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-2)] text-white text-xs font-bold flex items-center justify-center">1</span>
              <span><strong className="text-[var(--ink)]">Pick an agent</strong> — click any card below (e.g. Market Scanner)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-2)] text-white text-xs font-bold flex items-center justify-center">2</span>
              <span><strong className="text-[var(--ink)]">Deploy it</strong> — click &ldquo;+ Deploy New&rdquo;, enter stock symbols like AAPL, TSLA, NVDA</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-2)] text-white text-xs font-bold flex items-center justify-center">3</span>
              <span><strong className="text-[var(--ink)]">Run it</strong> — hit the play button. The AI analyzes your stocks and generates signals.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => router.push("/terminal")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)] text-xs font-semibold hover:bg-[color-mix(in_srgb,var(--accent-2)_18%,transparent)] transition-colors"
            >
              <Terminal size={13} />
              Or use Terminal for quick commands
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>("catalog");
  const { instances, signals, clearAll } = useAgents();
  const [cleared, setCleared] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // One-time cleanup of stale data from before API keys were configured
  useEffect(() => {
    if (!cleared) {
      const hasStale = signals.some((s) => s.message.includes("unavailable") || s.message.includes("cannot")) ||
        instances.some((i) => i.lastResult?.summary.includes("failed"));
      if (hasStale) {
        clearAll();
        setCleared(true);
      }
    }
  }, [cleared, signals, instances, clearAll]);

  // Hide guide once user has deployed agents
  useEffect(() => {
    if (instances.length > 0) setShowGuide(false);
  }, [instances]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "catalog", label: "Agent Catalog" },
    { id: "deployed", label: "Deployed", count: instances.length },
    { id: "signals", label: "Signals", count: signals.length },
  ];

  return (
    <AuthGuard>
      <PageShell title="Agents" subtitle="Deploy and manage your autonomous AI agents">
        {showGuide && <GettingStarted />}

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-[var(--accent-2)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)]">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "catalog" && <AgentCatalog />}
        {tab === "deployed" && <AgentRunHistory instances={instances} />}
        {tab === "signals" && <AgentSignalFeed signals={signals} />}
      </PageShell>
    </AuthGuard>
  );
}
