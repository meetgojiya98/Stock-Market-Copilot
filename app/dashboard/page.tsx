"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DashboardBuilder from "../../components/DashboardBuilder";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Dashboard"
        title="Your Dashboard"
        subtitle="Build your own home screen with the widgets you care about most."
        badges={["Customizable", "Your Way"]}
      >
        <DashboardBuilder />
      </PageShell>
    </AuthGuard>
  );
}
