"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DynamicBackdrop from "../../components/DynamicBackdrop";
import { clearAuthSession } from "../../lib/auth-client";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    clearAuthSession();
    router.replace("/login");
  }, [router]);
  return (
    <div className="pro-container py-12">
      <div className="surface-glass rounded-2xl p-6 text-center muted relative overflow-hidden">
        <DynamicBackdrop variant="aurora" />
        <div className="relative z-[1]">Logging out...</div>
      </div>
    </div>
  );
}
