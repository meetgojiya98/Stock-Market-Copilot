"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellPlus,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Globe,
  Layers,
  LineChart,
  Lock,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

/* ─── Data ────────────────────────────────────────────────────────── */

const TICKER_DATA = [
  { symbol: "AAPL", price: 189.84, change: +1.42 },
  { symbol: "MSFT", price: 422.86, change: +2.18 },
  { symbol: "GOOGL", price: 175.98, change: -0.76 },
  { symbol: "NVDA", price: 878.36, change: +4.91 },
  { symbol: "TSLA", price: 248.42, change: -1.23 },
  { symbol: "AMZN", price: 186.13, change: +0.95 },
  { symbol: "META", price: 505.68, change: +3.14 },
  { symbol: "JPM", price: 198.47, change: +0.82 },
];

const STATS = [
  { value: "130+", label: "Trading tools" },
  { value: "AI", label: "Research copilot" },
  { value: "Free", label: "No credit card" },
  { value: "51", label: "App pages" },
] as const;

const BENTO_ITEMS = [
  {
    title: "Portfolio Tracking",
    description: "All your holdings, performance, and risk metrics in one clean view with real-time updates.",
    icon: BriefcaseBusiness,
    span: "col",
    accent: "#7c3aed",
  },
  {
    title: "AI Research",
    description: "Ask anything about a stock. Get cited, evidence-scored answers.",
    icon: Bot,
    span: "row",
    accent: "#ec4899",
  },
  {
    title: "Paper Trading",
    description: "Practice trades risk-free. Backtest strategies against historical data.",
    icon: Target,
    span: "default",
    accent: "#06b6d4",
  },
  {
    title: "Smart Alerts",
    description: "Custom notifications for price moves, portfolio events, and market shifts.",
    icon: BellPlus,
    span: "default",
    accent: "#f59e0b",
  },
  {
    title: "Stock Screener",
    description: "Filter by sector, price, fundamentals, and technical signals to find your next trade.",
    icon: Search,
    span: "default",
    accent: "#10b981",
  },
  {
    title: "Community",
    description: "Share watchlists, discuss picks, compete on leaderboards.",
    icon: Users,
    span: "col",
    accent: "#8b5cf6",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create your account",
    description: "Sign up in seconds. No credit card, no friction.",
    icon: Rocket,
  },
  {
    step: "2",
    title: "Add your stocks",
    description: "Import your portfolio or build a watchlist from scratch.",
    icon: LineChart,
  },
  {
    step: "3",
    title: "Get smarter insights",
    description: "AI research, analytics, pattern detection, and alerts — all working for you.",
    icon: Sparkles,
  },
] as const;

const FEATURES_DEEP = [
  {
    title: "Track everything in one place",
    description:
      "Portfolio, watchlist, and market data all live together. No more tab-switching.",
    icon: BarChart3,
    highlights: ["Live prices", "Gain/loss tracking", "Sector breakdown", "Tax harvesting"],
  },
  {
    title: "Research with AI on your side",
    description:
      "Ask our copilot anything. It pulls real data, scores evidence, and gives you bull & bear cases.",
    icon: Bot,
    highlights: ["Cited sources", "Bull & bear cases", "Pattern recognition", "Decision summaries"],
  },
  {
    title: "Practice before you trade",
    description:
      "Paper trade to test ideas. Backtest strategies. Simulate what-if scenarios.",
    icon: Target,
    highlights: ["Paper trading", "Strategy backtesting", "Scenario analysis", "Risk simulation"],
  },
  {
    title: "Never miss a move",
    description:
      "Set alerts for price changes, earnings, insider moves, and portfolio events.",
    icon: BellPlus,
    highlights: ["Custom alerts", "Live notifications", "Earnings calendar", "Insider tracking"],
  },
] as const;

const WHY_ZENTRADE = [
  {
    icon: Layers,
    title: "130+ tools, one app",
    description: "Portfolio, research, execution, analytics, community — everything in a single place.",
  },
  {
    icon: Bot,
    title: "AI-first research",
    description: "Ask questions in plain English. Get cited, evidence-scored answers instantly.",
  },
  {
    icon: Lock,
    title: "Your data, your device",
    description: "All data stays in your browser. No tracking, no selling your information.",
  },
  {
    icon: Globe,
    title: "Works everywhere",
    description: "Desktop, tablet, mobile. Responsive design that feels native on every device.",
  },
] as const;

const FAQ = [
  { q: "Is Zentrade really free?", a: "Yes. All 130+ tools are free to use. Create an account and start trading smarter." },
  { q: "Do I need to connect a brokerage?", a: "No. Zentrade is a research and tracking toolkit. You make trades in your own brokerage." },
  { q: "Is my data safe?", a: "All data is stored locally in your browser. We don't track, sell, or share your information." },
  { q: "What markets are covered?", a: "US equities, ETFs, options, and crypto. We pull data from public APIs." },
  { q: "Can I use it on mobile?", a: "Absolutely. The app is fully responsive and works great on phones and tablets." },
] as const;

const FLOAT_LINKS = ["Portfolio", "Research", "Execution", "Screener", "AI Ideas"] as const;

/* ─── Ticker Tape ─────────────────────────────────────────────────── */

function TickerTape() {
  const doubled = [...TICKER_DATA, ...TICKER_DATA];
  return (
    <div className="landing-ticker-wrap" aria-hidden="true">
      <div className="landing-ticker-track">
        {doubled.map((t, i) => (
          <span key={`${t.symbol}-${i}`} className="landing-ticker-item">
            <span className="landing-ticker-sym">{t.symbol}</span>
            <span className="landing-ticker-price">${t.price.toFixed(2)}</span>
            <span className={`landing-ticker-change ${t.change >= 0 ? "pos" : "neg"}`}>
              {t.change >= 0 ? "+" : ""}
              {t.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Live Mini Chart ─────────────────────────────────────────────── */

function MiniSparkline({ color }: { color: string }) {
  const points = useMemo(() => {
    const pts: number[] = [];
    let v = 50 + Math.random() * 30;
    for (let i = 0; i < 24; i++) {
      v += (Math.random() - 0.45) * 6;
      v = Math.max(10, Math.min(90, v));
      pts.push(v);
    }
    return pts;
  }, []);
  const d = points.map((y, i) => `${(i / 23) * 100},${100 - y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="landing-mini-spark" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sp-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <polygon points={`0,100 ${d} 100,100`} fill={`url(#sp-${color.replace("#", "")})`} />
    </svg>
  );
}

/* ─── App Preview Mock ────────────────────────────────────────────── */

function AppPreview() {
  return (
    <div className="landing-preview">
      <div className="landing-preview-bar">
        <div className="landing-preview-dots">
          <span /><span /><span />
        </div>
        <span className="landing-preview-url">zentrade.app/portfolio</span>
      </div>
      <div className="landing-preview-body">
        <div className="landing-preview-sidebar">
          {["Portfolio", "Watchlist", "Research", "Execution", "Analytics"].map((item) => (
            <div key={item} className={`landing-preview-nav-item ${item === "Portfolio" ? "active" : ""}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="landing-preview-main">
          <div className="landing-preview-header">
            <span className="landing-preview-title">Portfolio</span>
            <span className="landing-preview-badge">+12.4%</span>
          </div>
          <div className="landing-preview-chart">
            <MiniSparkline color="#7c3aed" />
          </div>
          <div className="landing-preview-table">
            {[
              { sym: "AAPL", pct: "+2.4%", pos: true },
              { sym: "NVDA", pct: "+5.1%", pos: true },
              { sym: "TSLA", pct: "-1.2%", pos: false },
              { sym: "MSFT", pct: "+1.8%", pos: true },
            ].map((r) => (
              <div key={r.sym} className="landing-preview-row">
                <span>{r.sym}</span>
                <span className={r.pos ? "pos" : "neg"}>{r.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FAQ Accordion ───────────────────────────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div className={`landing-faq-item ${open ? "open" : ""}`}>
      <button className="landing-faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={18} className={`landing-faq-chevron ${open ? "rotated" : ""}`} />
      </button>
      <div
        className="landing-faq-a"
        ref={contentRef}
        style={{ maxHeight: open ? `${contentRef.current?.scrollHeight ?? 200}px` : "0px" }}
      >
        <p>{a}</p>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const sculptureY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const sculptureRotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);
  const sculptureScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const heroGlowY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.4]);

  useEffect(() => {
    const sync = () => setLoggedIn(Boolean(localStorage.getItem("access_token")));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const loginHref = useMemo(() => (loggedIn ? "/portfolio" : "/login"), [loggedIn]);
  const signupHref = useMemo(() => (loggedIn ? "/portfolio" : "/signup"), [loggedIn]);

  return (
    <div className="landing-root">
      {/* ── Ticker Tape ── */}
      <TickerTape />

      {/* ── Hero ── */}
      <section className="landing-hero" ref={heroRef}>
        <motion.div className="landing-dynamic-field" style={{ y: heroGlowY }} aria-hidden="true">
          <span className="landing-orb landing-orb-a" />
          <span className="landing-orb landing-orb-b" />
          <span className="landing-orb landing-orb-c" />
        </motion.div>

        <div className="landing-shell">
          <motion.header
            className="landing-nav"
            initial={{ opacity: 0, y: -22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Link href="/" className="landing-brand" aria-label="Zentrade home">
              <img src="/zentrade-logo.svg" alt="" className="landing-brand-logo" />
              Zentrade
            </Link>

            <div className="landing-nav-actions">
              <Link href="/learn" className="landing-login-link">
                Learn
              </Link>
              <Link href={loginHref} className="landing-login-link">
                Log in
              </Link>
              <Link href={signupHref} className="landing-signup-link">
                Get started
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </motion.header>

          <div className="landing-hero-grid">
            <motion.div
              className="landing-copy"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ y: copyY, opacity: copyOpacity }}
            >
              <p className="landing-eyebrow">
                <Sparkles size={13} />
                Your all-in-one trading toolkit
              </p>
              <h1 className="landing-title">
                Trade smarter.{" "}
                <span className="landing-title-gradient">Not harder.</span>
              </h1>
              <p className="landing-subtitle">
                130+ tools in one place — AI research, portfolio tracking, paper trading, pattern
                recognition, alerts, and everything else you need to make better market decisions.
              </p>

              <motion.div
                className="landing-cta-row"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.55, ease: "easeOut" }}
              >
                <Link href={signupHref} className="landing-primary-cta">
                  Get started free
                  <ArrowUpRight size={16} />
                </Link>
                <Link href={loginHref} className="landing-secondary-cta">
                  I already have an account
                </Link>
              </motion.div>

              <p className="landing-auth-note">
                Free forever. No credit card required.
              </p>
            </motion.div>

            <motion.div
              className="landing-market-sculpture"
              aria-hidden="true"
              style={{ y: sculptureY, rotate: sculptureRotate, scale: sculptureScale }}
              initial={{ opacity: 0, scale: 0.82, x: 26 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.95, ease: "easeOut" }}
            >
              <span className="landing-market-grid" />
              <span className="landing-market-base" />
              <span className="landing-market-ring" />
              <span className="landing-market-ring landing-market-ring-2" />
              <span className="landing-market-candle landing-market-candle-1" />
              <span className="landing-market-candle landing-market-candle-2" />
              <span className="landing-market-candle landing-market-candle-3" />
              <span className="landing-market-candle landing-market-candle-4" />
              <span className="landing-market-candle landing-market-candle-5" />
              <span className="landing-market-trend">
                <span className="landing-market-node landing-market-node-1" />
                <span className="landing-market-node landing-market-node-2" />
                <span className="landing-market-node landing-market-node-3" />
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Stats ── */}
      <section className="landing-stats-strip">
        <div className="landing-shell">
          <div className="landing-stats-grid">
            {STATS.map(({ value, label }, index) => (
              <motion.div
                key={label}
                className="landing-stat-item"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.06, duration: 0.5, ease: "easeOut" }}
              >
                <span className="landing-stat-value">{value}</span>
                <span className="landing-stat-label">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App Preview ── */}
      <section className="landing-preview-strip">
        <div className="landing-shell">
          <motion.div
            className="landing-how-header"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="landing-section-eyebrow">
              <Zap size={13} />
              See it in action
            </span>
            <h2 className="landing-section-title">A real product, not a mockup</h2>
            <p className="landing-section-subtitle">
              Every feature works. Sign up and try it yourself.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <AppPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Bento Grid ── */}
      <section className="landing-bento-strip">
        <div className="landing-shell">
          <motion.div
            className="landing-how-header"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="landing-section-eyebrow">
              <Layers size={13} />
              Core tools
            </span>
            <h2 className="landing-section-title">Everything you need, nothing you don&apos;t</h2>
          </motion.div>

          <div className="landing-bento-grid">
            {BENTO_ITEMS.map(({ title, description, icon: Icon, span, accent }, index) => (
              <motion.article
                key={title}
                className={`landing-bento-card landing-bento-${span}`}
                initial={{ opacity: 0, y: 42 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.07, duration: 0.5, ease: "easeOut" }}
              >
                <div className="landing-bento-icon" style={{ background: `${accent}18`, color: accent }}>
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="landing-bento-spark">
                  <MiniSparkline color={accent} />
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-how-strip">
        <div className="landing-shell">
          <motion.div
            className="landing-how-header"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="landing-section-eyebrow">
              <Zap size={13} />
              Simple to start
            </span>
            <h2 className="landing-section-title">Up and running in minutes</h2>
            <p className="landing-section-subtitle">
              No complicated setup. No steep learning curve. Just sign up and start.
            </p>
          </motion.div>

          <div className="landing-how-grid">
            {HOW_IT_WORKS.map(({ step, title, description, icon: Icon }, index) => (
              <motion.div
                key={step}
                className="landing-how-card"
                initial={{ opacity: 0, y: 38 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: index * 0.1, duration: 0.55, ease: "easeOut" }}
              >
                <div className="landing-how-step">{step}</div>
                <div className="landing-how-icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Deep Dive ── */}
      <section className="landing-features-strip">
        <div className="landing-shell">
          <motion.div
            className="landing-how-header"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="landing-section-eyebrow">
              <Sparkles size={13} />
              Deep dive
            </span>
            <h2 className="landing-section-title">Built for serious traders</h2>
            <p className="landing-section-subtitle">
              Every feature is designed to help you make better decisions, faster.
            </p>
          </motion.div>

          <div className="landing-features-grid">
            {FEATURES_DEEP.map(({ title, description, icon: Icon, highlights }, index) => (
              <motion.div
                key={title}
                className="landing-feature-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08, duration: 0.55, ease: "easeOut" }}
              >
                <div className="landing-feature-icon">
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <ul className="landing-feature-highlights">
                  {highlights.map((h) => (
                    <li key={h}>
                      <CheckCircle2 size={14} />
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Zentrade ── */}
      <section className="landing-why-strip">
        <div className="landing-shell">
          <motion.div
            className="landing-how-header"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="landing-section-eyebrow">
              <TrendingUp size={13} />
              Why us
            </span>
            <h2 className="landing-section-title">Why traders choose Zentrade</h2>
          </motion.div>

          <div className="landing-why-grid">
            {WHY_ZENTRADE.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                className="landing-why-card"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
              >
                <div className="landing-why-icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-faq-strip">
        <div className="landing-shell">
          <motion.div
            className="landing-how-header"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="landing-section-title">Frequently asked questions</h2>
          </motion.div>

          <div className="landing-faq-list">
            {FAQ.map(({ q, a }) => (
              <FAQItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Learn CTA ── */}
      <motion.section
        className="landing-learn-strip"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="landing-shell">
          <div className="landing-learn-card">
            <div className="landing-learn-content">
              <div className="landing-learn-icon">
                <GraduationCap size={28} />
              </div>
              <h3>New to investing or Zentrade?</h3>
              <p>
                Check out our Learn page for a quick walkthrough of every feature
                and how to get the most out of the platform.
              </p>
              <Link href="/learn" className="landing-learn-link">
                Explore the guide
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Final CTA ── */}
      <motion.section
        className="landing-final-cta"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="landing-shell landing-final-inner">
          <p className="landing-final-kicker">
            <ShieldCheck size={16} />
            Free forever
          </p>
          <h2>Ready to take control?</h2>
          <p>
            Join traders who use Zentrade to make smarter, faster market decisions every day.
          </p>
          <div className="landing-cta-row">
            <Link href={signupHref} className="landing-primary-cta landing-primary-cta-light">
              Get started free
              <ArrowUpRight size={16} />
            </Link>
            <Link href={loginHref} className="landing-secondary-cta landing-secondary-cta-light">
              Log in
            </Link>
          </div>
          <span className="landing-final-footnote">
            130+ tools included — portfolio, AI research, execution, analytics, paper trading, and more.
          </span>
        </div>
      </motion.section>

      {/* ── Floating Nav ── */}
      <nav className="landing-floating-nav" aria-label="Tool categories">
        {FLOAT_LINKS.map((label) => (
          <Link key={label} href={loginHref} className="landing-floating-link">
            {label}
          </Link>
        ))}
      </nav>

      <Link href="/learn" className="landing-support-link">
        <GraduationCap size={14} />
        Learn
      </Link>
    </div>
  );
}
