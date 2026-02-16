"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import PortfolioHeatmap from "../../components/PortfolioHeatmap";
import { ChartToolbar } from "../../components/ChartToolkit";

export default function HeatmapPage() {
  return (
    <AuthGuard>
      <PageShell title="Heatmap">
        <div className="space-y-6">
          <ChartToolbar />
          <PortfolioHeatmap />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
