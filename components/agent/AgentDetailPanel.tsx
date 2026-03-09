"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Play, Trash2, Bot, Radar, Shield, Microscope, ActivitySquare, Newspaper, Crosshair, PlayCircle, Loader2 } from "lucide-react";
import type { AgentConfig } from "../../lib/agents/types";
import { useAgents } from "../../lib/agents/agent-store";
import { runAgent } from "../../lib/agents/run-agent";
import AgentStatusBadge from "./AgentStatusBadge";

const ICON_MAP: Record<string, typeof Bot> = { Radar, Shield, Microscope, ActivitySquare, Newspaper, Crosshair };

// -- Simple markdown renderer (no library) --
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings: ### heading
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-[var(--ink)] mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-[var(--ink)] mt-3 mb-1">$1</h3>');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[var(--ink)]">$1</strong>');

  // Inline code: `code`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-[var(--accent-2)] text-[11px] font-mono">$1</code>'
  );

  // Bullet lists: - item or * item
  html = html.replace(
    /^[\-\*] (.+)$/gm,
    '<li class="flex items-start gap-1.5 ml-2"><span class="mt-1.5 w-1 h-1 rounded-full bg-[var(--ink-muted)] shrink-0"></span><span>$1</span></li>'
  );

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(
    /(<li[^>]*>[\s\S]*?<\/li>\n?)+/g,
    '<ul class="space-y-0.5 my-1">$&</ul>'
  );

  // Line breaks (but not after block elements)
  html = html.replace(/\n(?!<)/g, "<br/>");

  return html;
}

// -- Relative time formatter --
function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

type Props = {
  config: AgentConfig;
  onClose: () => void;
  onDeploy: () => void;
};

export default function AgentDetailPanel({ config, onClose, onDeploy }: Props) {
  const { instances, updateInstance, remove, addSignals } = useAgents();
  const deployed = instances.filter((i) => i.configId === config.id);
  const Icon = ICON_MAP[config.icon] || Bot;

  // Animate in
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleRun = async (instanceId: string, symbols: string[]) => {
    updateInstance(instanceId, { status: "running", lastRun: new Date().toISOString() });
    try {
      const result = await runAgent(config.id, symbols);
      updateInstance(instanceId, { status: "completed", lastResult: result });
      if (result.signals.length) addSignals(result.signals);
    } catch {
      updateInstance(instanceId, { status: "error" });
    }
  };

  const handleRunAll = async () => {
    const runnableInstances = deployed.filter((i) => i.status !== "running");
    await Promise.allSettled(runnableInstances.map((i) => handleRun(i.id, i.symbols)));
  };

  const anyRunning = deployed.some((i) => i.status === "running");

  // Force re-render every 30s to keep relative timestamps fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={handleClose}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Panel */}
      <div
        className="relative glass-card w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 transition-all duration-250 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] transition-colors duration-150"
        >
          <X size={18} className="text-[var(--ink-muted)]" />
        </button>

        {/* Agent Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-3 rounded-xl"
            style={{
              background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
              color: config.color,
            }}
          >
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)]">{config.name}</h2>
            <p className="text-xs text-[var(--ink-muted)]">{config.description}</p>
          </div>
        </div>

        {/* Tools */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-2">Tools</h4>
          <div className="flex flex-wrap gap-1.5">
            {config.tools.map((tool) => (
              <span
                key={tool.id}
                className="px-2 py-1 rounded-lg text-xs bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-[var(--ink-muted)]"
              >
                {tool.name}
              </span>
            ))}
          </div>
        </div>

        {/* Deployed Instances */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Deployed Instances ({deployed.length})
            </h4>
            <div className="flex items-center gap-2">
              {deployed.length > 1 && (
                <button
                  onClick={handleRunAll}
                  disabled={anyRunning}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-2)] hover:underline disabled:opacity-40 disabled:no-underline transition-opacity duration-150"
                >
                  <PlayCircle size={12} />
                  Run All
                </button>
              )}
              <button
                onClick={onDeploy}
                className="text-xs font-semibold text-[var(--accent-2)] hover:underline"
              >
                + Deploy New
              </button>
            </div>
          </div>

          {deployed.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)] py-4 text-center">No instances deployed yet.</p>
          ) : (
            <div className="space-y-2">
              {deployed.map((instance) => {
                const isRunning = instance.status === "running";

                return (
                  <div
                    key={instance.id}
                    className="relative p-3 rounded-xl bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] overflow-hidden transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                  >
                    {/* Running progress bar */}
                    {isRunning && (
                      <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: config.color,
                            animation: "progress-indeterminate 1.5s ease-in-out infinite",
                          }}
                        />
                        <style>{`
                          @keyframes progress-indeterminate {
                            0% { width: 0%; margin-left: 0%; }
                            50% { width: 40%; margin-left: 30%; }
                            100% { width: 0%; margin-left: 100%; }
                          }
                        `}</style>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[var(--ink-muted)]">{instance.id.slice(0, 8)}</span>
                          <AgentStatusBadge status={instance.status} />
                          {instance.lastRun && (
                            <span className="text-[10px] text-[var(--ink-muted)] ml-auto tabular-nums">
                              {timeAgo(instance.lastRun)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--ink-muted)]">
                          {instance.symbols.join(", ")}
                        </p>
                        {instance.lastResult && (
                          <>
                            <p className="text-xs text-[var(--ink)] mt-1">{instance.lastResult.summary}</p>
                            {instance.lastResult.details && (
                              <details className="mt-2">
                                <summary className="text-[10px] font-semibold text-[var(--accent-2)] cursor-pointer hover:underline">
                                  View Full Report
                                </summary>
                                <div className="mt-2 p-3 rounded-xl bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] border border-[var(--border)] max-h-[40vh] overflow-y-auto">
                                  <div
                                    className="text-[var(--ink)] text-xs leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(instance.lastResult.details) }}
                                  />
                                </div>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRun(instance.id, instance.symbols)}
                          disabled={isRunning}
                          className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-[var(--accent-2)] disabled:opacity-40 transition-colors duration-150"
                        >
                          {isRunning ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Play size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => remove(instance.id)}
                          className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--negative)_12%,transparent)] text-[var(--negative)] transition-colors duration-150"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
