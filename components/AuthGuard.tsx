"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="pro-container py-16">
        <div className="surface-glass rounded-2xl p-6 text-center muted text-sm inline-flex items-center gap-2">
          <span className="pulse-dot" />
          Checking authentication...
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
