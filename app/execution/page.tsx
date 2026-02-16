"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ExecutionHub from "../../components/ExecutionHub";

export default function ExecutionPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Execution"
        title="Practice & Test Trades"
        subtitle="Paper trade, backtest strategies, check risk, and build your playbook before going live."
      >
        <div className="space-y-6">
          <ExecutionHub />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
