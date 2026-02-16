"use client";
import AuthGuard from "../../components/AuthGuard";
import WatchlistPanel from "../../components/WatchlistPanel";
import PageShell from "../../components/PageShell";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Watchlist"
        title="Your Watchlist"
        subtitle="Keep an eye on stocks you care about. See live prices and spot trends early."
      >
        <div className="space-y-6">
          <WatchlistPanel />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
