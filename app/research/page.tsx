"use client";
import AuthGuard from "../../components/AuthGuard";
import ResearchPanel from "../../components/ResearchPanel";
import PageShell from "../../components/PageShell";

export default function ResearchPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Research"
        title="AI Research"
        subtitle="Ask questions about any stock. Get answers with real data, sources, and clear next steps."
        badges={["AI-Powered", "Cited Sources", "Action-Ready"]}
      >
        <div className="space-y-6">
          <ResearchPanel />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
