"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import HeatmapGrid from "../../components/heatmap/HeatmapGrid";

export default function HeatmapPage() {
  return (
    <AuthGuard>
      <PageShell title="Market Heatmap" subtitle="Visual sector performance across major stocks">
        <HeatmapGrid />
      </PageShell>
    </AuthGuard>
  );
}
