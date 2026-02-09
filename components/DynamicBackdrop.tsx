"use client";

type DynamicBackdropProps = {
  variant?: "aurora" | "mesh" | "trading";
  className?: string;
};

export default function DynamicBackdrop({ variant = "aurora", className = "" }: DynamicBackdropProps) {
  const toneClass =
    variant === "mesh"
      ? "dynamic-backdrop--mesh"
      : variant === "trading"
      ? "dynamic-backdrop--trading"
      : "dynamic-backdrop--aurora";

  return (
    <div
      className={`dynamic-backdrop ${toneClass} pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <span className="dynamic-blob dynamic-blob--a" />
      <span className="dynamic-blob dynamic-blob--b" />
      <span className="dynamic-blob dynamic-blob--c" />
      <span className="dynamic-line dynamic-line--a" />
      <span className="dynamic-line dynamic-line--b" />
    </div>
  );
}
