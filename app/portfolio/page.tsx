"use client";
import AuthGuard from "../../components/AuthGuard";
import { useEffect, useState } from "react";
import PortfolioTable from "../../components/PortfolioTable";
import AdvancedAnalyticsPanel from "../../components/AdvancedAnalyticsPanel";
import PageShell from "../../components/PageShell";
import MultiPortfolio from "../../components/MultiPortfolio";
import AIPortfolioReview from "../../components/AIPortfolioReview";
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
        eyebrow="Portfolio"
        title="Your Portfolio"
        subtitle="Track your positions, see how they're doing, and review your risk at a glance."
      >
        <div className="space-y-6">
          <PortfolioTable onPortfolioChange={fetchPortfolio} />
          <AdvancedAnalyticsPanel portfolio={portfolio} />
          <MultiPortfolio />
          <AIPortfolioReview />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
