"use client";
import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
} from "react";

/* ------------------------------------------------------------------ */
/*  useRipple – low-level hook for custom integration                 */
/* ------------------------------------------------------------------ */

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function useRipple(duration = 600) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const trigger = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Diameter must cover the farthest corner from the click point
      const size =
        Math.max(
          Math.hypot(x, y),
          Math.hypot(rect.width - x, y),
          Math.hypot(x, rect.height - y),
          Math.hypot(rect.width - x, rect.height - y)
        ) * 2;

      const id = nextId.current++;

      setRipples((prev) => [...prev, { id, x, y, size }]);

      // Clean up after the CSS animation ends
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, duration);
    },
    [duration]
  );

  return { ripples, trigger } as const;
}

/* ------------------------------------------------------------------ */
/*  RippleButton – wrapper component                                  */
/* ------------------------------------------------------------------ */

interface RippleButtonProps {
  children: ReactNode;
  /** Animation duration in ms (default 600) */
  duration?: number;
  /** Extra className applied to the outer wrapper */
  className?: string;
  /** Extra inline styles on the wrapper */
  style?: CSSProperties;
  /** Forward click handler — fires alongside the ripple */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** HTML role attribute, defaults to "button" */
  role?: string;
  /** Accessible label */
  ariaLabel?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export function RippleButton({
  children,
  duration = 600,
  className = "",
  style,
  onClick,
  role = "button",
  ariaLabel,
  disabled = false,
}: RippleButtonProps) {
  const { ripples, trigger } = useRipple(duration);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      trigger(e);
      onClick?.(e);
    },
    [disabled, trigger, onClick]
  );

  /* Clean up pending timers on unmount */
  useEffect(() => {
    return () => {
      // Ripple state will be discarded with the component
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`ripple-container ${className}`.trim()}
      style={{ cursor: disabled ? "default" : "pointer", ...style }}
      onClick={handleClick}
      role={role}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
    >
      {children}

      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple-effect"
          style={{
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
          }}
        />
      ))}
    </div>
  );
}

export default RippleButton;
