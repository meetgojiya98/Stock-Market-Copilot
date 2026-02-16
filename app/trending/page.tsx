"use client";
import AuthGuard from "../../components/AuthGuard";
import TrendingStocks from "../../components/TrendingStocks";
import PageShell from "../../components/PageShell";
export default function TrendingPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Trending"
        title="What's Popular"
        subtitle="See which stocks other users are watching and holding the most right now."
      >
        <div className="space-y-6">
          <TrendingStocks />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
