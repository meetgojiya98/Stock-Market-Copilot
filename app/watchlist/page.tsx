"use client";
import AuthGuard from "../../components/AuthGuard";
import WatchlistPanel from "../../components/WatchlistPanel";
import PageShell from "../../components/PageShell";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell title="Watchlist">
        <div className="space-y-6">
          <WatchlistPanel />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
