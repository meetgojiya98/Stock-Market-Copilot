"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { GripVertical, Upload } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   1. DragHandle
   ════════════════════════════════════════════════════════════════════════════ */

type DragHandleProps = {
  size?: number;
  className?: string;
};

export function DragHandle({ size = 16, className = "" }: DragHandleProps) {
  return (
    <span
      className={`drag-handle ${className}`.trim()}
      aria-label="Drag to reorder"
      role="img"
    >
      <GripVertical size={size} />
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   2. SortableList
   ════════════════════════════════════════════════════════════════════════════ */

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onReorder: (reordered: T[]) => void;
  renderItem: (item: T, index: number, handleProps: DragHandleRenderProps) => ReactNode;
  className?: string;
};

type DragHandleRenderProps = {
  draggable: true;
  onDragStart: (e: ReactDragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className = "",
}: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback(
    (index: number) => (e: ReactDragEvent<HTMLElement>) => {
      setDragIndex(index);
      dragNodeRef.current = e.currentTarget;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));

      // Apply ghost styling after a tick so the drag image captures current state
      requestAnimationFrame(() => {
        if (dragNodeRef.current) {
          dragNodeRef.current.classList.add("drag-ghost");
        }
      });
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.classList.remove("drag-ghost");
    }

    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...items];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder(reordered);
    }

    setDragIndex(null);
    setOverIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, overIndex, items, onReorder]);

  const handleDragOver = useCallback(
    (index: number) => (e: ReactDragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      e.preventDefault();
      // reorder is handled in dragEnd
    },
    []
  );

  return (
    <div className={className} role="list">
      {items.map((item, index) => {
        const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;
        const showIndicatorBefore = isOver && dragIndex !== null && dragIndex > index;
        const showIndicatorAfter = isOver && dragIndex !== null && dragIndex < index;

        const handleProps: DragHandleRenderProps = {
          draggable: true,
          onDragStart: handleDragStart(index),
          onDragEnd: handleDragEnd,
        };

        return (
          <div
            key={item.id}
            role="listitem"
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop}
            style={{
              opacity: dragIndex === index ? 0.4 : 1,
              transition: "opacity 0.15s ease",
            }}
          >
            {showIndicatorBefore && <div className="drop-indicator" />}
            {renderItem(item, index, handleProps)}
            {showIndicatorAfter && <div className="drop-indicator" />}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   3. FileDropZone
   ════════════════════════════════════════════════════════════════════════════ */

type FileDropZoneProps = {
  onFileDrop: (files: File[]) => void;
  accept?: string[];
  label?: string;
  className?: string;
};

export function FileDropZone({
  onFileDrop,
  accept,
  label = "Drop files here or click to browse",
  className = "",
}: FileDropZoneProps) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const filterFiles = useCallback(
    (fileList: FileList | null): File[] => {
      if (!fileList) return [];
      const files = Array.from(fileList);
      if (!accept || accept.length === 0) return files;
      return files.filter((f) => {
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        const mime = f.type.toLowerCase();
        return accept.some(
          (a) =>
            a.toLowerCase() === ext ||
            a.toLowerCase() === mime ||
            (a.endsWith("/*") && mime.startsWith(a.replace("/*", "/")))
        );
      });
    },
    [accept]
  );

  const handleDragEnter = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) setActive(true);
  }, []);

  const handleDragLeave = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setActive(false);
      const filtered = filterFiles(e.dataTransfer.files);
      if (filtered.length > 0) onFileDrop(filtered);
    },
    [filterFiles, onFileDrop]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filtered = filterFiles(e.target.files);
      if (filtered.length > 0) onFileDrop(filtered);
      // Reset so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [filterFiles, onFileDrop]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const acceptStr = accept ? accept.join(",") : undefined;

  return (
    <div
      className={`file-drop-zone ${active ? "active" : ""} ${className}`.trim()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={label}
    >
      <Upload
        size={28}
        style={{
          color: active ? "var(--accent)" : "var(--ink-muted)",
          transition: "color 0.2s ease",
        }}
      />
      <span>{label}</span>
      {accept && (
        <span style={{ fontSize: "0.7rem", color: "var(--ink-muted)" }}>
          Accepted: {accept.join(", ")}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        multiple
        onChange={handleInputChange}
        style={{ display: "none" }}
        tabIndex={-1}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   4. SwipeableCard
   ════════════════════════════════════════════════════════════════════════════ */

type SwipeableCardProps = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  children: ReactNode;
  threshold?: number;
  className?: string;
};

const SWIPE_THRESHOLD_DEFAULT = 100;

export function SwipeableCard({
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Delete",
  rightLabel = "Archive",
  leftColor,
  rightColor,
  children,
  threshold = SWIPE_THRESHOLD_DEFAULT,
  className = "",
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isHorizontalRef.current = null;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!swiping) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      // Determine scroll direction lock on first significant move
      if (isHorizontalRef.current === null) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }

      if (!isHorizontalRef.current) return;

      // Prevent vertical scroll while swiping horizontally
      e.preventDefault();

      // Only allow swiping in directions that have handlers
      if (dx < 0 && !onSwipeLeft) return;
      if (dx > 0 && !onSwipeRight) return;

      setOffsetX(dx);
    },
    [swiping, onSwipeLeft, onSwipeRight]
  );

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    isHorizontalRef.current = null;

    if (Math.abs(offsetX) >= threshold) {
      const direction = offsetX < 0 ? "left" : "right";
      setExiting(direction);

      // Trigger exit animation, then fire callback
      setTimeout(() => {
        if (direction === "left" && onSwipeLeft) onSwipeLeft();
        if (direction === "right" && onSwipeRight) onSwipeRight();
        setOffsetX(0);
        setExiting(null);
      }, 250);
    } else {
      // Spring back
      setOffsetX(0);
    }
  }, [offsetX, threshold, onSwipeLeft, onSwipeRight]);

  const progress = Math.min(Math.abs(offsetX) / threshold, 1);

  const leftActionStyle: CSSProperties = {
    opacity: offsetX < 0 ? progress : 0,
    width: Math.abs(Math.min(offsetX, 0)),
    background: leftColor || "var(--negative)",
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 1rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#fff",
    borderRadius: "0 0.5rem 0.5rem 0",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  const rightActionStyle: CSSProperties = {
    opacity: offsetX > 0 ? progress : 0,
    width: Math.max(offsetX, 0),
    background: rightColor || "var(--accent)",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 1rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#fff",
    borderRadius: "0.5rem 0 0 0.5rem",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  const cardStyle: CSSProperties = {
    transform: exiting
      ? `translateX(${exiting === "left" ? "-120%" : "120%"})`
      : `translateX(${offsetX}px)`,
    transition: swiping ? "none" : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
    position: "relative",
    zIndex: 1,
    touchAction: "pan-y",
  };

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Left swipe action (appears on right side) */}
      {onSwipeLeft && (
        <div className="swipe-action-left" style={leftActionStyle}>
          {progress > 0.3 && leftLabel}
        </div>
      )}

      {/* Right swipe action (appears on left side) */}
      {onSwipeRight && (
        <div className="swipe-action-right" style={rightActionStyle}>
          {progress > 0.3 && rightLabel}
        </div>
      )}

      <div
        ref={cardRef}
        style={cardStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. ColumnResizer
   ════════════════════════════════════════════════════════════════════════════ */

type ColumnResizerProps = {
  onResize: (deltaX: number) => void;
  className?: string;
  minDelta?: number;
};

export function ColumnResizer({
  onResize,
  className = "",
  minDelta = 2,
}: ColumnResizerProps) {
  const [active, setActive] = useState(false);
  const startXRef = useRef(0);
  const lastDeltaRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      lastDeltaRef.current = 0;
      setActive(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const currentDelta = moveEvent.clientX - startXRef.current;
        const diff = currentDelta - lastDeltaRef.current;

        if (Math.abs(diff) >= minDelta) {
          // Throttle using rAF
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
          frameRef.current = requestAnimationFrame(() => {
            onResize(diff);
            lastDeltaRef.current = currentDelta;
          });
        }
      };

      const handleMouseUp = () => {
        setActive(false);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onResize, minDelta]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div
      className={`col-resize-handle ${active ? "active" : ""} ${className}`.trim()}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onResize(-10);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onResize(10);
        }
      }}
    />
  );
}
