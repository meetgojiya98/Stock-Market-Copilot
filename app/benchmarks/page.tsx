"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import PeerBenchmark from "../../components/PeerBenchmark";
export default function BenchmarksPage() {
  return (
    <AuthGuard>
      <PageShell title="Benchmarks">
        <PeerBenchmark />
      </PageShell>
    </AuthGuard>
  );
}
