"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ExecutionHub from "../../components/ExecutionHub";

export default function ExecutionPage() {
  return (
    <AuthGuard>
      <PageShell title="Execution">
        <div className="space-y-6">
          <ExecutionHub />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
