"use client";

import { useCallback, useEffect } from "react";

type TimeframeOption = {
  label: string;
  value: string;
  shortcut?: string;
};

const DEFAULT_TIMEFRAMES: TimeframeOption[] = [
  { label: "1D", value: "1d", shortcut: "1" },
  { label: "1W", value: "1w", shortcut: "2" },
  { label: "1M", value: "1mo", shortcut: "3" },
  { label: "3M", value: "3mo", shortcut: "4" },
  { label: "1Y", value: "1y", shortcut: "5" },
  { label: "ALL", value: "max", shortcut: "6" },
];

type TimeframeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  timeframes?: TimeframeOption[];
  enableKeyboard?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export default function TimeframeSelector({
  value,
  onChange,
  timeframes = DEFAULT_TIMEFRAMES,
  enableKeyboard = true,
  size = "sm",
  className = "",
}: TimeframeSelectorProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeyboard) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const tf = timeframes.find((t) => t.shortcut === e.key);
      if (tf) {
        e.preventDefault();
        onChange(tf.value);
      }
    },
    [enableKeyboard, onChange, timeframes]
  );

  useEffect(() => {
    if (!enableKeyboard) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboard, handleKeyDown]);

  return (
    <div className={`timeframe-selector ${size === "md" ? "timeframe-md" : ""} ${className}`} role="radiogroup" aria-label="Chart timeframe">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          role="radio"
          aria-checked={value === tf.value}
          onClick={() => onChange(tf.value)}
          className={`timeframe-pill ${value === tf.value ? "active" : ""}`}
        >
          {tf.label}
          {tf.shortcut && <span className="timeframe-shortcut">{tf.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
