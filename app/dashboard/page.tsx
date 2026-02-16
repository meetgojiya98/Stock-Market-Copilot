"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DashboardBuilder from "../../components/DashboardBuilder";
import CustomDashboard from "../../components/CustomDashboard";
import DashboardGridLayout from "../../components/DashboardGridLayout";
import VirtualDataTable from "../../components/VirtualDataTable";
import { SortableList } from "../../components/DragDropKit";
import ScrollSnapGallery from "../../components/ScrollSnapGallery";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageShell title="Dashboard">
        <div className="space-y-6">
          <DashboardGridLayout />
          <DashboardBuilder />
          <CustomDashboard />
          <VirtualDataTable />
          <ScrollSnapGallery ariaLabel="Dashboard highlights">
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Market Overview</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Key indices at a glance</p></div>
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Top Movers</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Biggest gainers &amp; losers</p></div>
            <div className="surface-glass p-4 rounded-xl min-w-[260px]"><h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Earnings Today</h3><p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Upcoming reports</p></div>
          </ScrollSnapGallery>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
