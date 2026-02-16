"use client";
import AuthGuard from "../../components/AuthGuard";
import NotificationsPanel from "../../components/NotificationsPanel";
import PageShell from "../../components/PageShell";
import PriceAlerts from "../../components/PriceAlerts";
import WatchlistMovers from "../../components/WatchlistMovers";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <PageShell title="Alerts">
        <div className="space-y-6">
          <NotificationsPanel />
          <PriceAlerts />
          <WatchlistMovers />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
