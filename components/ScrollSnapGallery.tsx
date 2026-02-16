"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  Children,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────── */

interface ScrollSnapGalleryProps {
  children: ReactNode;
  /** Optional label for accessibility */
  ariaLabel?: string;
}

/* ────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────── */

export default function ScrollSnapGallery({
  children,
  ariaLabel = "Gallery",
}: ScrollSnapGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const childArray = Children.toArray(children);

  /* ── Keep totalItems in sync ── */
  useEffect(() => {
    setTotalItems(childArray.length);
  }, [childArray.length]);

  /* ── IntersectionObserver to track active item ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible item
        let bestEntry: IntersectionObserverEntry | null = null;
        let bestRatio = 0;

        for (const entry of entries) {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        }

        if (bestEntry && bestRatio > 0.5) {
          const idx = itemRefs.current.findIndex(
            (ref) => ref === bestEntry!.target
          );
          if (idx >= 0) {
            setActiveIndex(idx);
          }
        }
      },
      {
        root: container,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all items
    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    items.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
    };
  }, [totalItems]);

  /* ── Scroll to a specific index ── */
  const scrollToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, childArray.length - 1));
      const target = itemRefs.current[clamped];
      if (target && containerRef.current) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
      }
    },
    [childArray.length]
  );

  /* ── Arrow navigation ── */
  const goLeft = useCallback(() => {
    scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);

  const goRight = useCallback(() => {
    scrollToIndex(activeIndex + 1);
  }, [activeIndex, scrollToIndex]);

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goRight();
      }
    },
    [goLeft, goRight]
  );

  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < childArray.length - 1;

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      style={{ position: "relative" }}
      onKeyDown={handleKeyDown}
    >
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="scroll-snap-container"
        tabIndex={0}
        role="list"
        aria-label={`${ariaLabel} items`}
        style={{ outline: "none" }}
      >
        {childArray.map((child, index) => (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="scroll-snap-item"
            role="listitem"
            aria-label={`Item ${index + 1} of ${childArray.length}`}
            aria-current={index === activeIndex ? "true" : undefined}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Desktop arrow buttons */}
      {childArray.length > 1 && (
        <>
          <button
            onClick={goLeft}
            disabled={!canGoLeft}
            aria-label="Previous item"
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(calc(-50% - 1rem))",
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--surface-border)",
              background: "var(--bg-canvas)",
              color: canGoLeft ? "var(--ink)" : "var(--ink-muted)",
              cursor: canGoLeft ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: canGoLeft ? 1 : 0.35,
              transition: "opacity 0.2s, background 0.15s",
              zIndex: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goRight}
            disabled={!canGoRight}
            aria-label="Next item"
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(calc(-50% - 1rem))",
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--surface-border)",
              background: "var(--bg-canvas)",
              color: canGoRight ? "var(--ink)" : "var(--ink-muted)",
              cursor: canGoRight ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: canGoRight ? 1 : 0.35,
              transition: "opacity 0.2s, background 0.15s",
              zIndex: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {childArray.length > 1 && (
        <div
          className="scroll-snap-dots"
          role="tablist"
          aria-label="Gallery navigation"
        >
          {childArray.map((_, index) => (
            <button
              key={index}
              className={`scroll-snap-dot ${
                index === activeIndex ? "active" : ""
              }`}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Go to item ${index + 1}`}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => scrollToIndex(index)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
