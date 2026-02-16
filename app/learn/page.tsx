"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Bot,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  LineChart,
  Search,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";

const SECTIONS = [
  {
    id: "portfolio",
    icon: BriefcaseBusiness,
    title: "Portfolio",
    tagline: "Track your stocks in one place",
    description:
      "Your portfolio is where you add the stocks you own. Zentrade shows you how each one is doing, how much of your money is in each stock, and whether your overall mix is balanced.",
    howTo: [
      "Go to the Portfolio page and click \"Add Stock.\"",
      "Enter the stock symbol (like AAPL for Apple) and how many shares you own.",
      "Zentrade will pull live prices and show your gains or losses.",
      "Use the analytics panel to see your risk breakdown.",
    ],
    tip: "Start by adding your top 3-5 holdings. You can always add more later.",
  },
  {
    id: "watchlist",
    icon: Search,
    title: "Watchlist",
    tagline: "Keep an eye on stocks you're interested in",
    description:
      "Not ready to buy a stock yet? Add it to your watchlist. You'll see live prices and can track how it moves over time before making a decision.",
    howTo: [
      "Go to the Watchlist page.",
      "Type in any stock symbol to add it.",
      "Check back to see price changes and trends.",
      "When you're ready, move it to your portfolio or research it further.",
    ],
    tip: "Use your watchlist as a staging area. It's a low-pressure way to stay informed.",
  },
  {
    id: "research",
    icon: Bot,
    title: "AI Research",
    tagline: "Get real answers about any stock",
    description:
      "The AI Research tool lets you ask questions about any stock and get detailed, data-backed answers. It looks at real market data, scores the strength of evidence, and gives you a clear summary with sources.",
    howTo: [
      "Go to the Research page and pick a stock symbol.",
      "Ask anything: \"Is this stock a good buy?\" or \"What are the risks?\"",
      "Review the AI's analysis, including bull and bear cases.",
      "Use the insights to make your own decision.",
    ],
    tip: "The AI is a research assistant, not financial advice. Always think critically about the results.",
  },
  {
    id: "execution",
    icon: Target,
    title: "Paper Trading",
    tagline: "Practice trades without real money",
    description:
      "Paper trading lets you simulate buying and selling stocks without risking any real money. It's the perfect way to test your ideas, learn the mechanics of trading, and build confidence.",
    howTo: [
      "Go to the Execution page.",
      "Pick a stock and decide if you want to buy or sell.",
      "Set your order details (how many shares, what type of order).",
      "Track your paper trades and see how they would have turned out.",
    ],
    tip: "Treat paper trading like it's real. The habits you build here will carry over.",
  },
  {
    id: "analytics",
    icon: LineChart,
    title: "Analytics",
    tagline: "Understand your risk and performance",
    description:
      "The analytics page shows you the numbers behind your portfolio. See how diversified you are, how much risk you're taking, and how your performance compares to the market.",
    howTo: [
      "Make sure you have stocks in your portfolio first.",
      "Go to the Analytics page to see your risk scores.",
      "Check sector breakdown to see if you're too concentrated.",
      "Review performance metrics like returns and volatility.",
    ],
    tip: "Check your analytics at least once a week to stay aware of how your portfolio is positioned.",
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Alerts",
    tagline: "Never miss an important event",
    description:
      "Set up alerts so Zentrade notifies you when something important happens. Whether it's a price move, a portfolio event, or a market shift, you'll know about it.",
    howTo: [
      "Go to the Alerts page.",
      "Review any existing alerts and clear old ones.",
      "Set up new rules for stocks or events you care about.",
      "Filter alerts by importance to focus on what matters most.",
    ],
    tip: "Don't set too many alerts at first. Start with the most important ones and add more as needed.",
  },
  {
    id: "trending",
    icon: TrendingUp,
    title: "Trending",
    tagline: "See what other users are watching",
    description:
      "The Trending page shows you which stocks are most popular among Zentrade users. It's a quick way to discover what's getting attention and spot potential opportunities.",
    howTo: [
      "Go to the Trending page.",
      "See the most watched and most owned stocks.",
      "Add interesting ones to your watchlist.",
      "Research any that catch your eye before making decisions.",
    ],
    tip: "Popular doesn't mean good. Always do your own research before acting on trends.",
  },
  {
    id: "profile",
    icon: UserRound,
    title: "Profile & Settings",
    tagline: "Make Zentrade work for you",
    description:
      "Your profile is where you customize how Zentrade works. Set your risk comfort level, choose your favorite stocks, and adjust your preferences.",
    howTo: [
      "Go to the Profile page.",
      "Set your risk comfort level (conservative, moderate, or aggressive).",
      "Pick your focus stocks for the week.",
      "Adjust notification and display preferences.",
    ],
    tip: "Revisit your settings when market conditions change. What works in a calm market may not work in a volatile one.",
  },
] as const;

const FAQ = [
  {
    q: "Is Zentrade free?",
    a: "Yes. Creating an account and using all tools is free. Just sign up and start.",
  },
  {
    q: "Is this real trading?",
    a: "The paper trading feature uses simulated money. No real trades are placed. It's designed for learning and practice.",
  },
  {
    q: "Where does the stock data come from?",
    a: "Zentrade pulls real-time stock prices from market data providers. The data is live and updates throughout the trading day.",
  },
  {
    q: "Is the AI research reliable?",
    a: "The AI pulls real data and cites its sources. It's a powerful research tool, but it's not financial advice. Always make your own decisions.",
  },
  {
    q: "Can I use Zentrade on my phone?",
    a: "Yes. Zentrade is fully responsive and works on phones, tablets, and desktops.",
  },
  {
    q: "How do I get started?",
    a: "Create a free account, add a few stocks to your portfolio or watchlist, and explore the tools. The app will guide you from there.",
  },
] as const;

export default function LearnPage() {
  return (
    <div className="pro-container learn-page">
      <motion.div
        className="learn-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="learn-hero-icon">
          <GraduationCap size={26} />
        </div>
        <h1>Learn Zentrade</h1>
        <p>
          A simple guide to every feature. Whether you're new to investing or just new to Zentrade,
          this page will help you get the most out of the platform.
        </p>

        <div className="learn-toc">
          {SECTIONS.map(({ id, title, icon: Icon }) => (
            <a key={id} href={`#${id}`} className="learn-toc-link">
              <Icon size={13} />
              {title}
            </a>
          ))}
          <a href="#faq" className="learn-toc-link">
            <HelpCircle size={13} />
            FAQ
          </a>
        </div>
      </motion.div>

      <div className="learn-grid">
        {SECTIONS.map(({ id, icon: Icon, title, tagline, description, howTo, tip }, index) => (
          <motion.section
            key={id}
            id={id}
            className="learn-section"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ delay: index * 0.04, duration: 0.5, ease: "easeOut" }}
          >
            <div className="learn-section-header">
              <div className="learn-section-icon">
                <Icon size={20} />
              </div>
              <div>
                <h2>{title}</h2>
                <p>{tagline}</p>
              </div>
            </div>

            <div className="learn-section-body">
              <p>{description}</p>

              <h3>How to use it</h3>
              <ol className="learn-steps">
                {howTo.map((step, stepIndex) => (
                  <li key={stepIndex} className="learn-step">
                    <span className="learn-step-number">{stepIndex + 1}</span>
                    <span className="learn-step-text">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="learn-tip">
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Tip:</strong> {tip}</span>
              </div>
            </div>
          </motion.section>
        ))}

        <motion.section
          id="faq"
          className="learn-section"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="learn-section-header">
            <div className="learn-section-icon">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2>Frequently Asked Questions</h2>
              <p>Quick answers to common questions</p>
            </div>
          </div>

          <div className="learn-section-body">
            <div className="learn-faq">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="learn-faq-item">
                  <div className="learn-faq-q">{q}</div>
                  <div className="learn-faq-a">{a}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.div
          className="learn-cta-section"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <BarChart3 size={28} style={{ margin: "0 auto", color: "var(--accent)" }} />
          <h2>Ready to get started?</h2>
          <p>Create your free account and start exploring all the tools Zentrade has to offer.</p>
          <Link href="/signup" className="learn-cta-btn">
            Sign up free
            <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
