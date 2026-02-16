"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ExecutionHub from "../../components/ExecutionHub";
import OrderTemplateBuilder from "../../components/OrderTemplateBuilder";
import OrderBookDepth from "../../components/OrderBookDepth";
import InteractiveCandlestickChart from "../../components/InteractiveCandlestickChart";
import { ChartToolbar } from "../../components/ChartToolkit";
import PatternRecognition from "../../components/PatternRecognition";
import { CrosshairSyncProvider, SyncedMiniChart } from "../../components/CrosshairSync";

export default function ExecutionPage() {
  return (
    <AuthGuard>
      <PageShell title="Execution">
        <div className="space-y-6">
          <CrosshairSyncProvider>
          <ChartToolbar />
          <InteractiveCandlestickChart />
          <OrderBookDepth />
          <PatternRecognition />
          <SyncedMiniChart id="exec-spy" symbol="SPY" />
          <SyncedMiniChart id="exec-qqq" symbol="QQQ" />
          <ExecutionHub />
          <OrderTemplateBuilder />
          </CrosshairSyncProvider>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
