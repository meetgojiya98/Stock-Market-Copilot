"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import WhatIfSimulator from "../../components/WhatIfSimulator";

export default function SimulatorPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Simulator"
        title="What-If Simulator"
        subtitle="Test how buying or selling a stock would change your portfolio."
        badges={["Risk-Free", "Instant Preview"]}
      >
        <WhatIfSimulator />
      </PageShell>
    </AuthGuard>
  );
}
