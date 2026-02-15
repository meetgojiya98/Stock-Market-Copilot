"use client";
import Link from "next/link";
export default function Sidebar() {
  return (
    <aside className="w-56 p-4 flex flex-col gap-6 font-bold shadow-xl min-h-screen rounded-r-2xl border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[var(--ink)]">
      <div className="text-2xl font-extrabold mb-6">Zentrade</div>
      <nav className="flex flex-col gap-4">
        <Link href="/dashboard" className="hover:text-[var(--accent)]">Dashboard</Link>
        <Link href="/portfolio" className="hover:text-[var(--accent)]">Portfolio</Link>
        <Link href="/analytics" className="hover:text-[var(--accent)]">Analytics</Link>
      </nav>
    </aside>
  );
}
