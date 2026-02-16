"use client";
import AuthGuard from "../../components/AuthGuard";
import AlertBuilder from "../../components/AlertBuilder";
import NotificationsPanel from "../../components/NotificationsPanel";
import PageShell from "../../components/PageShell";
import PriceAlerts from "../../components/PriceAlerts";
import WatchlistMovers from "../../components/WatchlistMovers";
import { VoiceSearchButton } from "../../components/VoiceCommand";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <PageShell title="Alerts">
        <div className="space-y-6">
          <VoiceSearchButton />
          <NotificationsPanel />
          <PriceAlerts />
          <AlertBuilder />
          <WatchlistMovers />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
