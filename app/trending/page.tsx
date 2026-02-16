"use client";
import AuthGuard from "../../components/AuthGuard";
import TrendingStocks from "../../components/TrendingStocks";
import InsiderActivity from "../../components/InsiderActivity";
import PageShell from "../../components/PageShell";
export default function TrendingPage() {
  return (
    <AuthGuard>
      <PageShell title="Trending">
        <div className="space-y-6">
          <TrendingStocks />
          <InsiderActivity />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
