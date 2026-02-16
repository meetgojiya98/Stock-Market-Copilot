"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ExecutionHub from "../../components/ExecutionHub";
import OrderTemplateBuilder from "../../components/OrderTemplateBuilder";
import OrderBookDepth from "../../components/OrderBookDepth";
import InteractiveCandlestickChart from "../../components/InteractiveCandlestickChart";

export default function ExecutionPage() {
  return (
    <AuthGuard>
      <PageShell title="Execution">
        <div className="space-y-6">
          <InteractiveCandlestickChart />
          <OrderBookDepth />
          <ExecutionHub />
          <OrderTemplateBuilder />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
