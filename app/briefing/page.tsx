"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DailyBriefing from "../../components/DailyBriefing";

export default function BriefingPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Briefing"
        title="Daily Briefing"
        subtitle="Your morning market summary — what happened, what's moving, and what to watch."
        badges={["Daily Update", "Quick Read"]}
      >
        <DailyBriefing />
      </PageShell>
    </AuthGuard>
  );
}
