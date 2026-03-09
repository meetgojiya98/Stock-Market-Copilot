"use client";

import { useEffect, useState, type ReactNode } from "react";
type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
}: PageShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`pro-container py-4 sm:py-5 lg:py-6 space-y-4 transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      <header className="page-shell-header">
        <div>
          <h1 className="text-[1.35rem] sm:text-[1.6rem] font-bold leading-tight tracking-[-0.03em]" style={{ color: "var(--ink)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[0.82rem] sm:text-[0.88rem] max-w-2xl leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="page-shell-actions">{actions}</div>}
      </header>
      <div className="page-shell-divider" />
      <section>{children}</section>
    </div>
  );
}
