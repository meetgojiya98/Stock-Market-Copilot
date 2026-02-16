"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockComparison from "../../components/StockComparison";
import CompetitorAnalysis from "../../components/CompetitorAnalysis";
import { CrosshairSyncProvider, SyncedMiniChart } from "../../components/CrosshairSync";

export default function ComparePage() {
  return (
    <AuthGuard>
      <PageShell title="Compare">
        <div className="space-y-6">
          <CrosshairSyncProvider>
          <StockComparison />
          <CompetitorAnalysis />
          <SyncedMiniChart id="compare-spy" symbol="SPY" />
          <SyncedMiniChart id="compare-qqq" symbol="QQQ" />
          </CrosshairSyncProvider>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
