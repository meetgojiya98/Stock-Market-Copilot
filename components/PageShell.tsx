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
  badges = ["Realtime Intelligence", "Cross-Market Coverage"],
  children,
}: PageShellProps) {
  return (
    <div className="pro-container py-6 sm:py-8 space-y-4">
      <section className="mission-hero fade-up">
        <DynamicBackdrop variant={heroBackdrop} />
        <div className="relative z-[1] mission-hero-content">
          {eyebrow && (
            <div className="mission-eyebrow">{eyebrow}</div>
          )}

          <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-[1.6rem] sm:text-[2.15rem] font-semibold leading-tight section-title max-w-4xl">
              {title}
            </h1>
            <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
              {badges.slice(0, 3).map((badge) => (
                <span key={badge} className="mission-badge">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {subtitle && (
            <p className="mt-3 muted max-w-4xl text-sm sm:text-[0.98rem] leading-relaxed">{subtitle}</p>
          )}
          <div className="mt-4">
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
