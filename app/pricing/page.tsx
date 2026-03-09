"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Building2, ChevronDown } from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TIERS = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Core tools for individual traders",
    icon: Sparkles,
    cta: "Get started",
    popular: false,
    features: [
      "10 AI queries per day",
      "2 active agents",
      "10 portfolio positions",
      "Manual agent runs only",
      "Basic data sources",
      "7-day research history",
      "Basic terminal commands",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: 49,
    period: "/month",
    description: "Full agent fleet with automated monitoring",
    icon: Zap,
    cta: "Start 14-day trial",
    popular: true,
    features: [
      "Unlimited AI queries",
      "All 6 agent types",
      "Unlimited positions",
      "Auto-run every 15 min",
      "All data sources",
      "Unlimited research history",
      "All terminal commands",
      "Priority support",
      "API access",
      "Custom watchlists",
    ],
  },
  {
    name: "Enterprise",
    price: -1,
    period: "",
    description: "For teams and institutions",
    icon: Building2,
    cta: "Contact sales",
    popular: false,
    features: [
      "Everything in Pro",
      "Unlimited custom agents",
      "Real-time agent execution",
      "Premium data sources",
      "Unlimited history + export",
      "Custom terminal commands",
      "API + webhooks",
      "Dedicated support",
      "SSO & team management",
      "Custom integrations",
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "Can I switch between monthly and annual billing?",
    a: "Yes. Switch any time from account settings. Annual upgrades receive a prorated credit for the remainder of the current cycle.",
  },
  {
    q: "What happens when I hit the free tier limits?",
    a: "You'll receive a notification near your daily query or agent limits. Once reached, queries pause until the next day — or upgrade to Pro instantly.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes. 14-day free trial with full access. No credit card required to start.",
  },
  {
    q: "How does auto-run work on Pro?",
    a: "Pro agents can be scheduled to run every 15 minutes, continuously monitoring your watchlists and portfolio. You'll receive alerts when significant signals are detected.",
  },
  {
    q: "Can I export my data if I cancel?",
    a: "All research history, agent results, and portfolio data can be exported as CSV or JSON at any time. Data remains available for 30 days after cancellation.",
  },
];

function FAQItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="landing-faq-item" style={open ? { borderColor: "color-mix(in srgb, var(--ink) 15%, var(--surface-border))" } : undefined}>
      <button onClick={() => setOpen(!open)} className="landing-faq-q">
        <span>{item.q}</span>
        <ChevronDown
          size={15}
          className={`landing-faq-chevron ${open ? "rotated" : ""}`}
        />
      </button>
      <div className="landing-faq-a" style={{ maxHeight: open ? "200px" : "0px", opacity: open ? 1 : 0 }}>
        <p>{item.a}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  const formatPrice = (tier: (typeof TIERS)[number]) => {
    if (tier.price === 0) return "$0";
    if (tier.price === -1) return "Custom";
    if (annual) return `$${Math.round(tier.price * 0.8)}`;
    return `$${tier.price}`;
  };

  const formatPeriod = (tier: (typeof TIERS)[number]) => {
    if (tier.price === 0) return "forever";
    if (tier.price === -1) return "";
    return "/mo";
  };

  return (
    <div className="landing-root">
      <div className="landing-container" style={{ maxWidth: 1060 }}>
        {/* Header */}
        <div style={{ padding: "1.5rem 0" }}>
          <div className="flex items-center justify-between">
            <Link href="/">
              <BrandLogo size={32} withWordmark showTagline={false} />
            </Link>
            <Link href="/login" className="landing-nav-link">Sign in</Link>
          </div>
        </div>

        <div className="landing-section-header" style={{ marginBottom: "2.5rem" }}>
          <h1 className="landing-h2" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}>
            Simple pricing
          </h1>
          <p className="landing-h2-sub">
            Start free. Upgrade when your strategy demands it.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: !annual ? "var(--ink)" : "var(--ink-muted)", transition: "color 0.2s" }}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            style={{
              position: "relative",
              width: 44,
              height: 24,
              borderRadius: 999,
              background: annual ? "var(--ink)" : "color-mix(in srgb, var(--ink) 15%, transparent)",
              transition: "background 0.2s",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: annual ? "var(--bg-canvas)" : "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transition: "transform 0.2s",
                transform: annual ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: annual ? "var(--ink)" : "var(--ink-muted)", transition: "color 0.2s" }}>
            Annual
          </span>
          {annual && (
            <span className="badge-positive" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: 999 }}>
              Save 20%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, borderRadius: "1rem", overflow: "hidden", border: "1px solid var(--surface-border)", background: "var(--surface-border)", marginBottom: "4rem" }}>
          {TIERS.map((tier) => {
            const isPro = tier.popular;

            return (
              <div
                key={tier.name}
                style={{
                  background: "var(--surface-card)",
                  padding: "2rem 1.5rem",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {isPro && (
                  <span style={{
                    display: "inline-block",
                    width: "fit-content",
                    marginBottom: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: 999,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    background: "var(--ink)",
                    color: "var(--bg-canvas)",
                  }}>
                    Recommended
                  </span>
                )}

                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 650, color: "var(--ink)", letterSpacing: "-0.01em" }}>{tier.name}</h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginTop: "0.15rem" }}>{tier.description}</p>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
                    {formatPrice(tier)}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)", marginLeft: 2 }}>{formatPeriod(tier)}</span>
                  {annual && tier.price > 0 && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)", textDecoration: "line-through" }}>${tier.price}/mo</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => router.push("/signup")}
                  className={isPro ? "landing-btn-primary" : "landing-btn-secondary"}
                  style={{ width: "100%", justifyContent: "center", marginBottom: "1.5rem" }}
                >
                  {tier.cta}
                </button>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
                  {tier.features.map((feature) => (
                    <li key={feature} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                      <Check size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--ink-muted)", opacity: 0.5 }} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div style={{ maxWidth: 680, margin: "0 auto 4rem" }}>
          <div className="landing-section-header" style={{ marginBottom: "1.5rem" }}>
            <h2 className="landing-h2" style={{ fontSize: "1.75rem" }}>Questions</h2>
          </div>
          <div className="landing-faq-list">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} item={item} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--ink-muted)", paddingBottom: "2rem", opacity: 0.6 }}>
          All plans include dark mode, mobile access, and end-to-end encryption.
        </div>
      </div>
    </div>
  );
}
