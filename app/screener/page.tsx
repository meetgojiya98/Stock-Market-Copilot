"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockScreener from "../../components/StockScreener";
import VisualScreenerBuilder from "../../components/VisualScreenerBuilder";

export default function ScreenerPage() {
  return (
    <AuthGuard>
      <PageShell title="Screener">
        <div className="space-y-6">
          <VisualScreenerBuilder />
          <StockScreener />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
