"use client";

import { Bot, Radar, Shield, Microscope, ActivitySquare, Newspaper, Crosshair } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAgents } from "../../lib/agents/agent-store";
import { AGENT_CONFIGS } from "../../lib/agents/configs";
import type { AgentId } from "../../lib/agents/types";

const ICON_MAP: Record<string, typeof Bot> = {
  Radar,
  Shield,
  Microscope,
  ActivitySquare,
  Newspaper,
  Crosshair,
};

/* Format a timestamp into relative time ("2m ago", "1h ago", etc.) */
function formatRelativeTime(ts?: number | string): string {
  if (!ts) return "—";
  const now = Date.now();
  const then = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diffMs = now - then;
  if (diffMs < 0 || isNaN(diffMs)) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AgentFleetBar() {
  const { instances } = useAgents();
  const router = useRouter();

  const activeCount = instances.filter((i) => i.enabled).length;
  const runningCount = instances.filter((i) => i.status === "running").length;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Agent Fleet</h3>
        <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)]">
          <span>{activeCount} active</span>
          {runningCount > 0 && (
            <span className="flex items-center gap-1 text-[var(--accent-2)]">
              <span
                className="pulse-dot"
                style={{ background: "var(--accent-2)" }}
              />
              {runningCount} running
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {AGENT_CONFIGS.map((config) => {
          const Icon = ICON_MAP[config.icon] || Bot;
          const deployed = instances.filter((i) => i.configId === config.id);
          const isRunning = deployed.some((i) => i.status === "running");
          const hasDeployed = deployed.length > 0;

          // Find the most recent run
          const lastRun = deployed.reduce<number | undefined>((latest, inst) => {
            const t = (inst as any).lastRunAt ?? (inst as any).lastRun;
            if (!t) return latest;
            const ms = typeof t === "string" ? new Date(t).getTime() : t;
            return latest === undefined || ms > latest ? ms : latest;
          }, undefined);

          return (
            <button
              key={config.id}
              onClick={() => router.push("/agents")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200 hover:scale-[1.05] active:scale-[0.97] cursor-pointer border-0 bg-transparent group"
              style={{
                background: hasDeployed
                  ? `color-mix(in srgb, ${config.color} 5%, transparent)`
                  : undefined,
              }}
            >
              <div
                className="p-2 rounded-xl relative transition-shadow duration-200 group-hover:shadow-md"
                style={{
                  background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
                  color: config.color,
                }}
              >
                <Icon size={18} />
                {/* Animated status dot */}
                {isRunning && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                    <span
                      className="absolute w-2.5 h-2.5 rounded-full animate-ping opacity-50"
                      style={{ background: "var(--accent-2)" }}
                    />
                    <span
                      className="relative w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--accent-2)" }}
                    />
                  </span>
                )}
                {!isRunning && hasDeployed && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      background: "var(--positive)",
                      borderColor: "var(--bg)",
                    }}
                  />
                )}
              </div>

              <span className="text-[10px] text-center font-medium text-[var(--ink-muted)] leading-tight group-hover:text-[var(--ink)] transition-colors">
                {config.name.split(" ")[0]}
              </span>

              <span className="text-[9px] font-mono text-[var(--ink-muted)]">
                {deployed.length > 0 ? `${deployed.length}\u00D7` : "\u2014"}
              </span>

              {/* Last run time */}
              {lastRun && (
                <span className="text-[8px] text-[var(--ink-muted)] opacity-70 -mt-0.5">
                  {formatRelativeTime(lastRun)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
