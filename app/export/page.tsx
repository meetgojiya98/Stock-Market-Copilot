"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DataExport from "../../components/DataExport";

export default function ExportPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Export"
        title="Export Your Data"
        subtitle="Download your portfolio, watchlist, journal, and more as files you can keep."
        badges={["CSV & JSON", "Your Data"]}
      >
        <DataExport />
      </PageShell>
    </AuthGuard>
  );
}
