"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DashboardBuilder from "../../components/DashboardBuilder";
import CustomDashboard from "../../components/CustomDashboard";
import DashboardGridLayout from "../../components/DashboardGridLayout";
import VirtualDataTable from "../../components/VirtualDataTable";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageShell title="Dashboard">
        <div className="space-y-6">
          <DashboardGridLayout />
          <DashboardBuilder />
          <CustomDashboard />
          <VirtualDataTable />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
