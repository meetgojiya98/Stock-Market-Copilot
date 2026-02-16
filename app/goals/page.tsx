"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import GoalTracker from "../../components/GoalTracker";

export default function GoalsPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Goals"
        title="Goal Tracker"
        subtitle="Set targets for your portfolio and track your progress over time."
        badges={["Milestones", "Stay on Track"]}
      >
        <GoalTracker />
      </PageShell>
    </AuthGuard>
  );
}
