"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import EarningsCalendar from "../../components/EarningsCalendar";

export default function CalendarPage() {
  return (
    <AuthGuard>
      <PageShell
        eyebrow="Calendar"
        title="Earnings Calendar"
        subtitle="See when your stocks report earnings so you're never caught off guard."
        badges={["Earnings Dates", "Stay Prepared"]}
      >
        <EarningsCalendar />
      </PageShell>
    </AuthGuard>
  );
}
