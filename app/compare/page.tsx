"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockComparison from "../../components/StockComparison";

export default function ComparePage() {
  return (
    <AuthGuard>
      <PageShell title="Compare">
        <StockComparison />
      </PageShell>
    </AuthGuard>
  );
}
