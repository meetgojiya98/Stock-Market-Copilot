"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockComparison from "../../components/StockComparison";
import CompetitorAnalysis from "../../components/CompetitorAnalysis";

export default function ComparePage() {
  return (
    <AuthGuard>
      <PageShell title="Compare">
        <div className="space-y-6">
          <StockComparison />
          <CompetitorAnalysis />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
