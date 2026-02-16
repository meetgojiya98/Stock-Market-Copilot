"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import BrokerConnect from "../../components/BrokerConnect";
export default function BrokerPage() {
  return (
    <AuthGuard>
      <PageShell title="Broker">
        <BrokerConnect />
      </PageShell>
    </AuthGuard>
  );
}
