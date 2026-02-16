"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import NewsSentiment from "../../components/NewsSentiment";

export default function SentimentPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Sentiment"
        title="News Sentiment"
        subtitle="See whether the news is positive or negative for any stock."
        badges={["AI Analysis", "Market Mood"]}
      >
        <NewsSentiment />
      </PageShell>
    </AuthGuard>
  );
}
