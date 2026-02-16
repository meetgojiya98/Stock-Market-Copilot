"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import WhatIfSimulator from "../../components/WhatIfSimulator";

export default function SimulatorPage() {
  return (
    <AuthGuard>
      <PageShell title="Simulator">
        <WhatIfSimulator />
      </PageShell>
    </AuthGuard>
  );
}
