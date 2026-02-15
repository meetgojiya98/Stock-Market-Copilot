"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Compass, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GuideItem = {
  label: string;
  href: string;
  description: string;
};

type PageGuide = {
  title: string;
  steps: string[];
  quickLinks: GuideItem[];
};

const GUIDE_KEY = "smc_workflow_guide_hidden_v1";
const GUIDE_PROGRESS_KEY = "smc_workflow_guide_progress_v1";

const CORE_FLOW: GuideItem[] = [
  { label: "Portfolio", href: "/portfolio", description: "Set holdings and baseline exposure." },
  { label: "Watchlist", href: "/watchlist", description: "Track symbols and key triggers." },
  { label: "Research", href: "/research", description: "Build decision packs and thesis updates." },
  { label: "Execution", href: "/execution", description: "Paper trade, risk test, and automate." },
  { label: "Notifications", href: "/notifications", description: "Monitor alerts and escalation." },
];

const PAGE_GUIDES: Record<string, PageGuide> = {
  "/portfolio": {
    title: "Portfolio Quickstart",
    steps: [
      "Add core positions and verify concentration alerts.",
      "Review allocation and rebalance suggestions.",
      "Use analytics panel to validate beta/alpha profile.",
    ],
    quickLinks: [
      { label: "Go to Watchlist", href: "/watchlist", description: "Track candidates and triggers." },
      { label: "Open Analytics", href: "/analytics", description: "Deep-dive risk surface." },
    ],
  },
  "/watchlist": {
    title: "Watchlist Quickstart",
    steps: [
      "Add symbols with thesis notes and trigger levels.",
      "Promote high-conviction names into portfolio.",
      "Open research to build structured memo output.",
    ],
    quickLinks: [
      { label: "Open Research", href: "/research", description: "Generate decision pack." },
      { label: "Open Execution", href: "/execution", description: "Simulate trade setup." },
    ],
  },
  "/research": {
    title: "Research Quickstart",
    steps: [
      "Set primary/compare/benchmark symbols.",
      "Generate decision pack and inspect shock scenarios.",
      "Send validated setup directly to execution queue.",
    ],
    quickLinks: [
      { label: "Open Execution", href: "/execution", description: "Load queued research idea." },
      { label: "Open Notifications", href: "/notifications", description: "Monitor thesis alerts." },
    ],
  },
  "/execution": {
    title: "Execution Quickstart",
    steps: [
      "Load a research idea or pick a watchlist symbol.",
      "Apply playbook, review risk budget, then place paper order.",
      "Open Orders + Insights to audit fill quality, then use labs for backtest and risk checks.",
    ],
    quickLinks: [
      { label: "Go to Research", href: "/research", description: "Refine thesis before trading." },
      { label: "Go to Audit", href: "/audit", description: "Review action history." },
    ],
  },
  "/notifications": {
    title: "Alert Ops Quickstart",
    steps: [
      "Filter by severity to isolate critical events.",
      "Acknowledge resolved alerts to keep inbox clean.",
      "Escalate persistent risk alerts to execution rules.",
    ],
    quickLinks: [
      { label: "Open Execution", href: "/execution", description: "Adjust guardrails and rules." },
      { label: "Open Profile", href: "/profile", description: "Tune operator preferences." },
    ],
  },
};

export default function WorkflowGuide() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [visitedPaths, setVisitedPaths] = useState<string[]>([]);

  useEffect(() => {
    const value = typeof window !== "undefined" ? localStorage.getItem(GUIDE_KEY) : null;
    setHidden(value === "1");

    const rawProgress =
      typeof window !== "undefined" ? localStorage.getItem(GUIDE_PROGRESS_KEY) : null;
    if (!rawProgress) return;
    try {
      const parsed = JSON.parse(rawProgress);
      if (Array.isArray(parsed)) {
        setVisitedPaths(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      localStorage.removeItem(GUIDE_PROGRESS_KEY);
    }
  }, []);

  useEffect(() => {
    const current = CORE_FLOW.find((item) => pathname.startsWith(item.href));
    if (!current) return;
    setVisitedPaths((prev) => {
      if (prev.includes(current.href)) return prev;
      const next = [...prev, current.href];
      localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname]);

  const currentStep = useMemo(() => {
    const index = CORE_FLOW.findIndex((item) => pathname.startsWith(item.href));
    return index < 0 ? 0 : index;
  }, [pathname]);

  const pageGuide = useMemo(() => {
    const entry = Object.entries(PAGE_GUIDES).find(([key]) => pathname.startsWith(key));
    return entry ? entry[1] : null;
  }, [pathname]);

  const completion = useMemo(() => {
    const completed = CORE_FLOW.filter((item) => visitedPaths.includes(item.href)).length;
    return {
      completed,
      total: CORE_FLOW.length,
      pct: CORE_FLOW.length ? (completed / CORE_FLOW.length) * 100 : 0,
    };
  }, [visitedPaths]);

  const nextStep = useMemo(() => {
    for (let idx = currentStep + 1; idx < CORE_FLOW.length; idx += 1) {
      const candidate = CORE_FLOW[idx];
      if (!visitedPaths.includes(candidate.href)) return candidate;
    }
    return CORE_FLOW.find((item) => !visitedPaths.includes(item.href)) ?? null;
  }, [currentStep, visitedPaths]);

  if (hidden) {
    return (
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            setHidden(false);
            localStorage.removeItem(GUIDE_KEY);
          }}
          className="text-xs rounded-full control-surface px-3 py-1.5 inline-flex items-center gap-1"
        >
          <Sparkles size={12} />
          Show Workflow Guide
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 workflow-guide-shell p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <Compass size={14} />
          <span className="text-xs font-semibold section-title">
            {pageGuide?.title || "Operator Workflow"}
          </span>
        </div>
        <button
          onClick={() => {
            setHidden(true);
            localStorage.setItem(GUIDE_KEY, "1");
          }}
          className="text-xs inline-flex items-center gap-1 rounded-full control-surface px-2 py-0.5"
        >
          <X size={11} />
          Hide
        </button>
      </div>

      <div className="mt-2 rounded-lg workflow-progress-shell px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="muted">Workflow completion</span>
          <span className="font-semibold">
            {completion.completed}/{completion.total}
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)]"
            style={{ width: `${completion.pct}%` }}
          />
        </div>
        {nextStep && (
          <Link
            href={nextStep.href}
            className="mt-2 inline-flex items-center gap-1 rounded-full control-surface px-2.5 py-1 text-[11px] font-semibold"
          >
            Continue: {nextStep.label}
            <ArrowRight size={11} />
          </Link>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {CORE_FLOW.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
              index === currentStep
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--ink)]"
                : "border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-emphasis)_88%,transparent)]"
            }`}
          >
            {index + 1}. {item.label}
          </Link>
        ))}
      </div>

      {pageGuide && (
        <div className="mt-3 grid xl:grid-cols-[1.2fr_1fr] gap-3">
          <ol className="text-xs space-y-1">
            {pageGuide.steps.map((step) => (
              <li key={step} className="rounded-lg control-surface px-2.5 py-1.5">
                {step}
              </li>
            ))}
          </ol>
          <div className="space-y-1">
            {pageGuide.quickLinks.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="block rounded-lg control-surface px-2.5 py-1.5"
              >
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-[11px] muted">{item.description}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
