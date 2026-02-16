"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ProfileCommandCenter from "../../components/ProfileCommandCenter";
import TwoFactorSetup from "../../components/TwoFactorSetup";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <PageShell title="Profile">
        <div className="space-y-6">
          <ProfileCommandCenter />
          <TwoFactorSetup />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
