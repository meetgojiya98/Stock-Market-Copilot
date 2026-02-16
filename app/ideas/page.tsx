"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import AITradeIdeas from "../../components/AITradeIdeas";

export default function IdeasPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Ideas"
        subtitle="AI-suggested trades based on your portfolio."
      >
        <AITradeIdeas />
      </PageShell>
    </AuthGuard>
  );
}
