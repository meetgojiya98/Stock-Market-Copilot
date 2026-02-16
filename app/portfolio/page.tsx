"use client";
import AuthGuard from "../../components/AuthGuard";
import { useEffect, useState } from "react";
import PortfolioTable from "../../components/PortfolioTable";
import AdvancedAnalyticsPanel from "../../components/AdvancedAnalyticsPanel";
import PageShell from "../../components/PageShell";
import MultiPortfolio from "../../components/MultiPortfolio";
import AIPortfolioReview from "../../components/AIPortfolioReview";
import PortfolioImporter from "../../components/PortfolioImporter";
import PerformanceAttribution from "../../components/PerformanceAttribution";
import TaxHarvestingPanel from "../../components/TaxHarvestingPanel";
import SunburstAllocation from "../../components/SunburstAllocation";
import PortfolioTimeline from "../../components/PortfolioTimeline";
import RebalancingEngine from "../../components/RebalancingEngine";
import CurrencyConverter from "../../components/CurrencyConverter";
import FloatingActionButton from "../../components/FloatingActionButton";
import { Plus, RefreshCw, Download } from "lucide-react";
import { fetchPortfolioData } from "../../lib/data-client";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);
  const fetchPortfolio = async () => {
    const token = localStorage.getItem("access_token");
    const result = await fetchPortfolioData(token || undefined);
    setPortfolio(result.data as never[]);
  };
  useEffect(() => { fetchPortfolio(); }, []);
  return (
    <AuthGuard>
      <PageShell
        title="Portfolio"
        subtitle="Positions, performance, and risk at a glance."
      >
        <div className="space-y-6">
          <PortfolioImporter onImported={fetchPortfolio} />
          <PortfolioTable onPortfolioChange={fetchPortfolio} />
          <PerformanceAttribution />
          <AdvancedAnalyticsPanel portfolio={portfolio} />
          <TaxHarvestingPanel />
          <SunburstAllocation />
          <RebalancingEngine />
          <CurrencyConverter />
          <MultiPortfolio />
          <AIPortfolioReview />
          <PortfolioTimeline />
        </div>
        <FloatingActionButton
          actions={[
            { icon: <Plus size={16} />, label: "Add Position", onClick: () => { const input = document.querySelector<HTMLInputElement>('input[placeholder="Add symbol"]'); input?.focus(); } },
            { icon: <RefreshCw size={16} />, label: "Refresh Prices", onClick: () => { window.location.reload(); } },
            { icon: <Download size={16} />, label: "Export CSV", onClick: () => { /* trigger export */ } },
          ]}
        />
      </PageShell>
    </AuthGuard>
  );
}
