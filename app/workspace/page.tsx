"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import SplitScreenWorkspace from "../../components/SplitScreenWorkspace";

export default function WorkspacePage() {
  return (
    <AuthGuard>
      <PageShell title="Workspace">
        <SplitScreenWorkspace />
      </PageShell>
    </AuthGuard>
  );
}
