"use client";
import AuthGuard from "../../components/AuthGuard";
import WatchlistPanel from "../../components/WatchlistPanel";
import PageShell from "../../components/PageShell";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Watchlist"
        title="Watchlist & Trend Monitor"
        subtitle="Maintain focused symbols, track realtime snapshots, and keep an eye on community momentum."
      >
        <WatchlistPanel />
      </PageShell>
    </AuthGuard>
  );
}
