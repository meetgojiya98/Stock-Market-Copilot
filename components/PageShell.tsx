import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  children,
}: PageShellProps) {
  return (
    <div className="pro-container py-4 sm:py-5 lg:py-6 pb-24 lg:pb-8 space-y-3 sm:space-y-4">
      <header className="fade-up">
        <h1 className="text-[1.1rem] sm:text-[1.25rem] font-semibold leading-tight tracking-[-0.015em]" style={{ color: "var(--ink)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[0.8rem] sm:text-[0.84rem] max-w-2xl" style={{ color: "var(--ink-muted)" }}>
            {subtitle}
          </p>
        )}
      </header>
      <section className="fade-up">{children}</section>
    </div>
  );
}
