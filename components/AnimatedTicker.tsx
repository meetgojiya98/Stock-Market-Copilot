"use client";
import { useEffect, useRef, useState } from "react";

interface AnimatedTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  highlightChange?: boolean;
}

export default function AnimatedTicker({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  className = "",
  highlightChange = true,
}: AnimatedTickerProps) {
  const prevValue = useRef(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(value);

  useEffect(() => {
    if (value === prevValue.current) return;

    const dir = value > prevValue.current ? "up" : "down";
    setDirection(dir);
    fromRef.current = prevValue.current;
    prevValue.current = value;

    const duration = 400;
    const startTime = performance.now();
    startRef.current = startTime;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setTimeout(() => setDirection(null), 600);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const formatted = `${prefix}${displayValue.toFixed(decimals)}${suffix}`;
  const flashClass = highlightChange && direction
    ? direction === "up"
      ? "ticker-flash-up"
      : "ticker-flash-down"
    : "";

  return (
    <span className={`animated-ticker ${flashClass} ${className}`.trim()}>
      {formatted}
    </span>
  );
}
