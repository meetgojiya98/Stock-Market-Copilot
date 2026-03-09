"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { AgentInstance } from "../../lib/agents/types";
import AgentStatusBadge from "./AgentStatusBadge";

function RunCard({ instance }: { instance: AgentInstance }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(instance.lastRun!).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const hasDetails = instance.lastResult?.details;

  return (
    <div className="p-3 hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] transition-colors">
      <div
        className={`flex items-center justify-between mb-1 ${hasDetails ? "cursor-pointer" : ""}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--ink)]">
            {instance.configId.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          <AgentStatusBadge status={instance.status} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--ink-muted)]">{time}</span>
          {hasDetails && (
            expanded
              ? <ChevronUp size={14} className="text-[var(--ink-muted)]" />
              : <ChevronDown size={14} className="text-[var(--ink-muted)]" />
          )}
        </div>
      </div>
      <p className="text-xs text-[var(--ink-muted)]">{instance.symbols.join(", ")}</p>
      {instance.lastResult && (
        <p className="text-xs text-[var(--ink)] mt-1">{instance.lastResult.summary}</p>
      )}
      {expanded && hasDetails && (
        <div className="mt-3 p-3 rounded-xl bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] border border-[var(--border)]">
          <div className="prose prose-sm text-[var(--ink)] text-xs leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
            {instance.lastResult!.details}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentRunHistory({ instances }: { instances: AgentInstance[] }) {
  const withRuns = instances
    .filter((i) => i.lastRun)
    .sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime());

  if (!withRuns.length) {
    return (
      <div className="glass-card p-6 text-center">
        <Clock size={24} className="mx-auto mb-2 text-[var(--ink-muted)]" />
        <p className="text-sm text-[var(--ink-muted)]">No agent runs yet. Deploy an agent and hit the play button to run it.</p>
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-[var(--border)]">
      {withRuns.map((instance) => (
        <RunCard key={instance.id} instance={instance} />
      ))}
    </div>
  );
}
