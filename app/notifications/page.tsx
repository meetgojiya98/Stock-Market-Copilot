"use client";
import AuthGuard from "../../components/AuthGuard";
import NotificationsPanel from "../../components/NotificationsPanel";
import PageShell from "../../components/PageShell";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Alerts"
        title="Notification Stream"
        subtitle="Real-time portfolio and market alerts delivered through API and websocket channels."
      >
        <NotificationsPanel />
      </PageShell>
    </AuthGuard>
  );
}
