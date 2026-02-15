"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (!session)
    return (
      <button
        className="px-3 py-1 rounded border border-[var(--surface-border)] bg-[var(--surface-emphasis)] text-[var(--ink)]"
        onClick={() => signIn()}
      >
        Sign in
      </button>
    );
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--ink)]">{session.user?.name || "User"}</span>
      <button
        className="px-3 py-1 rounded bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white"
        onClick={() => signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
