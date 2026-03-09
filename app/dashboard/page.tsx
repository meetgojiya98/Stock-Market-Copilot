"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import AgentFleetBar from "../../components/agent/AgentFleetBar";
import AgentSignalFeed from "../../components/agent/AgentSignalFeed";
import MarketPulse from "../../components/dashboard/MarketPulse";
import PortfolioSnapshot from "../../components/dashboard/PortfolioSnapshot";
import { useAgents } from "../../lib/agents/agent-store";
import {
  Bot,
  Sparkles,
  Terminal,
  BriefcaseBusiness,
  ArrowRight,
  Activity,
  Zap,
  TrendingUp,
} from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function QuickActions() {
  const router = useRouter();
  const actions = [
    { label: "Run Agent", icon: Bot, href: "/agents", color: "#6366f1", desc: "Deploy & run AI agents" },
    { label: "Research", icon: Sparkles, href: "/research", color: "#8b5cf6", desc: "AI-powered analysis" },
    { label: "Terminal", icon: Terminal, href: "/terminal", color: "#06b6d4", desc: "Slash commands" },
    { label: "Portfolio", icon: BriefcaseBusiness, href: "/portfolio", color: "#10b981", desc: "Manage positions" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => router.push(a.href)}
          className="glass-card p-4 text-left group hover:border-[var(--accent-2)]/40 transition-all hover:shadow-lg hover:shadow-[var(--accent-2)]/5"
        >
          <div
            className="p-2 rounded-xl w-fit mb-3 transition-transform group-hover:scale-110"
            style={{ background: `color-mix(in srgb, ${a.color} 12%, transparent)`, color: a.color }}
          >
            <a.icon size={18} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{a.label}</p>
              <p className="text-[10px] text-[var(--ink-muted)] mt-0.5">{a.desc}</p>
            </div>
            <ArrowRight size={14} className="text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ))}
    </div>
  );
}

function StatsStrip() {
  const { instances, signals } = useAgents();
  const stats = useMemo(() => [
    { label: "Active Agents", value: instances.filter((i) => i.enabled).length, icon: Bot, color: "#6366f1" },
    { label: "Completed Runs", value: instances.filter((i) => i.status === "completed").length, icon: Activity, color: "#10b981" },
    { label: "Bullish Signals", value: signals.filter((s) => s.type === "bullish").length, icon: TrendingUp, color: "#22c55e" },
    { label: "Alerts", value: signals.filter((s) => s.type === "alert").length, icon: Zap, color: "#f59e0b" },
  ], [instances, signals]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">{s.label}</span>
            <s.icon size={14} style={{ color: s.color }} />
          </div>
          <div className="text-2xl font-bold text-[var(--ink)] tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { signals } = useAgents();

  return (
    <AuthGuard>
      <PageShell
        title={`${getGreeting()}, welcome back`}
        subtitle="Your AI Agent command center — deploy agents, monitor signals, and stay ahead of the market."
      >
        <div className="space-y-6">
          <StatsStrip />
          <QuickActions />
          <MarketPulse />
          <AgentFleetBar />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Signal Feed</h3>
                <span className="text-[10px] text-[var(--ink-muted)]">
                  {signals.length} signal{signals.length !== 1 ? "s" : ""}
                </span>
              </div>
              <AgentSignalFeed signals={signals} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Portfolio</h3>
              <PortfolioSnapshot />
            </div>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
