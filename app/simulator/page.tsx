"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import WhatIfSimulator from "../../components/WhatIfSimulator";
import ScenarioAnalyzer from "../../components/ScenarioAnalyzer";
import HistoricalBacktest from "../../components/HistoricalBacktest";

export default function SimulatorPage() {
  return (
    <AuthGuard>
      <PageShell title="Simulator">
        <div className="space-y-6">
          <WhatIfSimulator />
          <ScenarioAnalyzer />
          <HistoricalBacktest />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
