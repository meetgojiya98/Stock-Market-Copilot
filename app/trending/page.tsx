"use client";
import AuthGuard from "../../components/AuthGuard";
import TrendingStocks from "../../components/TrendingStocks";
import PageShell from "../../components/PageShell";
export default function TrendingPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Trends"
        title="Community Trendboard"
        subtitle="Discover the most watched and most owned symbols from aggregated user activity."
      >
        <TrendingStocks />
      </PageShell>
    </AuthGuard>
  );
}
