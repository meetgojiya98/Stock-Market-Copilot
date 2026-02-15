"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ProfileCommandCenter from "../../components/ProfileCommandCenter";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Account"
        title="Profile & Identity"
        subtitle="Run your identity, risk posture, and personalization stack from a single operator console."
      >
        <div className="space-y-6">
          <ProfileCommandCenter />
          <FeatureExpansionHub module="profile" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
