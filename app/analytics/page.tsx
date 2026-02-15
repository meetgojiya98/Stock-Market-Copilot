"use client";
import AuthGuard from "../../components/AuthGuard";
import { useEffect, useState } from "react";
import AdvancedAnalyticsPanel from "../../components/AdvancedAnalyticsPanel";
import PageShell from "../../components/PageShell";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";
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
      <PageShell
        eyebrow="Analytics"
        title="Advanced Risk & Performance Analytics"
        subtitle="Analyze beta, alpha, Sharpe profile, and sector concentration for your current portfolio."
      >
        <div className="space-y-6">
          <AdvancedAnalyticsPanel portfolio={portfolio} />
          <FeatureExpansionHub module="analytics" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
