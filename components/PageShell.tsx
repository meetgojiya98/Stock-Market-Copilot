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
  heroBackdrop = "trading",
  bodyBackdrop = "trading",
  badges = ["Institutional UX", "Realtime Intelligence"],
  children,
}: PageShellProps) {
  return (
    <div className="pro-container py-8 sm:py-10 space-y-5">
      <section className="surface-glass dynamic-surface page-hero p-5 sm:p-7 fade-up">
        <DynamicBackdrop variant={heroBackdrop} />
        <div className="relative z-[1]">
          {eyebrow && (
            <div className="text-[11px] uppercase tracking-[0.18em] muted font-semibold">{eyebrow}</div>
          )}

          <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-[2rem] font-semibold leading-tight section-title max-w-4xl">{title}</h1>
            <div className="flex items-center gap-2 text-xs">
              {badges.slice(0, 3).map((badge) => (
                <span key={badge} className="badge-neutral rounded-full px-2.5 py-1">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {subtitle && <p className="mt-3 muted max-w-4xl text-sm sm:text-[0.98rem] leading-relaxed">{subtitle}</p>}
          <WorkflowGuide />
        </div>
      </section>

      <section className="surface-glass dynamic-surface rounded-2xl p-4 sm:p-6 fade-up relative overflow-hidden">
        <DynamicBackdrop variant={bodyBackdrop} />
        <div className="relative z-[1]">{children}</div>
      </section>
    </div>
  );
}
