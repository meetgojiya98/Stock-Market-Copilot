"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import StockScreener from "../../components/StockScreener";
import VisualScreenerBuilder from "../../components/VisualScreenerBuilder";
import { DensityToggle } from "../../components/TableEnhancements";
import { AdvancedToggle } from "../../components/ProgressiveDisclosure";

export default function ScreenerPage() {
  return (
    <AuthGuard>
      <PageShell title="Screener">
        <div className="space-y-6">
          <DensityToggle />
          <AdvancedToggle label="Advanced Filters" basic={<VisualScreenerBuilder />} advanced={<StockScreener />} />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
