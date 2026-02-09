"use client";
import AuthGuard from "../../components/AuthGuard";
import ResearchPanel from "../../components/ResearchPanel";
import PageShell from "../../components/PageShell";

export default function ResearchPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Research"
        title="Neural Research Deck"
        subtitle="Perplexity-grade market intelligence with streaming answers, verified citations, and execution-ready decision maps."
      >
        <ResearchPanel />
      </PageShell>
    </AuthGuard>
  );
}
