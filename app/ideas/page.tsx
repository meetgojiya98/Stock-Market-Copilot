"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import AITradeIdeas from "../../components/AITradeIdeas";
import TradeSignals from "../../components/TradeSignals";

export default function IdeasPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Ideas"
        subtitle="AI-suggested trades based on your portfolio."
      >
        <div className="space-y-6">
          <TradeSignals />
          <AITradeIdeas />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
