"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import OptionsChain from "../../components/OptionsChain";
export default function OptionsPage() {
  return (
    <AuthGuard>
      <PageShell title="Options">
        <OptionsChain />
      </PageShell>
    </AuthGuard>
  );
}
