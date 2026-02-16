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
        title="Risk & Performance"
        subtitle="See how your portfolio stacks up: risk scores, sector mix, and key performance numbers."
      >
        <div className="space-y-6">
          <AdvancedAnalyticsPanel portfolio={portfolio} />
          <FeatureExpansionHub module="analytics" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
