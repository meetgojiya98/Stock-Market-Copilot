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
        title="Your Profile"
        subtitle="Manage your account, set your preferences, and customize how Zentrade works for you."
      >
        <div className="space-y-6">
          <ProfileCommandCenter />
          <FeatureExpansionHub module="profile" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
