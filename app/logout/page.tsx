"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession } from "../../lib/auth-client";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    clearAuthSession();
    router.replace("/login");
  }, [router]);
  return (
    <div className="pro-container py-12">
      <div className="surface-glass rounded-2xl p-6 text-center muted">Logging out...</div>
    </div>
  );
}
