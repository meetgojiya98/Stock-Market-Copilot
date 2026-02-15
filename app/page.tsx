"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BellPlus,
  Bot,
  BriefcaseBusiness,
  ShieldCheck,
  Target,
} from "lucide-react";
import ThemeModeSwitch from "../components/ThemeModeSwitch";

const TOOL_TEASERS = [
  {
    title: "Portfolio Intelligence",
    description: "Track positions, performance, and allocations from one authenticated workspace.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Research Copilot",
    description: "Generate thesis, challenge assumptions, and verify evidence with AI support.",
    icon: Bot,
  },
  {
    title: "Execution Lab",
    description: "Test entries, risk limits, and scenarios before placing the next trade.",
    icon: Target,
  },
  {
    title: "Analytics + Alerts",
    description: "Monitor live moves and trigger context-aware notifications in real time.",
    icon: BellPlus,
  },
] as const;

const FLOAT_LINKS = ["Portfolio", "Research", "Execution", "Alerts"] as const;
const STATEMENT_WORDS = ["Unify", "your", "trading", "flow."] as const;

export default function LandingPage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const discY = useTransform(scrollYProgress, [0, 1], [0, 170]);
  const discRotate = useTransform(scrollYProgress, [0, 1], [-10, 15]);
  const discScale = useTransform(scrollYProgress, [0, 1], [1, 0.84]);
  const heroGlowY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.4]);

  return (
    <div className="landing-root">
      <section className="landing-hero" ref={heroRef}>
        <motion.div className="landing-dynamic-field" style={{ y: heroGlowY }} aria-hidden="true">
          <span className="landing-orb landing-orb-a" />
          <span className="landing-orb landing-orb-b" />
          <span className="landing-orb landing-orb-c" />
          <span className="landing-ribbon landing-ribbon-a" />
          <span className="landing-ribbon landing-ribbon-b" />
        </motion.div>

        <div className="landing-shell">
          <motion.header
            className="landing-nav"
            initial={{ opacity: 0, y: -22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Link href="/" className="landing-brand" aria-label="Stock Market Copilot home">
              Stock Market Copilot
            </Link>

            <div className="landing-nav-actions">
              <ThemeModeSwitch className="landing-theme-switch" />
              <Link href="/login" className="landing-login-link">
                Log in
              </Link>
              <Link href="/signup" className="landing-signup-link">
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
              <p className="landing-eyebrow">Single account for your full market stack</p>
              <h1 className="landing-title">One app for all your market moves.</h1>
              <p className="landing-subtitle">
                Sign up once, then unlock portfolio tracking, watchlists, analytics, research copilots,
                execution planning, and alerts.
              </p>

              <motion.div
                className="landing-cta-row"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.55, ease: "easeOut" }}
              >
                <Link href="/signup" className="landing-primary-cta">
                  Create account
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/login" className="landing-secondary-cta">
                  I already have an account
                </Link>
              </motion.div>

              <p className="landing-auth-note">
                All tools are locked behind authentication. Log in or sign up to continue.
              </p>
            </motion.div>

            <motion.div
              className="landing-discs"
              aria-hidden="true"
              style={{ y: discY, rotate: discRotate, scale: discScale }}
              initial={{ opacity: 0, scale: 0.82, x: 26 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.95, ease: "easeOut" }}
            >
              <span className="landing-disc landing-disc-1" />
              <span className="landing-disc landing-disc-2" />
              <span className="landing-disc landing-disc-3" />
              <span className="landing-disc landing-disc-4" />
              <span className="landing-disc landing-disc-5" />
              <span className="landing-disc landing-disc-6" />
              <span className="landing-disc landing-disc-7" />
              <span className="landing-disc landing-disc-8" />
            </motion.div>
          </div>
        </div>
      </section>

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
                <Link href="/login" className="landing-tool-link">
                  Log in to use
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

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
            Auth-first platform
          </p>
          <h2>1 account, plus you.</h2>
          <p>
            It only takes seconds to start. Create an account and unlock the full Stock Market Copilot
            toolkit.
          </p>
          <div className="landing-cta-row">
            <Link href="/signup" className="landing-primary-cta landing-primary-cta-light">
              Sign up now
            </Link>
            <Link href="/login" className="landing-secondary-cta landing-secondary-cta-light">
              Log in
            </Link>
          </div>
          <span className="landing-final-footnote">
            <BarChart3 size={14} />
            Portfolio, watchlist, analytics, research, execution, and alerts are available after sign in.
          </span>
        </div>
      </motion.section>

      <nav className="landing-floating-nav" aria-label="Tool categories">
        {FLOAT_LINKS.map((label) => (
          <Link key={label} href="/login" className="landing-floating-link">
            {label}
          </Link>
        ))}
      </nav>

      <Link href="/login" className="landing-support-link">
        Support
      </Link>
    </div>
  );
}
