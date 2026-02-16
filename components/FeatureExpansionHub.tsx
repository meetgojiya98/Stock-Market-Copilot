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
    title: "Portfolio Toolkit",
    description: "Review your holdings, check your allocation, and build good portfolio habits.",
    checklist: [
      "Check if any stock is more than 25% of your portfolio",
      "Review your best and worst performers",
      "Think about your risk comfort level",
      "Pick one stock to research more",
    ],
    quickActions: [
      { label: "Open Watchlist", href: "/watchlist" },
      { label: "Open Analytics", href: "/analytics" },
      { label: "Open Execution", href: "/execution" },
    ],
    starterPresets: ["Safety-first rebalance", "Earnings week plan"],
  },
  watchlist: {
    title: "Watchlist Toolkit",
    description: "Organize your stock ideas, prioritize the best setups, and prepare before you trade.",
    checklist: [
      "Pick your top 5 stocks to focus on",
      "Set target prices for each stock",
      "Remove stocks you're no longer interested in",
      "Send one stock to research for a deeper look",
    ],
    quickActions: [
      { label: "Open Research", href: "/research" },
      { label: "Open Alerts", href: "/notifications" },
      { label: "Open Portfolio", href: "/portfolio" },
    ],
    starterPresets: ["Growth picks", "Value opportunities"],
  },
  analytics: {
    title: "Analytics Toolkit",
    description: "Run your numbers, spot patterns, and keep track of how your portfolio is really doing.",
    checklist: [
      "Check your overall risk scores",
      "Compare this month to last month",
      "Look for sectors that are too heavy",
      "Note one insight to act on",
    ],
    quickActions: [
      { label: "Open Portfolio", href: "/portfolio" },
      { label: "Open Research", href: "/research" },
      { label: "Open History", href: "/audit" },
    ],
    starterPresets: ["Market stress check", "Sector balance review"],
  },
  research: {
    title: "Research Toolkit",
    description: "Build your research process so every stock decision is backed by real thinking.",
    checklist: [
      "Write out the bull and bear case",
      "Rate how strong your evidence is",
      "Decide what would change your mind",
      "Move one idea to paper trading",
    ],
    quickActions: [
      { label: "Open Execution", href: "/execution" },
      { label: "Open Watchlist", href: "/watchlist" },
      { label: "Open Alerts", href: "/notifications" },
    ],
    starterPresets: ["Earnings report prep", "Swing trade idea"],
  },
  execution: {
    title: "Execution Toolkit",
    description: "Plan your trades carefully so every entry and exit has a clear reason behind it.",
    checklist: [
      "Check that your trade size fits your risk budget",
      "Set a stop-loss and a profit target",
      "Account for fees and slippage",
      "Write a note about why you're making this trade",
    ],
    quickActions: [
      { label: "Open Research", href: "/research" },
      { label: "Open Alerts", href: "/notifications" },
      { label: "Open History", href: "/audit" },
    ],
    starterPresets: ["Breakout trade plan", "Mean reversion plan"],
  },
  notifications: {
    title: "Alerts Toolkit",
    description: "Fine-tune your alerts so you only hear about what really matters.",
    checklist: [
      "Clear old alerts that are resolved",
      "Set up alerts for your most important stocks",
      "Turn off alerts that are too noisy",
      "Create one alert tied to your research",
    ],
    quickActions: [
      { label: "Open Execution", href: "/execution" },
      { label: "Open Profile", href: "/profile" },
      { label: "Open History", href: "/audit" },
    ],
    starterPresets: ["Big move alerts", "Important event alerts"],
  },
  profile: {
    title: "Profile Toolkit",
    description: "Set up your account so Zentrade works the way you like it.",
    checklist: [
      "Review your risk comfort setting",
      "Pick your focus stocks for this week",
      "Check your notification preferences",
      "Clean up any old saved settings",
    ],
    quickActions: [
      { label: "Open Portfolio", href: "/portfolio" },
      { label: "Open Alerts", href: "/notifications" },
      { label: "Open Research", href: "/research" },
    ],
    starterPresets: ["Relaxed market mode", "Active market mode"],
  },
  audit: {
    title: "Activity Toolkit",
    description: "Review what you've been doing to stay on track and learn from your decisions.",
    checklist: [
      "Review your actions from the last 24 hours",
      "Look for anything unusual",
      "Make sure recent changes were intentional",
      "Save a summary of today's activity",
    ],
    quickActions: [
      { label: "Open Alerts", href: "/notifications" },
      { label: "Open Profile", href: "/profile" },
      { label: "Open Execution", href: "/execution" },
    ],
    starterPresets: ["End-of-day review", "Weekly check-in"],
  },
  trending: {
    title: "Trending Toolkit",
    description: "Use what's popular to spot opportunities and stay aware of market buzz.",
    checklist: [
      "Check the top 3 trending stocks",
      "Add interesting ones to your watchlist",
      "Write a quick note on why they're trending",
      "Pick one to research further",
    ],
    quickActions: [
      { label: "Open Watchlist", href: "/watchlist" },
      { label: "Open Research", href: "/research" },
      { label: "Open Execution", href: "/execution" },
    ],
    starterPresets: ["Momentum scanner", "Contrarian picks"],
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
          <p className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Toolkit</p>
          <h3 className="mt-1 text-lg sm:text-xl section-title">{config.title}</h3>
          <p className="mt-1 text-sm muted leading-relaxed">{config.description}</p>
        </div>

        <div className="rounded-xl control-surface px-3 py-2 min-w-[170px]">
          <div className="text-[11px] muted uppercase tracking-[0.1em]">Progress</div>
          <div className="mt-1 text-2xl font-semibold metric-value">{readinessScore}</div>
          <div className="text-[11px] muted">{completion.completed}/{completion.total} checklist complete</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl control-surface p-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold section-title">
            <Rocket size={13} />
            Checklist
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
            <label className="text-[11px] muted uppercase tracking-[0.1em]">Focus Level</label>
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
              Notes
            </div>
            <textarea
              value={state.notes}
              onChange={(event) => setState((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Write your thoughts, ideas, and next steps..."
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
