"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Topbar() {
  const { data: session } = useSession();
  return (
    <header className="w-full px-8 py-3 flex items-center justify-between rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[var(--ink)] font-bold shadow">
      <span className="text-lg">Zentrade</span>
      <div>
        {session ? (
          <button
            onClick={() => signOut()}
            className="px-4 py-1 rounded bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={() => signIn()}
            className="px-4 py-1 rounded border border-[var(--surface-border)] bg-[var(--surface-emphasis)] text-[var(--ink)]"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
