"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import TradeJournal from "../../components/TradeJournal";

export default function JournalPage() {
  return (
    <AuthGuard>
      <PageShell title="Journal">
        <TradeJournal />
      </PageShell>
    </AuthGuard>
  );
}
