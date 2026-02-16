"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import GoalTracker from "../../components/GoalTracker";
import QuestTracker from "../../components/QuestTracker";

export default function GoalsPage() {
  return (
    <AuthGuard>
      <PageShell title="Goals">
        <div className="space-y-6">
          <GoalTracker />
          <QuestTracker />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
