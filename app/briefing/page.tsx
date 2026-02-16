"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import DailyBriefing from "../../components/DailyBriefing";
import MorningBriefingAudio from "../../components/MorningBriefingAudio";
import SwipeNewsFeed from "../../components/SwipeNewsFeed";

export default function BriefingPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Briefing"
        subtitle="Your morning market summary."
      >
        <div className="space-y-6">
          <MorningBriefingAudio />
          <DailyBriefing />
          <SwipeNewsFeed compact />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
