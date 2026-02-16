"use client";
import AuthGuard from "../../components/AuthGuard";
import AuditTimeline from "../../components/AuditTimeline";
import PageShell from "../../components/PageShell";
export default function AuditPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="History"
        title="Activity Log"
        subtitle="See everything you've done: portfolio changes, watchlist updates, and alert activity."
      >
        <div className="space-y-6">
          <AuditTimeline />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
