"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockScreener from "../../components/StockScreener";

export default function ScreenerPage() {
  return (
    <AuthGuard>
      <PageShell title="Screener">
        <StockScreener />
      </PageShell>
    </AuthGuard>
  );
}
