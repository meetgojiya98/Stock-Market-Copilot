"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/learn")) return null;

  return (
    <footer className="mt-12 pb-4 sm:pb-6">
      <div className="pro-container">
        <div className="footer-shell">
          <div className="flex items-center gap-3">
            <BrandLogo withWordmark showTagline size={28} className="opacity-95" />
            <span className="hidden sm:inline footer-divider" />
            <span className="hidden sm:inline text-xs font-medium" style={{ color: "var(--ink-muted)" }}>Professional trading toolkit</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/learn" className="text-xs font-medium transition-colors hover:text-[var(--accent)]" style={{ color: "var(--ink-muted)" }}>Learn</Link>
            <Link href="/glossary" className="text-xs font-medium transition-colors hover:text-[var(--accent)]" style={{ color: "var(--ink-muted)" }}>Glossary</Link>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>&copy; {year} Zentrade</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
