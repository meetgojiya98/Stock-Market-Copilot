"use client";
import AuthGuard from "../../components/AuthGuard";
import TrendingStocks from "../../components/TrendingStocks";
import InsiderActivity from "../../components/InsiderActivity";
import PageShell from "../../components/PageShell";
import ScrollSnapGallery from "../../components/ScrollSnapGallery";
export default function TrendingPage() {
  return (
    <AuthGuard>
      <PageShell title="Trending">
        <div className="space-y-6">
          <TrendingStocks />
          <InsiderActivity />
          <ScrollSnapGallery ariaLabel="Trending highlights">
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Social Buzz</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Most mentioned online</p></div>
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Volume Spikes</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Unusual activity</p></div>
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Sector Rotation</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Where money is flowing</p></div>
          </ScrollSnapGallery>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
