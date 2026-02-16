"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import NewsSentiment from "../../components/NewsSentiment";
import SocialSentiment from "../../components/SocialSentiment";
import SwipeNewsFeed from "../../components/SwipeNewsFeed";

export default function SentimentPage() {
  return (
    <AuthGuard>
      <PageShell title="Sentiment">
        <div className="space-y-6">
          <SwipeNewsFeed />
          <SocialSentiment />
          <NewsSentiment />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
