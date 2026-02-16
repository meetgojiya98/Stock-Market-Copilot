"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DividendTracker from "../../components/DividendTracker";
import DRIPSimulator from "../../components/DRIPSimulator";

export default function DividendsPage() {
  return (
    <AuthGuard>
      <PageShell title="Dividends">
        <div className="space-y-6">
          <DividendTracker />
          <DRIPSimulator />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
