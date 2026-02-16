"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DashboardBuilder from "../../components/DashboardBuilder";
import CustomDashboard from "../../components/CustomDashboard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageShell title="Dashboard">
        <div className="space-y-6">
          <DashboardBuilder />
          <CustomDashboard />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
