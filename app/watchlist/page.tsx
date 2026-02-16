"use client";
import AuthGuard from "../../components/AuthGuard";
import WatchlistPanel from "../../components/WatchlistPanel";
import PopoutPanel from "../../components/PopoutPanel";
import PageShell from "../../components/PageShell";
import FloatingActionButton from "../../components/FloatingActionButton";
import { Plus, RefreshCw } from "lucide-react";
import ScrollSnapGallery from "../../components/ScrollSnapGallery";

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <PageShell title="Watchlist">
        <div className="space-y-6">
          <PopoutPanel title="Watchlist" channelName="watchlist">
            <WatchlistPanel />
          </PopoutPanel>
          <ScrollSnapGallery ariaLabel="Watchlist highlights">
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Most Active</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>High volume symbols</p></div>
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Biggest Movers</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Top % changes today</p></div>
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Alerts Triggered</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Recent price alerts</p></div>
          </ScrollSnapGallery>
        </div>
      </PageShell>
      <FloatingActionButton
        actions={[
          { icon: <Plus size={16} />, label: "Add Symbol", onClick: () => { const input = document.querySelector<HTMLInputElement>('input[placeholder="Add symbol"]'); input?.focus(); } },
          { icon: <RefreshCw size={16} />, label: "Refresh", onClick: () => { window.location.reload(); } },
        ]}
      />
    </AuthGuard>
  );
}
