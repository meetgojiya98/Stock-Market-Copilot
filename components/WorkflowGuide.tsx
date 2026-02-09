"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Sparkles, X } from "lucide-react";
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
      "Use labs for backtest, attribution, and automation checks.",
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

  useEffect(() => {
    const value = typeof window !== "undefined" ? localStorage.getItem(GUIDE_KEY) : null;
    setHidden(value === "1");
  }, []);

  const currentStep = useMemo(() => {
    const index = CORE_FLOW.findIndex((item) => pathname.startsWith(item.href));
    return index < 0 ? 0 : index;
  }, [pathname]);

  const pageGuide = useMemo(() => {
    const entry = Object.entries(PAGE_GUIDES).find(([key]) => pathname.startsWith(key));
    return entry ? entry[1] : null;
  }, [pathname]);

  if (hidden) {
    return (
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            setHidden(false);
            localStorage.removeItem(GUIDE_KEY);
          }}
          className="text-xs rounded-full border border-[var(--surface-border)] bg-white/75 dark:bg-black/25 px-3 py-1.5 inline-flex items-center gap-1"
        >
          <Sparkles size={12} />
          Show Workflow Guide
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-white/75 dark:bg-black/20 p-3">
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
          className="text-xs inline-flex items-center gap-1 rounded-full border border-[var(--surface-border)] px-2 py-0.5 bg-white/70 dark:bg-black/20"
        >
          <X size={11} />
          Hide
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {CORE_FLOW.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[11px] rounded-full px-2.5 py-1 border ${
              index === currentStep
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
                : "border-[var(--surface-border)] bg-white/70 dark:bg-black/20"
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
              <li key={step} className="rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2.5 py-1.5">
                {step}
              </li>
            ))}
          </ol>
          <div className="space-y-1">
            {pageGuide.quickLinks.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="block rounded-lg control-surface bg-white/70 dark:bg-black/20 px-2.5 py-1.5"
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
