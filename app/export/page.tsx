"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DataExport from "../../components/DataExport";

export default function ExportPage() {
  return (
    <AuthGuard>
      <PageShell title="Export">
        <DataExport />
      </PageShell>
    </AuthGuard>
  );
}
