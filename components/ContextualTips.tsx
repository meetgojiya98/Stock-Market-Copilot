"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Eye,
  Lightbulb,
  Rocket,
  Target,
  X,
} from "lucide-react";

type Tip = {
  id: string;
  icon: typeof Lightbulb;
  title: string;
  description: string;
  action: string;
  path: string;
  check: () => boolean;
};

const DISMISSED_KEY = "smc_dismissed_tips_v1";
const DISABLED_KEY = "smc_tips_disabled_v1";

function isDismissed(tipId: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.includes(tipId);
    }
  } catch { /* */ }
  return false;
}

function dismissTip(tipId: string) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!arr.includes(tipId)) {
      arr.push(tipId);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
    }
  } catch { /* */ }
}

function isDisabled(): boolean {
  return localStorage.getItem(DISABLED_KEY) === "1";
}

function hasData(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed);
  } catch {
    return false;
  }
}

const ALL_TIPS: Tip[] = [
  {
    id: "add_first_stock",
    icon: BriefcaseBusiness,
    title: "Add your first stock",
    description: "Start building your portfolio by adding a stock position.",
    action: "Go to Portfolio",
    path: "/portfolio",
    check: () => !hasData("smc_portfolio_v3"),
  },
  {
    id: "create_watchlist",
    icon: Eye,
    title: "Create a watchlist",
    description: "Track stocks you're interested in without buying them.",
    action: "Go to Watchlist",
    path: "/watchlist",
    check: () => hasData("smc_portfolio_v3") && !hasData("smc_watchlist_v3"),
  },
  {
    id: "try_research",
    icon: BookOpen,
    title: "Ask AI about a stock",
    description: "Use the AI research assistant to analyze any stock.",
    action: "Go to Research",
    path: "/research",
    check: () => hasData("smc_portfolio_v3") && !hasData("smc_research_history_v1"),
  },
  {
    id: "setup_alerts",
    icon: Bell,
    title: "Set up price alerts",
    description: "Get notified when stocks hit your target prices.",
    action: "Go to Alerts",
    path: "/notifications",
    check: () => hasData("smc_portfolio_v3") && !hasData("smc_alert_rules_v1"),
  },
  {
    id: "start_journal",
    icon: BookOpen,
    title: "Start a trade journal",
    description: "Track your trading decisions and learn from them.",
    action: "Go to Journal",
    path: "/journal",
    check: () => hasData("smc_portfolio_v3") && !hasData("smc_journal_v1"),
  },
  {
    id: "set_goals",
    icon: Target,
    title: "Set investment goals",
    description: "Define targets to stay on track with your strategy.",
    action: "Go to Goals",
    path: "/goals",
    check: () => {
      try {
        const raw = localStorage.getItem("smc_portfolio_v3");
        if (!raw) return false;
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length > 5 && !hasData("smc_goals_v1");
      } catch { return false; }
    },
  },
  {
    id: "explore_advanced",
    icon: Rocket,
    title: "Explore advanced features",
    description: "Try the screener, heatmap, and sector analysis tools.",
    action: "Go to Screener",
    path: "/screener",
    check: () => {
      const keys = ["smc_portfolio_v3", "smc_watchlist_v3", "smc_alert_rules_v1"];
      return keys.every((k) => hasData(k));
    },
  },
  {
    id: "check_analytics",
    icon: BarChart3,
    title: "Review your analytics",
    description: "See portfolio performance, allocation, and risk metrics.",
    action: "Go to Analytics",
    path: "/analytics",
    check: () => hasData("smc_portfolio_v3") && !isDismissed("check_analytics"),
  },
];

export default function ContextualTips() {
  const [activeTip, setActiveTip] = useState<Tip | null>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkTips = useCallback(() => {
    if (isDisabled()) return;

    // Don't show on login/signup/landing
    if (pathname === "/" || pathname === "/login" || pathname === "/signup") return;

    for (const tip of ALL_TIPS) {
      if (!isDismissed(tip.id) && tip.check()) {
        // Don't show tip for current page
        if (pathname === tip.path) continue;
        setActiveTip(tip);
        setVisible(true);

        // Auto-dismiss after 15 seconds
        const timer = setTimeout(() => {
          setVisible(false);
        }, 15000);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  useEffect(() => {
    // Small delay to avoid flash on page load
    const timer = setTimeout(checkTips, 2000);
    return () => clearTimeout(timer);
  }, [checkTips]);

  const handleDismiss = () => {
    if (activeTip) dismissTip(activeTip.id);
    setVisible(false);
    setTimeout(() => setActiveTip(null), 300);
  };

  const handleDisableAll = () => {
    localStorage.setItem(DISABLED_KEY, "1");
    setVisible(false);
    setTimeout(() => setActiveTip(null), 300);
  };

  const handleAction = () => {
    if (activeTip) {
      dismissTip(activeTip.id);
      router.push(activeTip.path);
    }
    setVisible(false);
  };

  if (!activeTip) return null;

  const Icon = activeTip.icon;

  return (
    <div
      className="contextual-tip"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
        >
          <Icon size={16} style={{ color: "var(--accent)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{activeTip.title}</div>
            <button onClick={handleDismiss} className="muted hover:opacity-70 flex-shrink-0 mt-0.5">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs muted mt-0.5 leading-relaxed">{activeTip.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleAction}
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-1.5 text-xs font-semibold"
            >
              {activeTip.action}
            </button>
            <button onClick={handleDisableAll} className="text-[10px] muted underline">
              Don't show tips
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
