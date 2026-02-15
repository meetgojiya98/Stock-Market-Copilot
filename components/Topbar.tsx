"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Topbar() {
  const { data: session } = useSession();
  return (
    <header className="w-full px-8 py-3 flex items-center justify-between bg-saffron text-white font-bold shadow">
      <span className="text-lg">Zentrade</span>
      <div>
        {session ? (
          <button onClick={() => signOut()} className="px-4 py-1 bg-navy text-white rounded">Sign out</button>
        ) : (
          <button onClick={() => signIn()} className="px-4 py-1 bg-white text-saffron rounded">Sign in</button>
        )}
      </div>
    </header>
  );
}
