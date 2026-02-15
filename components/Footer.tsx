"use client";

import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;

  return (
    <footer className="mt-12 pb-4 sm:pb-6">
      <div className="pro-container">
        <div className="footer-shell">
          <div className="flex items-center gap-3">
            <BrandLogo withWordmark showTagline size={28} className="opacity-95" />
            <span className="hidden sm:inline footer-divider" />
            <span className="hidden sm:inline muted">Ideas, analysis, and execution in one calm workspace</span>
          </div>
          <span className="muted text-xs sm:text-sm">{year} Zentrade · Studio Edition</span>
        </div>
      </div>
    </footer>
  );
}
