"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DividendTracker from "../../components/DividendTracker";

export default function DividendsPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Dividends"
        title="Dividend Tracker"
        subtitle="See how much dividend income your stocks are earning you."
        badges={["Income Tracking", "Dividend Calendar"]}
      >
        <DividendTracker />
      </PageShell>
    </AuthGuard>
  );
}
