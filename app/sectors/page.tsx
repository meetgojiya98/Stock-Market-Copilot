"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import SectorPerformance from "../../components/SectorPerformance";

export default function SectorsPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Sectors"
        title="Sector Performance"
        subtitle="See which parts of the market are hot and which are not."
        badges={["Market Sectors", "Trend Spotting"]}
      >
        <SectorPerformance />
      </PageShell>
    </AuthGuard>
  );
}
