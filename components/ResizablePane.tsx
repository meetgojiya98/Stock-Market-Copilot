"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type ResizablePaneProps = {
  left: ReactNode;
  right: ReactNode;
  defaultSplit?: number;
  minSplit?: number;
  maxSplit?: number;
  storageKey?: string;
  className?: string;
};

const PRESETS = [50, 60, 70];

export default function ResizablePane({
  left,
  right,
  defaultSplit = 60,
  minSplit = 30,
  maxSplit = 80,
  storageKey,
  className = "",
}: ResizablePaneProps) {
  const [split, setSplit] = useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(`smc_pane_${storageKey}`);
      if (saved) {
        const n = Number(saved);
        if (Number.isFinite(n) && n >= minSplit && n <= maxSplit) return n;
      }
    }
    return defaultSplit;
  });
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(maxSplit, Math.max(minSplit, pct));
      setSplit(clamped);
    };

    const handleUp = () => {
      setDragging(false);
      if (storageKey) {
        localStorage.setItem(`smc_pane_${storageKey}`, String(Math.round(split)));
      }
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, maxSplit, minSplit, split, storageKey]);

  return (
    <div ref={containerRef} className={`resizable-pane-container ${className}`}>
      <div className="resizable-pane-left" style={{ width: `${split}%` }}>
        {left}
      </div>
      <div
        className={`resizable-pane-handle ${dragging ? "active" : ""}`}
        onMouseDown={handleMouseDown}
      >
        <div className="resizable-pane-grip" />
      </div>
      <div className="resizable-pane-right" style={{ width: `${100 - split}%` }}>
        {right}
      </div>
      <div className="resizable-pane-presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setSplit(p);
              if (storageKey) localStorage.setItem(`smc_pane_${storageKey}`, String(p));
            }}
            className={`resizable-pane-preset-btn ${Math.abs(split - p) < 3 ? "active" : ""}`}
          >
            {p}/{100 - p}
          </button>
        ))}
      </div>
    </div>
  );
}
