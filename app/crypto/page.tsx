"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import CryptoPortfolio from "../../components/CryptoPortfolio";
export default function CryptoPage() {
  return (
    <AuthGuard>
      <PageShell title="Crypto">
        <CryptoPortfolio />
      </PageShell>
    </AuthGuard>
  );
}
