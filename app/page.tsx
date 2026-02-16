"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Target,
} from "lucide-react";

/* ─── Data ─────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: BriefcaseBusiness,
    title: "Portfolio tracking",
    description:
      "Add your holdings and see live prices, gain/loss, sector allocation, risk metrics, and performance history — all in one view.",
    highlights: ["Real-time prices", "Sector breakdown", "Tax harvesting", "Rebalancing engine"],
  },
  {
    icon: Bot,
    title: "AI research",
    description:
      "Ask any question about any stock. Get cited, evidence-scored answers with bull and bear cases in seconds.",
    highlights: ["Cited sources", "Bull & bear cases", "Pattern recognition", "Earnings analysis"],
  },
  {
    icon: Target,
    title: "Paper trading",
    description:
      "Practice trading with simulated money. Test strategies, backtest ideas, and build confidence before risking real capital.",
    highlights: ["Simulated orders", "Strategy backtesting", "Position tracking", "Risk-free practice"],
  },
] as const;

const STEPS = [
  { num: "1", title: "Create an account", description: "Free signup. No credit card. Takes 10 seconds." },
  { num: "2", title: "Add your stocks", description: "Import a portfolio or build a watchlist from scratch." },
  { num: "3", title: "Get smarter insights", description: "AI research, alerts, analytics — all working for you." },
] as const;

const FAQ = [
  { q: "Is Zentrade free?", a: "Yes. All 130+ tools are free. No credit card, no hidden fees, no trial period." },
  { q: "Do I need to connect a brokerage?", a: "No. Zentrade is a research and tracking toolkit. You make trades in your own brokerage." },
  { q: "Is my data safe?", a: "All data is stored locally in your browser. We don't track, sell, or share your information." },
  { q: "What markets are covered?", a: "US equities, ETFs, options, and crypto. Data is pulled from public APIs." },
  { q: "Can I use it on my phone?", a: "Yes. The app is fully responsive and works on phones, tablets, and desktops." },
] as const;

/* ─── Mini Sparkline ───────────────────────────────────── */

function MiniSparkline({ color }: { color: string }) {
  const points = useMemo(() => {
    const pts: number[] = [];
    let v = 40 + Math.random() * 20;
    for (let i = 0; i < 28; i++) {
      v += (Math.random() - 0.42) * 7;
      v = Math.max(8, Math.min(92, v));
      pts.push(v);
    }
    return pts;
  }, []);
  const d = points.map((y, i) => `${(i / 27) * 100},${100 - y}`).join(" ");
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <polygon points={`0,100 ${d} 100,100`} fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── App Preview ──────────────────────────────────────── */

function AppPreview() {
  return (
    <div className="lp-preview">
      <div className="lp-preview-bar">
        <div className="lp-preview-dots"><span /><span /><span /></div>
        <span className="lp-preview-url">zentrade.app/portfolio</span>
      </div>
      <div className="lp-preview-body">
        <aside className="lp-preview-sidebar">
          {["Portfolio", "Watchlist", "Research", "Execution", "Analytics"].map((item) => (
            <div key={item} className={`lp-preview-nav ${item === "Portfolio" ? "active" : ""}`}>{item}</div>
          ))}
        </aside>
        <div className="lp-preview-main">
          <div className="lp-preview-top">
            <span className="lp-preview-title">Portfolio</span>
            <span className="lp-preview-badge">+12.4%</span>
          </div>
          <div className="lp-preview-chart"><MiniSparkline color="#7c3aed" /></div>
          <div className="lp-preview-table">
            {[
              { sym: "AAPL", price: "$189.84", pct: "+2.4%", up: true },
              { sym: "NVDA", price: "$878.36", pct: "+5.1%", up: true },
              { sym: "TSLA", price: "$248.42", pct: "-1.2%", up: false },
              { sym: "MSFT", price: "$422.86", pct: "+1.8%", up: true },
            ].map((r) => (
              <div key={r.sym} className="lp-preview-row">
                <span className="lp-preview-sym">{r.sym}</span>
                <span className="lp-preview-price">{r.price}</span>
                <span className={r.up ? "lp-pos" : "lp-neg"}>{r.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FAQ Item ─────────────────────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className={`lp-faq-item${open ? " open" : ""}`}>
      <button className="lp-faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={16} className={`lp-faq-icon${open ? " rotated" : ""}`} />
      </button>
      <div className="lp-faq-a" ref={ref} style={{ maxHeight: open ? `${ref.current?.scrollHeight ?? 200}px` : "0px" }}>
        <p>{a}</p>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(Boolean(localStorage.getItem("access_token")));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const go = useMemo(() => (loggedIn ? "/portfolio" : "/signup"), [loggedIn]);
  const login = useMemo(() => (loggedIn ? "/portfolio" : "/login"), [loggedIn]);

  return (
    <div className="lp">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-logo">
            <img src="/zentrade-logo.svg" alt="" className="lp-logo-img" />
            <span className="lp-logo-text">Zentrade</span>
          </Link>
          <div className="lp-nav-links">
            <Link href="/learn" className="lp-nav-link">Learn</Link>
            <Link href={login} className="lp-nav-link">Log in</Link>
            <Link href={go} className="lp-nav-cta">
              Get started
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <h1 className="lp-h1">
            Your complete<br />
            <span className="lp-gradient">trading toolkit</span>
          </h1>
          <p className="lp-hero-sub">
            130+ tools in one app — portfolio tracking, AI research, paper trading,
            stock screening, alerts, and everything else you need to make better
            market decisions. Free forever.
          </p>
          <div className="lp-hero-actions">
            <Link href={go} className="lp-btn-primary">
              Get started free
              <ArrowRight size={15} />
            </Link>
            <Link href={login} className="lp-btn-secondary">
              Log in
            </Link>
          </div>
          <div className="lp-hero-stats">
            <span><strong>130+</strong> tools</span>
            <span className="lp-dot" />
            <span><strong>AI</strong> research</span>
            <span className="lp-dot" />
            <span><strong>Free</strong> forever</span>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="lp-section">
        <div className="lp-container">
          <AppPreview />
        </div>
      </section>

      {/* Features */}
      <section className="lp-section lp-features-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-h2">Everything you need, nothing you don&apos;t</h2>
            <p className="lp-section-sub">Three pillars that cover the full trading workflow.</p>
          </div>
          <div className="lp-features">
            {FEATURES.map(({ icon: Icon, title, description, highlights }) => (
              <div key={title} className="lp-feature-card">
                <div className="lp-feature-icon"><Icon size={22} /></div>
                <h3 className="lp-feature-title">{title}</h3>
                <p className="lp-feature-desc">{description}</p>
                <ul className="lp-feature-list">
                  {highlights.map((h) => (
                    <li key={h}><CheckCircle2 size={14} />{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-h2">Up and running in minutes</h2>
            <p className="lp-section-sub">No setup wizard. No learning curve.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map(({ num, title, description }) => (
              <div key={num} className="lp-step">
                <div className="lp-step-num">{num}</div>
                <h3 className="lp-step-title">{title}</h3>
                <p className="lp-step-desc">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-h2">Frequently asked questions</h2>
          </div>
          <div className="lp-faq">
            {FAQ.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* Learn CTA */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-learn-card">
            <GraduationCap size={24} />
            <div>
              <h3>New to investing?</h3>
              <p>Our learn page walks you through every feature step by step.</p>
            </div>
            <Link href="/learn" className="lp-learn-link">
              Read the guide <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <h2>Ready to trade smarter?</h2>
          <p>Join traders who use Zentrade to make better market decisions every day.</p>
          <Link href={go} className="lp-btn-primary lp-btn-primary-inv">
            Get started free <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span className="lp-footer-brand">Zentrade</span>
          <span className="lp-footer-copy">{new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
