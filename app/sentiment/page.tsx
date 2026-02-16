"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import NewsSentiment from "../../components/NewsSentiment";
import SwipeNewsFeed from "../../components/SwipeNewsFeed";

export default function SentimentPage() {
  return (
    <AuthGuard>
      <PageShell title="Sentiment">
        <div className="space-y-6">
          <SwipeNewsFeed />
          <NewsSentiment />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
