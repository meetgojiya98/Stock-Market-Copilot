"use client";

import AuthGuard from "../../components/AuthGuard";
import TerminalChat from "../../components/terminal/TerminalChat";

export default function TerminalPage() {
  return (
    <AuthGuard>
      <div className="h-[calc(100vh-80px)] flex flex-col">
        <TerminalChat />
      </div>
    </AuthGuard>
  );
}
