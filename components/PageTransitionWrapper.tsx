"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TransitionPhase = "enter" | "active" | "exit" | "idle";

type PageTransitionWrapperProps = {
  children: ReactNode;
  duration?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Transition styles
// ---------------------------------------------------------------------------

const TRANSITION_STYLES: Record<TransitionPhase, React.CSSProperties> = {
  idle: {
    opacity: 1,
    transform: "translateY(0)",
    transition: "none",
  },
  exit: {
    opacity: 0,
    transform: "translateY(-8px)",
    transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
  },
  enter: {
    opacity: 0,
    transform: "translateY(12px)",
    transition: "none",
  },
  active: {
    opacity: 1,
    transform: "translateY(0)",
    transition: "opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
  },
};

// CSS class mapping for each phase
const PHASE_CLASS_MAP: Record<TransitionPhase, string> = {
  idle: "",
  exit: "page-transition-exit",
  enter: "page-transition-enter",
  active: "page-transition-active",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PageTransitionWrapper({
  children,
  duration = 200,
  className = "",
}: PageTransitionWrapperProps) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [displayedChildren, setDisplayedChildren] = useState<ReactNode>(children);
  const prevPathRef = useRef<string>(pathname);
  const isFirstRender = useRef(true);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  // Handle initial render with a subtle fade-in
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setPhase("enter");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("active");
          enterTimerRef.current = setTimeout(() => {
            setPhase("idle");
          }, 400);
        });
      });
    }
  }, []);

  // Trigger transition on pathname change
  const handleTransition = useCallback(
    (newChildren: ReactNode) => {
      // Cancel any pending timers
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);

      // Phase 1: Exit current content
      setPhase("exit");

      exitTimerRef.current = setTimeout(() => {
        // Phase 2: Swap content, set enter position
        setDisplayedChildren(newChildren);
        setPhase("enter");

        // Phase 3: Animate to active position
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase("active");

            // Phase 4: Settle to idle
            enterTimerRef.current = setTimeout(() => {
              setPhase("idle");
            }, 400);
          });
        });
      }, duration);
    },
    [duration]
  );

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      handleTransition(children);
    } else {
      // Same path, just update children without animation
      setDisplayedChildren(children);
    }
  }, [pathname, children, handleTransition]);

  const phaseClass = PHASE_CLASS_MAP[phase];
  const inlineStyles = TRANSITION_STYLES[phase];

  return (
    <div
      className={`${className} ${phaseClass}`.trim()}
      style={{
        ...inlineStyles,
        willChange: phase === "idle" ? "auto" : "opacity, transform",
        minHeight: "100%",
      }}
    >
      {displayedChildren}
    </div>
  );
}
