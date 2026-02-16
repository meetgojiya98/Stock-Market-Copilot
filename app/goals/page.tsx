"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import GoalTracker from "../../components/GoalTracker";

export default function GoalsPage() {
  return (
    <AuthGuard>
      <PageShell title="Goals">
        <GoalTracker />
      </PageShell>
    </AuthGuard>
  );
}
