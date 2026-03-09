"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Radar,
  Shield,
  Microscope,
  ActivitySquare,
  Newspaper,
  Crosshair,
  Terminal,
  Zap,
  Lock,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import DarkModeToggle from "../components/DarkModeToggle";

/* ── Agent data ── */
const AGENTS = [
  {
    name: "Market Scanner",
    desc: "Real-time price action, volume anomalies, and technical setups across your entire watchlist.",
    icon: Radar,
  },
  {
    name: "Portfolio Guardian",
    desc: "Continuous monitoring for concentration risk, sector drift, and rebalancing triggers.",
    icon: Shield,
  },
  {
    name: "Research Analyst",
    desc: "Source-grounded fundamental and technical analysis. Every claim backed by evidence.",
    icon: Microscope,
  },
  {
    name: "Risk Monitor",
    desc: "Volatility tracking, correlation shifts, and exposure analysis across all positions.",
    icon: ActivitySquare,
  },
  {
    name: "News Sentinel",
    desc: "Breaking news, earnings surprises, and sentiment shifts — filtered for what matters.",
    icon: Newspaper,
  },
  {
    name: "Trade Executor",
    desc: "Optimal entry/exit planning, position sizing, and order strategy.",
    icon: Crosshair,
  },
];

/* ── Terminal demo ── */
const DEMO_LINES = [
  { type: "cmd", text: "/scan AAPL TSLA NVDA" },
  { type: "out", text: "Scanning 3 symbols across 12 technical indicators..." },
  { type: "signal", text: "BULLISH  NVDA  Breakout above $920 resistance  conf: 89%" },
  { type: "signal", text: "ALERT   TSLA  Volume 3.2x above 20d average    conf: 72%" },
  { type: "signal", text: "NEUTRAL AAPL  Consolidating near $195 support  conf: 55%" },
  { type: "cmd", text: "/research NVDA --deep" },
  { type: "out", text: "Research Analyst: generating grounded report..." },
];

function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= DEMO_LINES.length) return;
    const delay = DEMO_LINES[visibleLines]?.type === "cmd" ? 900 : 350;
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div className="landing-terminal">
      <div className="landing-terminal-chrome">
        <div className="landing-terminal-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="landing-terminal-title">zentrade terminal</span>
      </div>
      <div className="landing-terminal-body">
        {DEMO_LINES.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className={`landing-terminal-line ${
              line.type === "cmd"
                ? "landing-terminal-cmd"
                : line.type === "signal"
                ? "landing-terminal-signal"
                : "landing-terminal-out"
            }`}
          >
            {line.type === "cmd" && <span className="landing-terminal-prompt">$</span>}
            {line.type === "signal" && <span className="landing-terminal-arrow">&rarr;</span>}
            {line.text}
          </div>
        ))}
        {visibleLines < DEMO_LINES.length && (
          <span className="landing-terminal-cursor" />
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-grid-pattern" />
        <div className="landing-grid-fade" />
        <div className="landing-hero-glow">
          <div className="landing-glow-orb landing-glow-1" />
          <div className="landing-glow-orb landing-glow-2" />
        </div>

        <div className="landing-container">
          {/* Nav */}
          <nav className="landing-nav">
            <Link href="/" className="landing-brand">
              <img src="/zentrade-logo.svg" alt="Zentrade" className="landing-brand-mark" />
              <span className="landing-brand-text">Zentrade</span>
            </Link>
            <div className="landing-nav-links hidden sm:flex">
              <a href="#agents" className="landing-nav-link">Agents</a>
              <a href="#terminal" className="landing-nav-link">Terminal</a>
              <a href="#how" className="landing-nav-link">How it works</a>
              <Link href="/pricing" className="landing-nav-link">Pricing</Link>
            </div>
            <div className="flex items-center gap-2">
              <DarkModeToggle />
              <Link href="/login" className="landing-nav-link hidden sm:inline">Sign in</Link>
              <Link href="/signup" className="landing-nav-cta">
                Get started
                <ArrowRight size={14} />
              </Link>
            </div>
          </nav>

          {/* Hero content */}
          <div className="landing-hero-content">
            <div className="landing-hero-badge">
              <span className="landing-hero-badge-dot" />
              Now in public beta
            </div>
            <h1 className="landing-h1">
              Your trading floor,<br />
              <span className="landing-h1-accent">fully autonomous</span>
            </h1>
            <p className="landing-hero-sub">
              Six AI agents continuously scan markets, monitor your portfolio,
              research opportunities, and plan trades — so you operate on
              intelligence, not instinct.
            </p>
            <div className="landing-hero-actions">
              <Link href="/signup" className="landing-btn-primary">
                Start trading smarter
                <ArrowRight size={15} />
              </Link>
              <a href="#terminal" className="landing-btn-secondary">
                Watch it work
                <ArrowUpRight size={14} />
              </a>
            </div>
            <p className="landing-hero-note">
              <Lock size={12} />
              Free tier available. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* ── Metrics strip ── */}
      <section className="landing-metrics">
        <div className="landing-container">
          <div className="landing-metrics-grid">
            <div className="landing-metric">
              <span className="landing-metric-value">6</span>
              <span className="landing-metric-label">Autonomous Agents</span>
              <span className="landing-metric-sub">Each with specialized tools</span>
            </div>
            <div className="landing-metric">
              <span className="landing-metric-value">&lt;2s</span>
              <span className="landing-metric-label">Signal Latency</span>
              <span className="landing-metric-sub">Real-time market scanning</span>
            </div>
            <div className="landing-metric">
              <span className="landing-metric-value">3</span>
              <span className="landing-metric-label">Data Sources</span>
              <span className="landing-metric-sub">Alpha Vantage, Finnhub, Claude</span>
            </div>
            <div className="landing-metric">
              <span className="landing-metric-value">100%</span>
              <span className="landing-metric-label">Source-Grounded</span>
              <span className="landing-metric-sub">Every claim is verifiable</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Agent Fleet ── */}
      <section id="agents" className="landing-preview-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-h2">Six agents. One command center.</h2>
            <p className="landing-h2-sub">
              Each agent runs independently with its own toolset, system prompt,
              and analytical focus. Deploy one or all six.
            </p>
          </div>

          <div className="landing-agents-grid">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="landing-agent-card">
                <div className="landing-agent-icon">
                  <agent.icon size={20} />
                </div>
                <div>
                  <h3 className="landing-agent-name">{agent.name}</h3>
                  <p className="landing-agent-desc">{agent.desc}</p>
                </div>
                <ChevronRight size={14} className="landing-agent-arrow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Terminal Demo ── */}
      <section id="terminal" className="landing-preview-section" style={{ background: "var(--bg-soft)" }}>
        <div className="landing-container">
          <div className="landing-terminal-section">
            <div className="landing-terminal-info">
              <h2 className="landing-h2" style={{ textAlign: "left" }}>Command your fleet</h2>
              <p className="landing-h2-sub" style={{ textAlign: "left", marginLeft: 0 }}>
                A power-user terminal with slash commands. Run scans, deep
                research, risk analysis, and trade planning from one interface.
              </p>
              <div className="landing-commands-list">
                {[
                  { cmd: "/scan", desc: "Technical scan across watchlist" },
                  { cmd: "/research", desc: "Grounded fundamental analysis" },
                  { cmd: "/risk", desc: "Portfolio risk assessment" },
                  { cmd: "/news", desc: "Sentiment and breaking news" },
                  { cmd: "/trade", desc: "Entry/exit strategy planning" },
                  { cmd: "/guard", desc: "Portfolio health check" },
                ].map((item) => (
                  <div key={item.cmd} className="landing-command-row">
                    <code className="landing-command-code">{item.cmd}</code>
                    <span className="landing-command-desc">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <TerminalDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="landing-preview-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-h2">How Zentrade works</h2>
            <p className="landing-h2-sub">
              From setup to autonomous trading intelligence in under two minutes.
            </p>
          </div>
          <div className="landing-steps-grid">
            {[
              {
                step: "01",
                title: "Add your watchlist",
                desc: "Import symbols or build your watchlist. The platform connects to live market data immediately.",
              },
              {
                step: "02",
                title: "Deploy agents",
                desc: "Activate the agents you need — Market Scanner, Risk Monitor, Research Analyst, or all six.",
              },
              {
                step: "03",
                title: "Receive signals",
                desc: "Agents generate bullish, bearish, and alert signals with confidence scores streamed to your dashboard.",
              },
              {
                step: "04",
                title: "Act with confidence",
                desc: "Use the terminal for deeper analysis, or let agents auto-run on schedules you define.",
              },
            ].map((item) => (
              <div key={item.step} className="landing-step-card">
                <span className="landing-step-number">{item.step}</span>
                <h3 className="landing-step-title">{item.title}</h3>
                <p className="landing-step-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <div className="landing-cta-card">
            <h2 className="landing-cta-title">Start building your edge</h2>
            <p className="landing-cta-sub">
              Free tier includes 2 agents and 10 daily queries. No credit card. Cancel anytime.
            </p>
            <div className="landing-hero-actions">
              <Link href="/signup" className="landing-btn-primary">
                Get started free
                <ArrowRight size={15} />
              </Link>
              <Link href="/pricing" className="landing-btn-secondary">
                View plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="landing-footer-left">
              <img src="/zentrade-logo.svg" alt="Zentrade" width={24} height={24} className="rounded" />
              <span className="landing-footer-copy">Zentrade</span>
            </div>
            <div className="landing-footer-links">
              <Link href="/pricing">Pricing</Link>
              <Link href="/login">Sign in</Link>
              <span className="landing-footer-secure">
                <Lock size={10} />
                End-to-end encrypted
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
