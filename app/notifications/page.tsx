"use client";
import AuthGuard from "../../components/AuthGuard";
import NotificationsPanel from "../../components/NotificationsPanel";
import PageShell from "../../components/PageShell";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Alert Ops"
        title="Alert Operations Center"
        subtitle="Triage critical events, run alert-rule automation, and escalate risk with live stream + workflow controls."
      >
        <NotificationsPanel />
      </PageShell>
    </AuthGuard>
  );
}
