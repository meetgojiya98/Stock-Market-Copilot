"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────── */

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Optional snap-point fractions of viewport height (e.g. [0.5, 0.85]).
   *  Defaults to a single snap at 85vh. */
  snapPoints?: number[];
}

/* ────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────── */

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  snapPoints = [0.85],
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  /* ── Visibility & mounting ── */
  const [visible, setVisible] = useState(false);
  const [snapIndex, setSnapIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  /* ── Touch / mouse tracking ── */
  const dragStartY = useRef(0);
  const currentTranslate = useRef(0);
  const startTime = useRef(0);

  /* ── Mount / unmount ── */
  useEffect(() => {
    if (open) {
      setVisible(true);
      setSnapIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* ── Escape key to close ── */
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* ── Focus trap: return focus on close ── */
  const previousFocusRef = useRef<Element | null>(null);
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      // Focus the sheet for a11y
      setTimeout(() => sheetRef.current?.focus(), 50);
    } else if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  /* ────────────────────────────────────────────────────
   * Drag handlers (shared between touch & mouse)
   * ──────────────────────────────────────────────────── */

  const handleDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    currentTranslate.current = 0;
    startTime.current = Date.now();
    setDragging(true);
  }, []);

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragging) return;
      const delta = clientY - dragStartY.current;
      // Only allow downward dragging (dismiss direction)
      currentTranslate.current = Math.max(0, delta);
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${currentTranslate.current}px)`;
      }
    },
    [dragging]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(false);
    if (!sheetRef.current) return;

    const elapsed = Date.now() - startTime.current;
    const velocity = currentTranslate.current / Math.max(elapsed, 1);

    // Dismiss if dragged past threshold or flicked down fast
    const dismissThreshold = 80;
    const flickVelocity = 0.4;

    if (
      currentTranslate.current > dismissThreshold ||
      velocity > flickVelocity
    ) {
      // If there are multiple snap points and we're not at the lowest,
      // go to the lower snap point first
      if (snapIndex > 0) {
        setSnapIndex((prev) => prev - 1);
        sheetRef.current.style.transform = "";
        currentTranslate.current = 0;
      } else {
        onClose();
      }
    } else if (
      currentTranslate.current < -dismissThreshold &&
      snapIndex < snapPoints.length - 1
    ) {
      // Swipe up to expand to next snap point
      setSnapIndex((prev) => prev + 1);
      sheetRef.current.style.transform = "";
      currentTranslate.current = 0;
    } else {
      // Snap back
      sheetRef.current.style.transform = "";
      currentTranslate.current = 0;
    }
  }, [snapIndex, snapPoints.length, onClose]);

  /* ── Touch events on handle ── */
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove]
  );

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  /* ── Mouse events on handle ── */
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);

      function onMove(ev: MouseEvent) {
        handleDragMove(ev.clientY);
      }
      function onUp() {
        handleDragEnd();
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [handleDragStart, handleDragMove, handleDragEnd]
  );

  /* ── Cleanup visibility after close animation ── */
  const handleTransitionEnd = useCallback(() => {
    if (!open) setVisible(false);
  }, [open]);

  /* ── Early return if not visible ── */
  if (!visible && !open) return null;

  const heightPercent = Math.min(snapPoints[snapIndex] * 100, 85);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="bottom-sheet-overlay"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Bottom sheet"}
        tabIndex={-1}
        className={`bottom-sheet ${open ? "" : "hidden"}`}
        style={{
          height: `${heightPercent}vh`,
          maxHeight: "85vh",
          outline: "none",
          transition: dragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Swipe handle */}
        <div
          ref={handleRef}
          className="bottom-sheet-handle"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          role="separator"
          aria-label="Drag to dismiss"
        />

        {/* Title */}
        {title && (
          <div className="bottom-sheet-header">
            <span style={{ color: "var(--ink)" }}>{title}</span>
          </div>
        )}

        {/* Scrollable content */}
        <div
          className="bottom-sheet-body"
          style={{
            overflowY: "auto",
            overscrollBehavior: "contain",
            maxHeight: title ? "calc(85vh - 5rem)" : "calc(85vh - 2.5rem)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
