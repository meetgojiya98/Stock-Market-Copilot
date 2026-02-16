"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import TradeJournal from "../../components/TradeJournal";

export default function JournalPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Journal"
        title="Trade Journal"
        subtitle="Write down why you made each trade and learn from your decisions over time."
        badges={["Self-Review", "Learn & Grow"]}
      >
        <TradeJournal />
      </PageShell>
    </AuthGuard>
  );
}
