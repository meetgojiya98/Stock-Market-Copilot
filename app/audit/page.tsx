"use client";
import AuthGuard from "../../components/AuthGuard";
import AuditTimeline from "../../components/AuditTimeline";
import PageShell from "../../components/PageShell";
export default function AuditPage() {
  return (
    <AuthGuard>
      <PageShell title="Activity">
        <div className="space-y-6">
          <AuditTimeline />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
