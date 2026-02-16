"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DailyBriefing from "../../components/DailyBriefing";

export default function BriefingPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Briefing"
        subtitle="Your morning market summary."
      >
        <DailyBriefing />
      </PageShell>
    </AuthGuard>
  );
}
