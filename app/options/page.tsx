"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import OptionsChain from "../../components/OptionsChain";
import OptionsPayoffDiagram from "../../components/OptionsPayoffDiagram";
import { ChartToolbar } from "../../components/ChartToolkit";
export default function OptionsPage() {
  return (
    <AuthGuard>
      <PageShell title="Options">
        <div className="space-y-6">
          <ChartToolbar />
          <OptionsChain />
          <OptionsPayoffDiagram />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
