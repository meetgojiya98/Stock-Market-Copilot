"use client";

import { useEffect, useState, type ReactNode } from "react";
import Breadcrumbs from "./Breadcrumbs";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`pro-container py-4 sm:py-5 lg:py-6 pb-24 lg:pb-8 space-y-3 sm:space-y-4 transition-all duration-300 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
      <header className="fade-up">
        <Breadcrumbs className="mb-1" />
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
