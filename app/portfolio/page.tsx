"use client";
import AuthGuard from "../../components/AuthGuard";
import { useEffect, useState } from "react";
import PortfolioTable from "../../components/PortfolioTable";
import AdvancedAnalyticsPanel from "../../components/AdvancedAnalyticsPanel";
import PageShell from "../../components/PageShell";
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
        title="Portfolio Command Deck"
        subtitle="Track positions, monitor exposure, and inspect analytics in one integrated workspace."
      >
        <div className="space-y-6">
          <PortfolioTable onPortfolioChange={fetchPortfolio} />
          <AdvancedAnalyticsPanel portfolio={portfolio} />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
