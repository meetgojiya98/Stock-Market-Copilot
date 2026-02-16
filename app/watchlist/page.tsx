"use client";
import AuthGuard from "../../components/AuthGuard";
import WatchlistPanel from "../../components/WatchlistPanel";
import PageShell from "../../components/PageShell";
import FloatingActionButton from "../../components/FloatingActionButton";
import { Plus, RefreshCw } from "lucide-react";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell title="Watchlist">
        <div className="space-y-6">
          <WatchlistPanel />
        </div>
        <FloatingActionButton
          actions={[
            { icon: <Plus size={16} />, label: "Add Symbol", onClick: () => { const input = document.querySelector<HTMLInputElement>('input[placeholder="Add symbol"]'); input?.focus(); } },
            { icon: <RefreshCw size={16} />, label: "Refresh", onClick: () => { window.location.reload(); } },
          ]}
        />
      </PageShell>
    </AuthGuard>
  );
}
