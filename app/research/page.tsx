"use client";
import AuthGuard from "../../components/AuthGuard";
import ResearchPanel from "../../components/ResearchPanel";
import PageShell from "../../components/PageShell";

export default function ResearchPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Research"
        title="AI Research Terminal"
        subtitle="Blend live news context with natural-language intelligence for deeper stock-level due diligence."
      >
        <ResearchPanel />
      </PageShell>
    </AuthGuard>
  );
}
