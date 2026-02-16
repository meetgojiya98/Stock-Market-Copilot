"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import MarketReplayMode from "../../components/MarketReplayMode";

export default function ReplayPage() {
  return (
    <AuthGuard>
      <PageShell title="Replay">
        <MarketReplayMode />
      </PageShell>
    </AuthGuard>
  );
}
