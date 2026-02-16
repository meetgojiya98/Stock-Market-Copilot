"use client";
import { useCallback, useEffect, useRef, useState, ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[];
}

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.92],
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentTranslate = useRef(0);
  const [snapIndex, setSnapIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setSnapIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const getSheetHeight = useCallback(() => {
    return snapPoints[snapIndex] * window.innerHeight;
  }, [snapIndex, snapPoints]);

  const handleDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    currentTranslate.current = 0;
    setDragging(true);
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragging) return;
    const delta = clientY - dragStartY.current;
    currentTranslate.current = Math.max(0, delta);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${currentTranslate.current}px)`;
    }
  }, [dragging]);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
    if (!sheetRef.current) return;

    const threshold = 100;
    if (currentTranslate.current > threshold) {
      if (snapIndex > 0) {
        setSnapIndex(snapIndex - 1);
      } else {
        onClose();
      }
    } else if (currentTranslate.current < -threshold && snapIndex < snapPoints.length - 1) {
      setSnapIndex(snapIndex + 1);
    }

    sheetRef.current.style.transform = "";
    currentTranslate.current = 0;
  }, [snapIndex, snapPoints.length, onClose]);

  const handleTransitionEnd = useCallback(() => {
    if (!open) setVisible(false);
  }, [open]);

  if (!visible && !open) return null;

  const heightPercent = snapPoints[snapIndex] * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Bottom sheet"}
        className={`fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-[var(--surface-card)] border-t border-[var(--surface-border)] shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        } ${dragging ? "!transition-none" : ""}`}
        style={{ height: `${heightPercent}vh`, maxHeight: "92vh" }}
        onTransitionEnd={handleTransitionEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onMouseMove={(e) => { if (dragging) handleDragMove(e.clientY); }}
        onMouseUp={handleDragEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[var(--ink-faint)]" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pb-3 border-b border-[var(--surface-border)]">
            <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain px-5 py-4" style={{ height: "calc(100% - 3rem)" }}>
          {children}
        </div>
      </div>
    </>
  );
}
