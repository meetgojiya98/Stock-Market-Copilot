import type { ReactNode } from "react";
import DynamicBackdrop from "./DynamicBackdrop";
import WorkflowGuide from "./WorkflowGuide";

type PageShellProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  heroBackdrop?: "aurora" | "mesh" | "trading";
  bodyBackdrop?: "aurora" | "mesh" | "trading";
  badges?: string[];
  children: ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  eyebrow,
  heroBackdrop = "mesh",
  bodyBackdrop = "mesh",
  badges = ["Smart Tools", "Live Data"],
  children,
}: PageShellProps) {
  return (
    <div className="pro-container interior-shell py-5 sm:py-7 lg:py-8 pb-24 lg:pb-8 space-y-3 sm:space-y-4">
      <section className="mission-hero fade-up">
        <DynamicBackdrop variant={heroBackdrop} />
        <div className="relative z-[1] mission-hero-content">
          {eyebrow && <div className="mission-eyebrow">{eyebrow}</div>}

          <div className="mission-hero-grid mt-2">
            <div>
              <h1 className="text-[1.65rem] sm:text-[2.2rem] font-medium leading-tight tracking-[-0.02em] section-title max-w-4xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 muted max-w-4xl text-[0.95rem] sm:text-[1rem] leading-relaxed">{subtitle}</p>
              )}
            </div>

            <div className="mission-status-card">
              <span className="mission-status-kicker">Status</span>
              <div className="mission-status-title">Ready</div>
              <p className="mission-status-note">
                You're logged in. All tools and data are available.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
            {badges.slice(0, 4).map((badge) => (
              <span key={badge} className="mission-badge">
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-4 mission-guide-shell">
            <WorkflowGuide />
          </div>
        </div>
      </section>

      <section className="mission-body fade-up relative overflow-hidden">
        <DynamicBackdrop variant={bodyBackdrop} />
        <div className="relative z-[1]">{children}</div>
      </section>
    </div>
  );
}
