"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import EarningsCalendar from "../../components/EarningsCalendar";

export default function CalendarPage() {
  return (
    <AuthGuard>
      <PageShell title="Calendar">
        <EarningsCalendar />
      </PageShell>
    </AuthGuard>
  );
}
