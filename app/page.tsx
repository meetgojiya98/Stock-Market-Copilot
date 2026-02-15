import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BellPlus,
  Bot,
  BriefcaseBusiness,
  ShieldCheck,
  Target,
} from "lucide-react";

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

export default function LandingPage() {
  return (
    <div className="landing-root">
      <section className="landing-hero">
        <div className="landing-shell">
          <header className="landing-nav">
            <Link href="/" className="landing-brand" aria-label="Stock Market Copilot home">
              Stock Market Copilot
            </Link>

            <div className="landing-nav-actions">
              <Link href="/login" className="landing-login-link">
                Log in
              </Link>
              <Link href="/signup" className="landing-signup-link">
                Sign up
              </Link>
            </div>
          </header>

          <div className="landing-hero-grid">
            <div className="landing-copy">
              <p className="landing-eyebrow">Single account for your full market stack</p>
              <h1 className="landing-title">One app for all your market moves.</h1>
              <p className="landing-subtitle">
                Sign up once, then unlock portfolio tracking, watchlists, analytics, research copilots,
                execution planning, and alerts.
              </p>

              <div className="landing-cta-row">
                <Link href="/signup" className="landing-primary-cta">
                  Create account
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/login" className="landing-secondary-cta">
                  I already have an account
                </Link>
              </div>

              <p className="landing-auth-note">
                All tools are locked behind authentication. Log in or sign up to continue.
              </p>
            </div>

            <div className="landing-discs" aria-hidden="true">
              <span className="landing-disc landing-disc-1" />
              <span className="landing-disc landing-disc-2" />
              <span className="landing-disc landing-disc-3" />
              <span className="landing-disc landing-disc-4" />
              <span className="landing-disc landing-disc-5" />
              <span className="landing-disc landing-disc-6" />
              <span className="landing-disc landing-disc-7" />
              <span className="landing-disc landing-disc-8" />
            </div>
          </div>
        </div>

        <nav className="landing-floating-nav" aria-label="Tool categories">
          {FLOAT_LINKS.map((label) => (
            <Link key={label} href="/login" className="landing-floating-link">
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="landing-statement-strip">
        <div className="landing-shell">
          <h2 className="landing-statement">Unify your trading flow.</h2>
        </div>
      </section>

      <section className="landing-tool-strip">
        <div className="landing-shell">
          <div className="landing-tool-grid">
            {TOOL_TEASERS.map(({ title, description, icon: Icon }) => (
              <article key={title} className="landing-tool-card">
                <div className="landing-tool-icon">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link href="/login" className="landing-tool-link">
                  Log in to use
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
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
      </section>

      <Link href="/login" className="landing-support-link">
        Support
      </Link>
    </div>
  );
}
