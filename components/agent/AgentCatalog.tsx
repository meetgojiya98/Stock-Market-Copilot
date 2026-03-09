"use client";

import { useState } from "react";
import { Bot, Radar, Shield, Microscope, ActivitySquare, Newspaper, Crosshair, Play, Plus, ChevronRight } from "lucide-react";
import { AGENT_CONFIGS } from "../../lib/agents/configs";
import { useAgents } from "../../lib/agents/agent-store";
import type { AgentConfig, AgentId } from "../../lib/agents/types";
import AgentDeployModal from "./AgentDeployModal";
import AgentDetailPanel from "./AgentDetailPanel";

const ICON_MAP: Record<string, typeof Bot> = {
  Radar,
  Shield,
  Microscope,
  ActivitySquare,
  Newspaper,
  Crosshair,
};

export default function AgentCatalog() {
  const { instances } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [deployAgent, setDeployAgent] = useState<AgentConfig | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {AGENT_CONFIGS.map((config) => {
          const Icon = ICON_MAP[config.icon] || Bot;
          const deployed = instances.filter((i) => i.configId === config.id);
          const isRunning = deployed.some((i) => i.status === "running");
          const runsCompleted = deployed.filter((i) => i.status === "completed").length;

          return (
            <div
              key={config.id}
              onClick={() => setSelectedAgent(config)}
              className="glass-card p-5 text-left transition-all duration-200 group cursor-pointer hover:-translate-y-0.5 hover:shadow-xl"
              style={{
                ["--card-accent" as string]: config.color,
                ...(isRunning
                  ? { borderColor: config.color }
                  : {}),
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="p-2.5 rounded-xl relative transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
                    color: config.color,
                  }}
                >
                  <Icon size={22} />
                  {isRunning && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full pulse-dot"
                      style={{ backgroundColor: config.color }}
                    />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeployAgent(config);
                  }}
                  className="p-1.5 rounded-lg bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)] opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] hover:scale-105"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-semibold text-[var(--ink)] transition-colors duration-200 group-hover:text-[var(--accent-2)]">
                  {config.name}
                </h3>
                <ChevronRight
                  size={14}
                  className="text-[var(--accent-2)] opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                />
              </div>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-3">{config.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-[var(--ink-muted)]">
                <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">
                  {config.tools.length} tool{config.tools.length !== 1 ? "s" : ""}
                </span>
                {config.defaultInterval > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">
                    Every {config.defaultInterval / 60}m
                  </span>
                )}
                {deployed.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-[var(--accent-2)] font-semibold">
                    {deployed.length} deployed
                  </span>
                )}
                {runsCompleted > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-[var(--accent-2)] font-semibold">
                    {runsCompleted} run{runsCompleted !== 1 ? "s" : ""} completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedAgent && (
        <AgentDetailPanel
          config={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onDeploy={() => {
            setDeployAgent(selectedAgent);
            setSelectedAgent(null);
          }}
        />
      )}

      {deployAgent && (
        <AgentDeployModal
          config={deployAgent}
          onClose={() => setDeployAgent(null)}
        />
      )}
    </>
  );
}
