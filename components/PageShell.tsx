import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  badges?: string[];
  children: ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  eyebrow,
  badges = [],
  children,
}: PageShellProps) {
  return (
    <div className="pro-container py-5 sm:py-7 lg:py-8 pb-24 lg:pb-8 space-y-4 sm:space-y-5">
      <header className="fade-up">
        {eyebrow && (
          <div className="mission-eyebrow mb-2">{eyebrow}</div>
        )}
        <h1 className="text-[1.55rem] sm:text-[2rem] font-semibold leading-tight tracking-[-0.025em] section-title">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 muted max-w-3xl text-[0.9rem] sm:text-[0.95rem] leading-relaxed">
            {subtitle}
          </p>
        )}
        {badges.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs flex-wrap">
            {badges.slice(0, 4).map((badge) => (
              <span key={badge} className="mission-badge">{badge}</span>
            ))}
          </div>
        )}
      </header>

      <section className="fade-up">{children}</section>
    </div>
  );
}
