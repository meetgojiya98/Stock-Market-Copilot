"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import PortfolioHeatmap from "../../components/PortfolioHeatmap";

export default function HeatmapPage() {
  return (
    <AuthGuard>
      <PageShell title="Heatmap">
        <PortfolioHeatmap />
      </PageShell>
    </AuthGuard>
  );
}
