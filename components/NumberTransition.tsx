"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from "react";

/* ------------------------------------------------------------------ */
/*  Spring-physics helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Attempt a critically-damped spring step.
 * Returns the interpolated value and whether the spring is at rest.
 */
function springStep(
  current: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number
): [value: number, vel: number, atRest: boolean] {
  const displacement = current - target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * velocity;
  const acceleration = springForce + dampingForce;

  const newVelocity = velocity + acceleration * dt;
  const newValue = current + newVelocity * dt;

  const atRest =
    Math.abs(newValue - target) < 0.01 && Math.abs(newVelocity) < 0.01;

  return [atRest ? target : newValue, atRest ? 0 : newVelocity, atRest];
}

/* ------------------------------------------------------------------ */
/*  NumberTransition component                                        */
/* ------------------------------------------------------------------ */

interface NumberTransitionProps {
  /** The target numeric value to animate toward */
  value: number;
  /** Character(s) shown before the number, e.g. "$" */
  prefix?: string;
  /** Character(s) shown after the number, e.g. "%" */
  suffix?: string;
  /** Number of decimal places (default 2) */
  decimals?: number;
  /** Total spring animation budget in ms (default 600) */
  duration?: number;
  /** Additional CSS class names */
  className?: string;
  /** Inline style overrides */
  style?: CSSProperties;
}

export function NumberTransition({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  duration = 600,
  className = "",
  style,
}: NumberTransitionProps) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<"positive" | "negative" | null>(null);

  const rafRef = useRef(0);
  const prevValue = useRef(value);
  const currentRef = useRef(value);
  const velocityRef = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* Derive spring parameters from duration so that the spring settles
     in approximately `duration` ms. */
  const stiffness = 170;
  const damping = 26;

  const animate = useCallback(() => {
    const dt = 1 / 60; // fixed 60 fps timestep for stability
    const [next, vel, atRest] = springStep(
      currentRef.current,
      velocityRef.current,
      value,
      stiffness,
      damping,
      dt
    );

    currentRef.current = next;
    velocityRef.current = vel;
    setDisplay(next);

    if (!atRest) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      setDisplay(value);
    }
  }, [value, stiffness, damping]);

  useEffect(() => {
    if (value === prevValue.current) return;

    // Determine direction for color flash
    const direction = value > prevValue.current ? "positive" : "negative";
    setFlash(direction);

    // Clear any lingering flash timer
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), duration);

    prevValue.current = value;

    // Kick off animation loop
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, animate]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  /* ── Formatting ── */
  const fixedStr = display.toFixed(decimals);
  const [intPart, decPart] = fixedStr.split(".");
  const intFormatted = Number(intPart).toLocaleString();
  const formatted = decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;

  /* ── Flash color ── */
  const flashStyle: CSSProperties = flash
    ? { color: flash === "positive" ? "var(--positive)" : "var(--negative)" }
    : {};

  return (
    <span
      className={`num-transition ${className}`.trim()}
      style={{
        transition: `color ${duration}ms ease`,
        ...flashStyle,
        ...style,
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {formatted}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
}

export default NumberTransition;
