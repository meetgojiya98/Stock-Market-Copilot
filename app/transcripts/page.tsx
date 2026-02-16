"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import TranscriptSearch from "../../components/TranscriptSearch";
export default function TranscriptsPage() {
  return (
    <AuthGuard>
      <PageShell title="Transcripts">
        <TranscriptSearch />
      </PageShell>
    </AuthGuard>
  );
}
