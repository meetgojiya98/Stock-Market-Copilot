"use client";
import AuthGuard from "../../components/AuthGuard";
import ResearchPanel from "../../components/ResearchPanel";
import AIStockComparator from "../../components/AIStockComparator";
import PageShell from "../../components/PageShell";

export default function ResearchPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Research"
        subtitle="Ask questions about any stock."
      >
        <div className="space-y-6">
          <ResearchPanel />
          <AIStockComparator />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
