"use client";
import AuthGuard from "../../components/AuthGuard";
import AuditTimeline from "../../components/AuditTimeline";
import PageShell from "../../components/PageShell";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";
export default function AuditPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Audit"
        title="Activity & Audit Trail"
        subtitle="Full event history across portfolio actions, watchlist updates, and alert activity."
      >
        <div className="space-y-6">
          <AuditTimeline />
          <FeatureExpansionHub module="audit" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
