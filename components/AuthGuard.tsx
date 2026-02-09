"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicBackdrop from "./DynamicBackdrop";

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
        <div className="surface-glass dynamic-surface rounded-2xl p-6 text-center muted text-sm inline-flex items-center gap-2 relative overflow-hidden">
          <DynamicBackdrop variant="mesh" />
          <div className="relative z-[1] inline-flex items-center gap-2">
            <span className="pulse-dot" />
            Checking authentication...
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
