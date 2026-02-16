"use client";
import AuthGuard from "../../components/AuthGuard";
import NotificationsPanel from "../../components/NotificationsPanel";
import PageShell from "../../components/PageShell";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Alerts"
        title="Your Alerts"
        subtitle="Stay on top of what matters. See important events, set rules, and never miss a move."
      >
        <div className="space-y-6">
          <NotificationsPanel />
          <FeatureExpansionHub module="notifications" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
