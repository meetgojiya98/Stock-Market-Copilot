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
  GraduationCap,
  LineChart,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

const TOOL_TEASERS = [
  {
    title: "Portfolio Tracking",
    description: "See all your holdings, gains, and risk in one clean view.",
    icon: BriefcaseBusiness,
  },
  {
    title: "AI Research",
    description: "Ask questions about any stock and get answers backed by real data.",
    icon: Bot,
  },
  {
    title: "Paper Trading",
    description: "Practice trades without risking real money. Learn by doing.",
    icon: Target,
  },
  {
    title: "Smart Alerts",
    description: "Get notified when something important happens with your stocks.",
    icon: BellPlus,
  },
  {
    title: "Stock Screener",
    description: "Filter stocks by sector, price, and fundamentals to find your next trade.",
    icon: Search,
  },
  {
    title: "Community",
    description: "Share watchlists, discuss stocks, and see how you rank on the leaderboard.",
    icon: Users,
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create your account",
    description: "Sign up in seconds. No credit card needed.",
    icon: Rocket,
  },
  {
    step: "2",
    title: "Add your stocks",
    description: "Enter your holdings or start with a watchlist of stocks you're interested in.",
    icon: LineChart,
  },
  {
    step: "3",
    title: "Get smarter insights",
    description: "Use AI research, analytics, and alerts to make better decisions.",
    icon: Sparkles,
  },
] as const;

const STATS = [
  { value: "30+", label: "Trading tools" },
  { value: "AI", label: "Research copilot" },
  { value: "Free", label: "No credit card" },
  { value: "24/7", label: "Market coverage" },
] as const;

const FEATURES_DEEP = [
  {
    title: "Track everything in one place",
    description:
      "Your portfolio, watchlist, and market data all live together. No more jumping between apps.",
    icon: BarChart3,
    highlights: ["Live prices", "Gain/loss tracking", "Sector breakdown"],
  },
  {
    title: "Research with AI on your side",
    description:
      "Ask our AI copilot anything about a stock. It pulls real data, scores evidence, and helps you think clearly.",
    icon: Bot,
    highlights: ["Cited sources", "Bull & bear cases", "Decision-ready summaries"],
  },
  {
    title: "Practice before you trade",
    description:
      "Paper trade to test your ideas. Backtest strategies. See how your plan would have played out.",
    icon: Target,
    highlights: ["Paper trading", "Strategy testing", "Risk checks"],
  },
  {
    title: "Never miss a move",
    description:
      "Set alerts for price changes, portfolio events, and market shifts. We'll keep you in the loop.",
    icon: BellPlus,
    highlights: ["Custom alerts", "Live notifications", "Event tracking"],
  },
] as const;

const TRUSTED_BY = ["Smart traders", "Portfolio managers", "Day traders", "Long-term investors", "Students"] as const;

const FLOAT_LINKS = ["Portfolio", "Research", "Execution", "Screener", "AI Ideas"] as const;
const STATEMENT_WORDS = ["Unify", "your", "trading", "flow."] as const;

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
                Sign up
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
              <p className="landing-eyebrow">Your all-in-one trading toolkit</p>
              <h1 className="landing-title">Trade smarter. Not harder.</h1>
              <p className="landing-subtitle">
                30+ tools in one place. AI research, portfolio tracking, paper trading, alerts, and everything
                else you need to make better market decisions.
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
                Free to use. Create an account to unlock all tools.
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

      {/* ── Trusted By Strip ── */}
      <section className="landing-trust-strip">
        <div className="landing-shell">
          <div className="landing-trust-row">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((label, index) => (
              <span key={`${label}-${index}`} className="landing-trust-item">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Statement Strip ── */}
      <section className="landing-statement-strip">
        <div className="landing-shell">
          <h2 className="landing-statement" aria-label="Unify your trading flow">
            {STATEMENT_WORDS.map((word, index) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.07, duration: 0.5, ease: "easeOut" }}
              >
                {word}
              </motion.span>
            ))}
          </h2>
        </div>
      </section>

      {/* ── Tool Cards ── */}
      <section className="landing-tool-strip">
        <div className="landing-shell">
          <div className="landing-tool-grid">
            {TOOL_TEASERS.map(({ title, description, icon: Icon }, index) => (
              <motion.article
                key={title}
                className="landing-tool-card"
                initial={{ opacity: 0, y: 42 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: index * 0.08, duration: 0.52, ease: "easeOut" }}
              >
                <div className="landing-tool-icon">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link href={loginHref} className="landing-tool-link">
                  Try it free
                </Link>
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
              What you get
            </span>
            <h2 className="landing-section-title">Everything you need, nothing you don&apos;t</h2>
            <p className="landing-section-subtitle">
              Built for people who want to make smarter market decisions without the noise.
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
            Free to use
          </p>
          <h2>Ready to take control?</h2>
          <p>
            Create your free account and start making smarter market moves today.
          </p>
          <div className="landing-cta-row">
            <Link href={signupHref} className="landing-primary-cta landing-primary-cta-light">
              Sign up free
            </Link>
            <Link href={loginHref} className="landing-secondary-cta landing-secondary-cta-light">
              Log in
            </Link>
          </div>
          <span className="landing-final-footnote">
            <BarChart3 size={14} />
            Portfolio, watchlist, analytics, research, practice trading, and alerts &mdash; all included.
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
