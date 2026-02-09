"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ExecutionHub from "../../components/ExecutionHub";

export default function ExecutionPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Execution Hub"
        title="Trader OS: Execution, Backtesting, Risk, and Automation"
        subtitle="Run paper trades, validate strategies, track risk attribution, version AI theses, configure rule-based automation, connect broker profiles, and collaborate from one command surface."
      >
        <ExecutionHub />
      </PageShell>
    </AuthGuard>
  );
}
