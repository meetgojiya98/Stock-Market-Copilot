"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import TradeJournal from "../../components/TradeJournal";
import JournalAIInsights from "../../components/JournalAIInsights";
import { VoiceNoteRecorder } from "../../components/VoiceCommand";

export default function JournalPage() {
  return (
    <AuthGuard>
      <PageShell title="Journal">
        <div className="space-y-6">
          <TradeJournal />
          <JournalAIInsights />
          <VoiceNoteRecorder />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
