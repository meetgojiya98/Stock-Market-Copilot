"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

const LABELS: Record<string, string> = {
  portfolio: "Portfolio",
  watchlist: "Watchlist",
  research: "Research",
  execution: "Execution",
  notifications: "Alerts",
  dashboard: "Dashboard",
  briefing: "Briefing",
  screener: "Screener",
  sectors: "Sectors",
  sentiment: "Sentiment",
  compare: "Compare",
  heatmap: "Heatmap",
  simulator: "Simulator",
  goals: "Goals",
  dividends: "Dividends",
  journal: "Journal",
  ideas: "Ideas",
  calendar: "Calendar",
  community: "Community",
  export: "Export",
  glossary: "Glossary",
  strategies: "Strategies",
  analytics: "Analytics",
  trending: "Trending",
  audit: "Activity",
  profile: "Profile",
  learn: "Learn",
  options: "Options",
  crypto: "Crypto",
  broker: "Broker",
  transcripts: "Transcripts",
  benchmarks: "Benchmarks",
  "reset-password": "Reset Password",
  workspace: "Workspace",
  replay: "Replay",
};

export default function Breadcrumbs({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className={`breadcrumbs ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        <li>
          <Link href="/portfolio" className="breadcrumb-link">
            <Home size={13} />
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="breadcrumb-item">
            <ChevronRight size={12} className="breadcrumb-sep" />
            {crumb.isLast ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="breadcrumb-link">{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
