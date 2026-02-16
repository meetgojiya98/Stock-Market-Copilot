"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import AITradeIdeas from "../../components/AITradeIdeas";

export default function IdeasPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Ideas"
        title="Trade Ideas"
        subtitle="Get AI-suggested trade ideas based on your portfolio and market trends."
        badges={["AI-Powered", "Personalized"]}
      >
        <AITradeIdeas />
      </PageShell>
    </AuthGuard>
  );
}
