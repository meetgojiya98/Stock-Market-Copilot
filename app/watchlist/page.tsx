"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import WatchlistTable from "../../components/watchlist/WatchlistTable";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell title="Watchlist" subtitle="Track your favorite stocks with live prices and AI analysis">
        <WatchlistTable />
      </PageShell>
    </AuthGuard>
  );
}
