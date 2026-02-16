"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import NewsSentiment from "../../components/NewsSentiment";

export default function SentimentPage() {
  return (
    <AuthGuard>
      <PageShell title="Sentiment">
        <NewsSentiment />
      </PageShell>
    </AuthGuard>
  );
}
