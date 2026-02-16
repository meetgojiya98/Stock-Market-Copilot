"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DashboardBuilder from "../../components/DashboardBuilder";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageShell title="Dashboard">
        <DashboardBuilder />
      </PageShell>
    </AuthGuard>
  );
}
