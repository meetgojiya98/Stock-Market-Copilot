"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DividendTracker from "../../components/DividendTracker";

export default function DividendsPage() {
  return (
    <AuthGuard>
      <PageShell title="Dividends">
        <DividendTracker />
      </PageShell>
    </AuthGuard>
  );
}
