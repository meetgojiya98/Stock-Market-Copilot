"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ProfileCommandCenter from "../../components/ProfileCommandCenter";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Account"
        title="Profile & Identity"
        subtitle="Run your identity, risk posture, and personalization stack from a single operator console."
      >
        <ProfileCommandCenter />
      </PageShell>
    </AuthGuard>
  );
}
