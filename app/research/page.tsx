"use client";
import AuthGuard from "../../components/AuthGuard";
import ResearchPanel from "../../components/ResearchPanel";
import PageShell from "../../components/PageShell";
import FeatureExpansionHub from "../../components/FeatureExpansionHub";

export default function ResearchPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Research"
        title="Institutional Research Lab"
        subtitle="Streaming market intelligence with grounded citations, evidence scoring, and execution-ready decision framing."
        heroBackdrop="mesh"
        bodyBackdrop="mesh"
        badges={["Streaming AI", "Verified Sources", "Execution Mapping"]}
      >
        <div className="space-y-6">
          <ResearchPanel />
          <FeatureExpansionHub module="research" />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
