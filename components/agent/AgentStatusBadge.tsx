"use client";

type Props = {
  status: "idle" | "running" | "completed" | "error";
};

const STATUS_MAP: Record<Props["status"], { label: string; className: string }> = {
  idle: { label: "Idle", className: "badge-neutral" },
  running: { label: "Running", className: "badge-running" },
  completed: { label: "Completed", className: "badge-positive" },
  error: { label: "Error", className: "badge-negative" },
};

export default function AgentStatusBadge({ status }: Props) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${className}`}
      style={{
        background:
          status === "running"
            ? "color-mix(in srgb, var(--accent-2) 15%, transparent)"
            : status === "completed"
            ? "color-mix(in srgb, var(--positive) 15%, transparent)"
            : status === "error"
            ? "color-mix(in srgb, var(--negative) 15%, transparent)"
            : "color-mix(in srgb, var(--ink) 8%, transparent)",
        color:
          status === "running"
            ? "var(--accent-2)"
            : status === "completed"
            ? "var(--positive)"
            : status === "error"
            ? "var(--negative)"
            : "var(--ink-muted)",
      }}
    >
      {status === "running" && <span className="pulse-dot" />}
      {label}
    </span>
  );
}
