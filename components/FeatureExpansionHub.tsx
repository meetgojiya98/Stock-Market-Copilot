"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Gauge, Link2, Plus, Rocket, Save, Trash2 } from "lucide-react";

export type ExpansionModule =
  | "portfolio"
  | "watchlist"
  | "analytics"
  | "research"
  | "execution"
  | "notifications"
  | "profile"
  | "audit"
  | "trending";

type ModuleConfig = {
  title: string;
  description: string;
  checklist: string[];
  quickActions: Array<{ label: string; href: string }>;
  starterPresets: string[];
};

type Preset = {
  id: string;
  name: string;
};

type HubState = {
  tasks: Record<string, boolean>;
  presets: Preset[];
  notes: string;
  intensity: number;
};

const MODULE_CONFIG: Record<ExpansionModule, ModuleConfig> = {
  portfolio: {
    title: "Portfolio Expansion Lab",
    description: "Run allocation drills, capture conviction notes, and turn portfolio reviews into repeatable playbooks.",
    checklist: [
      "Rebalance concentration > 25%",
      "Review top winners and laggards",
      "Refresh risk budget for this week",
      "Mark one position for thesis update",
    ],
    quickActions: [
      { label: "Open Watchlist", href: "/watchlist" },
      { label: "Open Analytics", href: "/analytics" },
      { label: "Open Execution", href: "/execution" },
    ],
    starterPresets: ["Defensive rebalance", "Earnings week positioning"],
  },
  watchlist: {
    title: "Watchlist Expansion Lab",
    description: "Promote symbols into themed baskets, prioritize setups, and prep entries before they hit execution.",
    checklist: [
      "Tag top 5 symbols by conviction",
      "Attach trigger levels for each setup",
      "Remove stale symbols older than 30 days",
      "Queue one symbol for deep research",
    ],
    quickActions: [
      { label: "Open Research", href: "/research" },
      { label: "Open Notifications", href: "/notifications" },
      { label: "Open Portfolio", href: "/portfolio" },
    ],
    starterPresets: ["Momentum radar", "Value watch basket"],
  },
  analytics: {
    title: "Analytics Expansion Lab",
    description: "Build scenario templates, track signal quality, and document recurring risk patterns.",
    checklist: [
      "Run baseline beta and Sharpe review",
      "Compare current vs prior month volatility",
      "Log one sector concentration risk",
      "Export one insight to execution",
    ],
    quickActions: [
      { label: "Open Portfolio", href: "/portfolio" },
      { label: "Open Research", href: "/research" },
      { label: "Open Audit", href: "/audit" },
    ],
    starterPresets: ["Macro stress test", "Rotation risk check"],
  },
  research: {
    title: "Research Expansion Lab",
    description: "Operationalize your thesis workflow with repeatable templates, confidence checkpoints, and routing.",
    checklist: [
      "Draft bull/base/bear case",
      "Score evidence quality per source",
      "Define invalidation trigger",
      "Push one plan to execution queue",
    ],
    quickActions: [
      { label: "Open Execution", href: "/execution" },
      { label: "Open Watchlist", href: "/watchlist" },
      { label: "Open Notifications", href: "/notifications" },
    ],
    starterPresets: ["Pre-earnings memo", "Swing thesis template"],
  },
  execution: {
    title: "Execution Expansion Lab",
    description: "Codify entries, exits, and risk controls so each trade follows a clear and auditable runbook.",
    checklist: [
      "Validate position size vs risk cap",
      "Set stop and take-profit anchors",
      "Run slippage + fee sanity check",
      "Log post-trade review item",
    ],
    quickActions: [
      { label: "Open Research", href: "/research" },
      { label: "Open Notifications", href: "/notifications" },
      { label: "Open Audit", href: "/audit" },
    ],
    starterPresets: ["Breakout execution", "Mean reversion setup"],
  },
  notifications: {
    title: "Alert Expansion Lab",
    description: "Tune severity routing, action SLAs, and escalation ladders for faster incident response.",
    checklist: [
      "Acknowledge all resolved alerts",
      "Set escalation owner for critical alerts",
      "Reduce noisy low-value triggers",
      "Create one research-linked alert rule",
    ],
    quickActions: [
      { label: "Open Execution", href: "/execution" },
      { label: "Open Profile", href: "/profile" },
      { label: "Open Audit", href: "/audit" },
    ],
    starterPresets: ["High-volatility alerts", "Macro event escalation"],
  },
  profile: {
    title: "Profile Expansion Lab",
    description: "Personalize your workspace posture and save operating presets for different market regimes.",
    checklist: [
      "Review operator risk posture",
      "Set focus symbols for this week",
      "Refresh session defaults",
      "Archive stale saved configurations",
    ],
    quickActions: [
      { label: "Open Portfolio", href: "/portfolio" },
      { label: "Open Notifications", href: "/notifications" },
      { label: "Open Research", href: "/research" },
    ],
    starterPresets: ["Calm market mode", "Volatility mode"],
  },
  audit: {
    title: "Audit Expansion Lab",
    description: "Track operational quality with recurring checks, summaries, and exportable compliance snapshots.",
    checklist: [
      "Review last 24h action trail",
      "Flag unusual action clusters",
      "Verify rule changes were intended",
      "Export daily compliance snapshot",
    ],
    quickActions: [
      { label: "Open Notifications", href: "/notifications" },
      { label: "Open Profile", href: "/profile" },
      { label: "Open Execution", href: "/execution" },
    ],
    starterPresets: ["Daily closeout", "Weekly governance review"],
  },
  trending: {
    title: "Trendboard Expansion Lab",
    description: "Convert crowd activity into actionable themes with ranking rules and rotation watch plans.",
    checklist: [
      "Track top 3 momentum names",
      "Map trend names to watchlist baskets",
      "Add thesis quality notes",
      "Queue one candidate for execution test",
    ],
    quickActions: [
      { label: "Open Watchlist", href: "/watchlist" },
      { label: "Open Research", href: "/research" },
      { label: "Open Execution", href: "/execution" },
    ],
    starterPresets: ["Crowd momentum scanner", "Contrarian trend reversal"],
  },
};

function storageKey(module: ExpansionModule) {
  return `smc_feature_hub_${module}_v1`;
}

function createDefaultState(module: ExpansionModule): HubState {
  const config = MODULE_CONFIG[module];
  const tasks = Object.fromEntries(config.checklist.map((_, index) => [`task-${index}`, false]));
  const presets = config.starterPresets.map((name, index) => ({
    id: `${module}-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
  }));

  return {
    tasks,
    presets,
    notes: "",
    intensity: 65,
  };
}

export default function FeatureExpansionHub({ module }: { module: ExpansionModule }) {
  const config = MODULE_CONFIG[module];
  const [state, setState] = useState<HubState>(() => createDefaultState(module));
  const [newPreset, setNewPreset] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(module));
      if (!raw) {
        setState(createDefaultState(module));
        return;
      }

      const parsed = JSON.parse(raw) as Partial<HubState>;
      const fallback = createDefaultState(module);
      const nextTasks = {
        ...fallback.tasks,
        ...(parsed.tasks ?? {}),
      };

      setState({
        tasks: nextTasks,
        presets: Array.isArray(parsed.presets) && parsed.presets.length ? parsed.presets : fallback.presets,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        intensity:
          typeof parsed.intensity === "number" && Number.isFinite(parsed.intensity)
            ? Math.min(100, Math.max(0, parsed.intensity))
            : fallback.intensity,
      });
    } catch {
      setState(createDefaultState(module));
    }
  }, [module]);

  useEffect(() => {
    localStorage.setItem(storageKey(module), JSON.stringify(state));
  }, [module, state]);

  const completion = useMemo(() => {
    const total = config.checklist.length;
    const completed = Object.values(state.tasks).filter(Boolean).length;
    return {
      completed,
      total,
      ratio: total ? completed / total : 0,
    };
  }, [config.checklist.length, state.tasks]);

  const readinessScore = useMemo(() => {
    const checklistScore = completion.ratio * 60;
    const presetScore = Math.min(20, state.presets.length * 4);
    const intensityScore = (state.intensity / 100) * 20;
    return Math.round(checklistScore + presetScore + intensityScore);
  }, [completion.ratio, state.presets.length, state.intensity]);

  const toggleTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [id]: !prev.tasks[id],
      },
    }));
  };

  const addPreset = () => {
    const value = newPreset.trim();
    if (!value) return;
    setState((prev) => ({
      ...prev,
      presets: [...prev.presets, { id: `${module}-${Date.now()}`, name: value }],
    }));
    setNewPreset("");
  };

  const removePreset = (id: string) => {
    setState((prev) => ({
      ...prev,
      presets: prev.presets.filter((preset) => preset.id !== id),
    }));
  };

  const copySnapshot = async () => {
    const payload = {
      module,
      timestamp: new Date().toISOString(),
      readinessScore,
      completion,
      presets: state.presets,
      notes: state.notes,
      intensity: state.intensity,
    };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCopyStatus("copied");
      } else {
        setCopyStatus("error");
      }
    } catch {
      setCopyStatus("error");
    }

    window.setTimeout(() => setCopyStatus("idle"), 2200);
  };

  return (
    <section className="surface-glass dynamic-surface rounded-2xl p-4 sm:p-5 fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Feature Expansion</p>
          <h3 className="mt-1 text-lg sm:text-xl section-title">{config.title}</h3>
          <p className="mt-1 text-sm muted leading-relaxed">{config.description}</p>
        </div>

        <div className="rounded-xl control-surface px-3 py-2 min-w-[170px]">
          <div className="text-[11px] muted uppercase tracking-[0.1em]">Readiness</div>
          <div className="mt-1 text-2xl font-semibold metric-value">{readinessScore}</div>
          <div className="text-[11px] muted">{completion.completed}/{completion.total} checklist complete</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl control-surface p-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold section-title">
            <Rocket size={13} />
            Expansion Checklist
          </div>
          <div className="mt-3 space-y-2">
            {config.checklist.map((item, index) => {
              const id = `task-${index}`;
              const active = Boolean(state.tasks[id]);

              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => toggleTask(id)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 text-xs border transition ${
                    active
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                      : "border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-emphasis)_84%,transparent)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        active ? "bg-[var(--positive)]" : "bg-[color-mix(in_srgb,var(--ink-muted)_40%,transparent)]"
                      }`}
                    />
                    {item}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <label className="text-[11px] muted uppercase tracking-[0.1em]">Operator Intensity</label>
            <input
              type="range"
              min={0}
              max={100}
              value={state.intensity}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  intensity: Number(event.target.value),
                }))
              }
              className="mt-1 w-full accent-[var(--accent)]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl control-surface p-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold section-title">
              <Save size={13} />
              Saved Presets
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newPreset}
                onChange={(event) => setNewPreset(event.target.value)}
                placeholder="Add preset"
                className="flex-1 rounded-lg control-surface bg-[color-mix(in_srgb,var(--surface-emphasis)_84%,transparent)] px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={addPreset}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            <div className="mt-2 space-y-1.5 max-h-[180px] overflow-auto pr-1">
              {state.presets.map((preset) => (
                <div key={preset.id} className="rounded-lg border border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-emphasis)_84%,transparent)] px-2.5 py-2 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">{preset.name}</span>
                  <button
                    type="button"
                    onClick={() => removePreset(preset.id)}
                    className="inline-flex items-center justify-center rounded-md border border-[var(--surface-border)] h-6 w-6"
                    aria-label={`Remove ${preset.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl control-surface p-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold section-title">
              <Gauge size={13} />
              Operator Notes
            </div>
            <textarea
              value={state.notes}
              onChange={(event) => setState((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Capture trade logic, risks, and next steps..."
              className="mt-2 w-full min-h-[86px] rounded-lg control-surface bg-[color-mix(in_srgb,var(--surface-emphasis)_84%,transparent)] px-3 py-2 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center gap-2">
          {config.quickActions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="inline-flex items-center gap-1 rounded-lg control-surface px-3 py-1.5 text-xs"
            >
              <Link2 size={12} />
              {action.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={copySnapshot}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-emphasis)_88%,transparent)] px-3 py-1.5 text-xs font-semibold"
        >
          <ClipboardCopy size={12} />
          {copyStatus === "idle" ? "Copy Snapshot" : copyStatus === "copied" ? "Copied" : "Clipboard Blocked"}
        </button>
      </div>
    </section>
  );
}
