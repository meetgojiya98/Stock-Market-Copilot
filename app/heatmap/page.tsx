"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import PortfolioHeatmap from "../../components/PortfolioHeatmap";

export default function HeatmapPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Heatmap"
        title="Portfolio Heatmap"
        subtitle="See your portfolio as a visual map — bigger blocks mean bigger positions."
        badges={["Visual View", "At a Glance"]}
      >
        <PortfolioHeatmap />
      </PageShell>
    </AuthGuard>
  );
}
