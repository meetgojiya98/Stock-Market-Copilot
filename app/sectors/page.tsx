"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import SectorPerformance from "../../components/SectorPerformance";

export default function SectorsPage() {
  return (
    <AuthGuard>
      <PageShell title="Sectors">
        <SectorPerformance />
      </PageShell>
    </AuthGuard>
  );
}
