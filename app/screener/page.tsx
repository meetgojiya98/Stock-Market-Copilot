"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockScreener from "../../components/StockScreener";

export default function ScreenerPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Screener"
        title="Stock Screener"
        subtitle="Filter stocks by price, sector, and more to find your next idea."
        badges={["Smart Filters", "Find Ideas"]}
      >
        <StockScreener />
      </PageShell>
    </AuthGuard>
  );
}
