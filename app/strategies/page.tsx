"use client";
import PageShell from "../../components/PageShell";
import StrategyLibrary from "../../components/StrategyLibrary";

export default function StrategiesPage() {
  return (
    <PageShell
      eyebrow="Learn"
      title="Strategy Library"
      subtitle="Explore proven trading strategies and find one that fits your style."
      badges={["8 Strategies", "All Levels"]}
    >
      <StrategyLibrary />
    </PageShell>
  );
}
