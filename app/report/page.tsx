"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, ArrowLeft, Download } from "lucide-react";

function ReportContent() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      try {
        const raw = localStorage.getItem(`zentrade_share_${id}`);
        if (raw) setReport(JSON.parse(raw));
      } catch {}
    }
  }, [searchParams]);

  if (!report) {
    return (
      <div className="pro-container py-16 text-center">
        <FileText size={36} className="mx-auto mb-3 text-[var(--ink-muted)] opacity-50" />
        <h2 className="text-lg font-bold text-[var(--ink)] mb-2">Report Not Found</h2>
        <p className="text-sm text-[var(--ink-muted)]">This report link may have expired or been deleted.</p>
        <a href="/dashboard" className="inline-flex items-center gap-1.5 mt-4 text-sm text-[var(--accent-2)] hover:underline">
          <ArrowLeft size={14} /> Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="pro-container py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <a href="/dashboard" className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--accent-2)]">
          <ArrowLeft size={12} /> Back
        </a>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--accent-2)] glass-card"
        >
          <Download size={12} /> Print / Save PDF
        </button>
      </div>
      <div className="glass-card p-6">
        <h1 className="text-xl font-bold text-[var(--ink)] mb-4">{report.title}</h1>
        <div className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{report.content}</div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="pro-container py-16 text-center text-sm text-[var(--ink-muted)]">Loading report...</div>}>
      <ReportContent />
    </Suspense>
  );
}
