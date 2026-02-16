"use client";
import AuthGuard from "../../components/AuthGuard";
import { useEffect, useState } from "react";
import AdvancedAnalyticsPanel from "../../components/AdvancedAnalyticsPanel";
import CorrelationMatrix from "../../components/CorrelationMatrix";
import TechnicalIndicators from "../../components/TechnicalIndicators";
import RiskParityOptimizer from "../../components/RiskParityOptimizer";
import StockDNAFingerprint from "../../components/StockDNAFingerprint";
import PageShell from "../../components/PageShell";
import { fetchPortfolioData } from "../../lib/data-client";

export default function AnalyticsPage() {
  const [portfolio, setPortfolio] = useState([]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const token = localStorage.getItem("access_token");
      const result = await fetchPortfolioData(token || undefined);
      setPortfolio(result.data as never[]);
    };
    fetchPortfolio();
  }, []);

  return (
    <AuthGuard>
      <PageShell title="Analytics">
        <div className="space-y-6">
          <AdvancedAnalyticsPanel portfolio={portfolio} />
          <TechnicalIndicators />
          <StockDNAFingerprint />
          <RiskParityOptimizer />
          <CorrelationMatrix />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
