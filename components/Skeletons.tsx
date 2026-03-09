"use client";

import React from "react";

/* ─────────────────────────────────────────────────────────
 * Shared inline styles
 * Using the app's existing CSS variables and the shimmer
 * keyframe already defined in globals.css.
 * ────────────────────────────────────────────────────────── */

const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--surface-border) 25%, color-mix(in srgb, var(--ink) 6%, var(--surface-border)) 50%, var(--surface-border) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s ease-in-out infinite",
  borderRadius: "0.375rem",
};

/* ── 1. SkeletonLine ─────────────────────────────────────── */

type SkeletonLineProps = {
  width?: string;
  height?: string;
};

export function SkeletonLine({
  width = "100%",
  height = "0.75rem",
}: SkeletonLineProps) {
  return (
    <div
      className="rounded-lg"
      style={{ ...shimmerStyle, width, height }}
    />
  );
}

/* ── 2. SkeletonCard ─────────────────────────────────────── */

export function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <SkeletonLine width="40%" height="0.65rem" />
      <div className="mt-3">
        <SkeletonLine width="70%" height="1.25rem" />
      </div>
      <div className="mt-3">
        <SkeletonLine width="90%" height="0.6rem" />
      </div>
      <div className="mt-2">
        <SkeletonLine width="55%" height="0.6rem" />
      </div>
    </div>
  );
}

/* ── 3. SkeletonTable ────────────────────────────────────── */

export function SkeletonTable() {
  return (
    <div className="glass-card p-5 space-y-3">
      {/* Header row */}
      <div className="flex gap-4">
        <SkeletonLine width="20%" height="0.6rem" />
        <SkeletonLine width="25%" height="0.6rem" />
        <SkeletonLine width="15%" height="0.6rem" />
        <SkeletonLine width="20%" height="0.6rem" />
        <SkeletonLine width="20%" height="0.6rem" />
      </div>
      <div
        style={{
          height: "1px",
          background: "var(--surface-border)",
        }}
      />
      {/* Body rows */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
          <SkeletonLine width="20%" height="0.75rem" />
          <SkeletonLine width="25%" height="0.75rem" />
          <SkeletonLine width="15%" height="0.75rem" />
          <SkeletonLine width="20%" height="0.75rem" />
          <SkeletonLine width="20%" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}

/* ── 4. SkeletonChart ────────────────────────────────────── */

export function SkeletonChart() {
  return (
    <div className="glass-card p-5">
      <SkeletonLine width="30%" height="0.65rem" />
      <div className="mt-3">
        <div
          className="rounded-lg"
          style={{
            ...shimmerStyle,
            width: "100%",
            height: "220px",
            borderRadius: "0.5rem",
          }}
        />
      </div>
    </div>
  );
}

/* ── 5. SkeletonAgentCard ────────────────────────────────── */

export function SkeletonAgentCard() {
  return (
    <div className="glass-card p-5">
      {/* Top row: icon circle + status badge */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="rounded-xl"
          style={{
            ...shimmerStyle,
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "0.75rem",
          }}
        />
        <div
          className="rounded-lg"
          style={{
            ...shimmerStyle,
            width: "3.5rem",
            height: "1.25rem",
            borderRadius: "9999px",
          }}
        />
      </div>
      {/* Title */}
      <SkeletonLine width="55%" height="0.85rem" />
      {/* Description lines */}
      <div className="mt-2 space-y-1.5">
        <SkeletonLine width="90%" height="0.6rem" />
        <SkeletonLine width="70%" height="0.6rem" />
      </div>
    </div>
  );
}

/* ── 6. SkeletonDashboard ────────────────────────────────── */

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Chart */}
      <SkeletonChart />

      {/* Signal feed area */}
      <div className="glass-card p-5 space-y-3">
        <SkeletonLine width="25%" height="0.65rem" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              style={{
                ...shimmerStyle,
                width: "2rem",
                height: "2rem",
                borderRadius: "9999px",
                flexShrink: 0,
              }}
            />
            <div className="flex-1 space-y-1.5">
              <SkeletonLine width={i % 2 === 0 ? "60%" : "45%"} height="0.6rem" />
              <SkeletonLine width={i % 2 === 0 ? "40%" : "55%"} height="0.5rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 7. SkeletonTerminal ─────────────────────────────────── */

export function SkeletonTerminal() {
  const bubbles = [
    { side: "right" as const, width: "55%" },
    { side: "left" as const, width: "70%" },
    { side: "left" as const, width: "50%" },
    { side: "right" as const, width: "40%" },
    { side: "left" as const, width: "65%" },
    { side: "right" as const, width: "45%" },
  ];

  return (
    <div className="space-y-4 p-4">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="flex"
          style={{
            justifyContent: b.side === "right" ? "flex-end" : "flex-start",
          }}
        >
          <div
            className="rounded-lg"
            style={{
              ...shimmerStyle,
              width: b.width,
              maxWidth: "320px",
              height: b.side === "left" ? "3.5rem" : "2.25rem",
              borderRadius: "0.75rem",
              animationDelay: `${i * 120}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
