"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import EarningsCalendar from "../../components/EarningsCalendar";
import MacroCalendar from "../../components/MacroCalendar";

export default function CalendarPage() {
  return (
    <AuthGuard>
      <PageShell title="Calendar">
        <div className="space-y-6">
          <section>
            <h2 className="text-base font-semibold mb-3 section-title">Earnings Calendar</h2>
            <EarningsCalendar />
          </section>
          <section>
            <h2 className="text-base font-semibold mb-3 section-title">Economic Calendar &amp; Macro Impact</h2>
            <MacroCalendar />
          </section>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
