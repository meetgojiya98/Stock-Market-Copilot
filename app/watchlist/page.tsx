"use client";
import AuthGuard from "../../components/AuthGuard";
import WatchlistPanel from "../../components/WatchlistPanel";
import PageShell from "../../components/PageShell";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Watchlist"
        title="Watchlist & Trend Monitor"
        subtitle="Maintain focused symbols, track realtime snapshots, and keep an eye on community momentum."
      >
        <div className="space-y-6">
          <WatchlistPanel />
          <FeatureExpansionHub module="watchlist" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
