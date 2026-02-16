"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DataExport from "../../components/DataExport";
import TaxLossReport from "../../components/TaxLossReport";

export default function ExportPage() {
  return (
    <AuthGuard>
      <PageShell title="Export">
        <div className="space-y-6">
          <DataExport />
          <TaxLossReport />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
