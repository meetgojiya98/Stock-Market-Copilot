"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ExecutionHub from "../../components/ExecutionHub";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";

export default function ExecutionPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Execution Hub"
        title="Trader OS: Execution, Backtesting, Risk, and Automation"
        subtitle="Run paper trades, validate strategies, track risk attribution, version AI theses, configure rule-based automation, connect broker profiles, and collaborate from one command surface."
      >
        <div className="space-y-6">
          <ExecutionHub />
          <FeatureExpansionHub module="execution" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
