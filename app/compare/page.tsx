"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockComparison from "../../components/StockComparison";

export default function ComparePage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Compare"
        title="Compare Stocks"
        subtitle="Pick stocks and see them side by side to help you decide."
        badges={["Side by Side", "Quick Insights"]}
      >
        <StockComparison />
      </PageShell>
    </AuthGuard>
  );
}
