"use client";
import AuthGuard from "../../components/AuthGuard";
import TrendingStocks from "../../components/TrendingStocks";
import PageShell from "../../components/PageShell";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";
export default function TrendingPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Trends"
        title="Community Trendboard"
        subtitle="Discover the most watched and most owned symbols from aggregated user activity."
      >
        <div className="space-y-6">
          <TrendingStocks />
          <FeatureExpansionHub module="trending" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
