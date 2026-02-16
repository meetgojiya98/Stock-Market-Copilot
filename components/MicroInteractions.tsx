"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from "react";

/* ===================================================================
   A) ScrollDepthObserver
   Wraps children and toggles the `.in-center` class when the element
   occupies the center 40 % of the viewport.
   =================================================================== */

interface ScrollDepthObserverProps {
  children: ReactNode;
  /** Additional class names forwarded to the wrapper */
  className?: string;
  /** Inline styles for the wrapper */
  style?: CSSProperties;
  /** HTML tag to render (default "div") */
  as?: keyof React.JSX.IntrinsicElements;
}

export function ScrollDepthObserver({
  children,
  className = "",
  style,
  as: Tag = "div",
}: ScrollDepthObserverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inCenter, setInCenter] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The center 40 % means the top 30 % and bottom 30 % are outside.
    // rootMargin shrinks the observable area to the middle band.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInCenter(entry.isIntersecting);
      },
      {
        root: null,
        // Negative top/bottom margins of 30 % each leave the center 40 %
        rootMargin: "-30% 0px -30% 0px",
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const combinedClass = [
    "scroll-depth-card",
    inCenter ? "in-center" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* We cast Tag to any to satisfy JSX generic constraints. */
  const Component = Tag as any;

  return (
    <Component ref={ref} className={combinedClass} style={style}>
      {children}
    </Component>
  );
}

/* ===================================================================
   B) HoverGlow
   Simple wrapper that applies the `hover-glow` CSS class.
   =================================================================== */

interface HoverGlowProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function HoverGlow({ children, className = "", style }: HoverGlowProps) {
  return (
    <div className={`hover-glow ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

/* ===================================================================
   C) MagneticButton
   Button that subtly pulls toward the cursor within a configurable
   radius. Uses CSS custom properties --mx and --my.
   =================================================================== */

interface MagneticButtonProps {
  children: ReactNode;
  /** Magnetic pull radius in px (default 40) */
  radius?: number;
  /** Pull strength multiplier 0-1 (default 0.35) */
  strength?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit" | "reset";
}

export function MagneticButton({
  children,
  radius = 40,
  strength = 0.35,
  className = "",
  style,
  onClick,
  disabled = false,
  ariaLabel,
  type = "button",
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ mx: 0, my: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const el = btnRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.hypot(dx, dy);

      if (distance < radius) {
        const pull = (1 - distance / radius) * strength;
        setOffset({ mx: dx * pull, my: dy * pull });
      } else {
        setOffset({ mx: 0, my: 0 });
      }
    },
    [radius, strength, disabled]
  );

  const handleMouseLeave = useCallback(() => {
    setOffset({ mx: 0, my: 0 });
  }, []);

  return (
    <button
      ref={btnRef}
      type={type}
      className={`magnetic-btn ${className}`.trim()}
      style={
        {
          "--mx": `${offset.mx}px`,
          "--my": `${offset.my}px`,
          ...style,
        } as CSSProperties
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/* ===================================================================
   D) IconMorph
   Smoothly transitions between two icon states with a rotation
   animation using the icon-morph CSS classes.
   =================================================================== */

interface IconMorphProps {
  /** Whether to show the "active" icon (true) or the "default" icon */
  active: boolean;
  /** The default/inactive icon element */
  defaultIcon: ReactNode;
  /** The active icon element */
  activeIcon: ReactNode;
  /** Duration of the morph in ms (default 300) */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

export function IconMorph({
  active,
  defaultIcon,
  activeIcon,
  duration = 300,
  className = "",
  style,
}: IconMorphProps) {
  const [current, setCurrent] = useState<"default" | "active">(
    active ? "active" : "default"
  );
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const target = active ? "active" : "default";
    if (target === current) return;

    // Begin exit phase
    setTransitioning(true);

    timerRef.current = setTimeout(() => {
      // Swap to the new icon at the midpoint
      setCurrent(target);

      // Let the enter transition play, then settle
      timerRef.current = setTimeout(() => {
        setTransitioning(false);
      }, duration / 2);
    }, duration / 2);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, current, duration]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const morphClass = transitioning
    ? current === (active ? "active" : "default")
      ? "icon-morph-enter"
      : "icon-morph-exit"
    : "";

  return (
    <span
      className={`icon-morph ${morphClass} ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transitionDuration: `${duration / 2}ms`,
        ...style,
      }}
      aria-hidden="true"
    >
      {current === "active" ? activeIcon : defaultIcon}
    </span>
  );
}

/* ===================================================================
   E) ParallaxContainer
   Applies the `parallax-bg` class and tracks scroll position to set
   the --parallax-y CSS variable at 0.3x scroll speed.
   =================================================================== */

interface ParallaxContainerProps {
  children: ReactNode;
  /** Parallax speed multiplier (default 0.3) */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

export function ParallaxContainer({
  children,
  speed = 0.3,
  className = "",
  style,
}: ParallaxContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elCenter = rect.top + rect.height / 2;
      const offset = (elCenter - viewportCenter) * speed;

      el.style.setProperty("--parallax-y", `${offset}px`);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(update);
    };

    // Initial position
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed]);

  return (
    <div
      ref={ref}
      className={`parallax-bg ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}

/* ===================================================================
   F) ShimmerPlaceholder
   Renders a shimmer loading placeholder with configurable dimensions.
   =================================================================== */

interface ShimmerPlaceholderProps {
  /** Width of the placeholder (CSS value, default "100%") */
  width?: string | number;
  /** Height of the placeholder (CSS value, default "1rem") */
  height?: string | number;
  /** Border radius (CSS value, default "4px") */
  borderRadius?: string | number;
  /** Additional class names */
  className?: string;
  /** Inline style overrides */
  style?: CSSProperties;
  /** Accessible label (default "Loading...") */
  ariaLabel?: string;
}

export function ShimmerPlaceholder({
  width = "100%",
  height = "1rem",
  borderRadius = "4px",
  className = "",
  style,
  ariaLabel = "Loading...",
}: ShimmerPlaceholderProps) {
  return (
    <div
      className={`shimmer ${className}`.trim()}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius:
          typeof borderRadius === "number"
            ? `${borderRadius}px`
            : borderRadius,
        background: "var(--surface-border)",
        ...style,
      }}
      role="status"
      aria-label={ariaLabel}
    />
  );
}
