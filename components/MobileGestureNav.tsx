"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  ChevronDown,
  ClipboardCopy,
  FlaskConical,
  Loader2,
  PieChart,
  Plus,
  ShoppingCart,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MobileGestureNavProps {
  children?: React.ReactNode;
  onRefresh?: () => void;
  pages?: PageDef[];
}

interface PageDef {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isSwipe: boolean;
  isPull: boolean;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_PAGES: PageDef[] = [
  { path: "/portfolio", label: "Portfolio", icon: <PieChart size={16} /> },
  { path: "/watchlist", label: "Watchlist", icon: <Bookmark size={16} /> },
  { path: "/research", label: "Research", icon: <FlaskConical size={16} /> },
  { path: "/execution", label: "Execution", icon: <ShoppingCart size={16} /> },
  { path: "/alerts", label: "Alerts", icon: <Bell size={16} /> },
];

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const PULL_THRESHOLD = 100;
const PULL_MAX = 150;
const LONG_PRESS_DURATION = 500;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MobileGestureNav({
  children,
  onRefresh,
  pages = DEFAULT_PAGES,
}: MobileGestureNavProps) {
  /* State */
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextTarget, setContextTarget] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  /* Refs */
  const touchRef = useRef<TouchState | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Detect touch device */
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  /* Detect current page */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const idx = pages.findIndex((p) => path.startsWith(p.path));
      if (idx >= 0) setCurrentPageIndex(idx);
    }
  }, [pages]);

  /* Context menu items */
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Copy Symbol",
      icon: <ClipboardCopy size={14} />,
      action: () => {
        if (contextTarget) {
          navigator.clipboard?.writeText(contextTarget).catch(() => {});
        }
        setShowContextMenu(false);
      },
    },
    {
      label: "Add to Watchlist",
      icon: <Plus size={14} />,
      action: () => {
        setShowContextMenu(false);
      },
    },
    {
      label: "Set Alert",
      icon: <Bell size={14} />,
      action: () => {
        setShowContextMenu(false);
      },
    },
  ];

  /* Close context menu on outside click */
  useEffect(() => {
    if (!showContextMenu) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element;
      if (!target.closest(".context-menu")) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showContextMenu]);

  /* Navigate to a page */
  const navigateToPage = useCallback(
    (direction: "prev" | "next") => {
      const newIdx =
        direction === "next"
          ? Math.min(currentPageIndex + 1, pages.length - 1)
          : Math.max(currentPageIndex - 1, 0);

      if (newIdx !== currentPageIndex) {
        setCurrentPageIndex(newIdx);
        if (typeof window !== "undefined") {
          window.location.href = pages[newIdx].path;
        }
      }
    },
    [currentPageIndex, pages],
  );

  /* Handle refresh */
  const doRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPullDistance(0);
    setIsPulling(false);

    if (onRefresh) {
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    } else {
      setTimeout(() => {
        setIsRefreshing(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 500);
    }
  }, [onRefresh]);

  /* Touch handlers */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouchDevice) return;

      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
        isSwipe: false,
        isPull: false,
      };

      /* Start long-press timer */
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (!touchRef.current) return;
        const t = touchRef.current;
        const dx = Math.abs(t.currentX - t.startX);
        const dy = Math.abs(t.currentY - t.startY);

        /* Only trigger if finger hasn't moved much */
        if (dx < 10 && dy < 10) {
          /* Find the closest stock symbol element */
          const target = document.elementFromPoint(t.currentX, t.currentY);
          let symbol: string | null = null;

          if (target) {
            /* Look for a data-symbol attribute or text that looks like a stock symbol */
            const symbolEl = target.closest("[data-symbol]");
            if (symbolEl) {
              symbol = symbolEl.getAttribute("data-symbol");
            } else {
              const text = target.textContent?.trim() || "";
              if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(text)) {
                symbol = text;
              }
            }
          }

          setContextTarget(symbol || "N/A");
          setContextMenuPos({ x: t.currentX, y: t.currentY });
          setShowContextMenu(true);

          /* Haptic feedback if available */
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }, LONG_PRESS_DURATION);
    },
    [isTouchDevice],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouchDevice || !touchRef.current) return;
      if (showContextMenu) return;

      const touch = e.touches[0];
      const t = touchRef.current;
      t.currentX = touch.clientX;
      t.currentY = touch.clientY;

      const dx = touch.clientX - t.startX;
      const dy = touch.clientY - t.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      /* Cancel long-press if finger moves */
      if (absDx > 10 || absDy > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      /* Determine gesture type */
      if (!t.isSwipe && !t.isPull) {
        if (absDx > absDy && absDx > 15) {
          t.isSwipe = true;
        } else if (dy > 15 && absDy > absDx && window.scrollY <= 0) {
          t.isPull = true;
        }
      }

      /* Handle pull-to-refresh */
      if (t.isPull && !isRefreshing) {
        const pull = Math.min(dy, PULL_MAX);
        setPullDistance(pull);
        setIsPulling(true);
        if (pull > 30) {
          e.preventDefault();
        }
      }

      /* Handle swipe */
      if (t.isSwipe) {
        const clampedDx = Math.max(-200, Math.min(200, dx));
        setSwipeOffset(clampedDx);
        setSwipeDirection(dx > 0 ? "right" : "left");
      }
    },
    [isTouchDevice, showContextMenu, isRefreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isTouchDevice || !touchRef.current) return;

    /* Clear long-press timer */
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const t = touchRef.current;
    const dx = t.currentX - t.startX;
    const dy = t.currentY - t.startY;
    const elapsed = Date.now() - t.startTime;
    const velocity = Math.abs(dx) / elapsed;

    /* Pull-to-refresh */
    if (t.isPull && pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      doRefresh();
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }

    /* Swipe navigation */
    if (t.isSwipe) {
      const shouldNavigate =
        Math.abs(dx) >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD;

      if (shouldNavigate) {
        if (dx > 0 && currentPageIndex > 0) {
          navigateToPage("prev");
        } else if (dx < 0 && currentPageIndex < pages.length - 1) {
          navigateToPage("next");
        }
      }

      setSwipeOffset(0);
      setSwipeDirection(null);
    }

    touchRef.current = null;
  }, [
    isTouchDevice,
    pullDistance,
    isRefreshing,
    doRefresh,
    currentPageIndex,
    pages.length,
    navigateToPage,
  ]);

  /* Don't render gesture UI on non-touch devices */
  if (!isTouchDevice) {
    return <>{children}</>;
  }

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const pullReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="pull-indicator"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 8,
            transition: isRefreshing ? "none" : "height 0.1s",
          }}
        >
          {/* Progress bar */}
          <div
            style={{
              width: "60%",
              maxWidth: 240,
              height: 4,
              borderRadius: 2,
              background: "rgba(148,163,184,0.15)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: isRefreshing ? "100%" : `${pullProgress * 100}%`,
                background: pullReady || isRefreshing
                  ? "linear-gradient(90deg, #8b5cf6, #6366f1)"
                  : "rgba(148,163,184,0.3)",
                borderRadius: 2,
                transition: isRefreshing ? "width 0.8s ease-in-out" : "none",
                animation: isRefreshing ? "pulse 1s infinite" : "none",
              }}
            />
          </div>

          {/* Icon / message */}
          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              opacity: 0.6,
              transform: `translateY(${Math.min(pullDistance * 0.3, 30)}px)`,
              transition: "transform 0.1s",
            }}
          >
            {isRefreshing ? (
              <>
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Refreshing...
              </>
            ) : pullReady ? (
              <>
                <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} />
                Release to refresh
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Pull down to refresh
              </>
            )}
          </div>
        </div>
      )}

      {/* Swipe indicators */}
      {swipeDirection === "right" && currentPageIndex > 0 && (
        <div
          className="swipe-indicator"
          style={{
            position: "fixed",
            left: 0,
            top: "50%",
            transform: `translateY(-50%) translateX(${Math.min(swipeOffset * 0.5, 60) - 60}px)`,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: "0 12px 12px 0",
            background: "rgba(139,92,246,0.9)",
            color: "#fff",
            boxShadow: "4px 0 16px rgba(0,0,0,0.2)",
            transition: "transform 0.05s",
          }}
        >
          <ArrowLeft size={18} />
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Swipe to</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {pages[currentPageIndex - 1]?.label}
            </div>
          </div>
        </div>
      )}

      {swipeDirection === "left" && currentPageIndex < pages.length - 1 && (
        <div
          className="swipe-indicator"
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: `translateY(-50%) translateX(${Math.max(swipeOffset * 0.5, -60) + 60}px)`,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: "12px 0 0 12px",
            background: "rgba(139,92,246,0.9)",
            color: "#fff",
            boxShadow: "-4px 0 16px rgba(0,0,0,0.2)",
            transition: "transform 0.05s",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Swipe to</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {pages[currentPageIndex + 1]?.label}
            </div>
          </div>
          <ArrowRight size={18} />
        </div>
      )}

      {/* Page dots indicator */}
      {(swipeDirection !== null) && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 20,
            background: "rgba(30,30,40,0.9)",
            zIndex: 9998,
          }}
        >
          {pages.map((page, i) => (
            <div
              key={page.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: i === currentPageIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background:
                    i === currentPageIndex
                      ? "#8b5cf6"
                      : "rgba(148,163,184,0.3)",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
              {i === currentPageIndex && (
                <span style={{ fontSize: 10, opacity: 0.7, whiteSpace: "nowrap" }}>
                  {page.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Context menu overlay */}
      {showContextMenu && (
        <div
          className="context-menu-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 9999,
          }}
        >
          <div
            className="context-menu"
            style={{
              position: "absolute",
              left: Math.min(contextMenuPos.x, window.innerWidth - 200),
              top: Math.min(contextMenuPos.y, window.innerHeight - 200),
              minWidth: 180,
              borderRadius: 12,
              background: "rgba(30,30,40,0.98)",
              border: "1px solid rgba(148,163,184,0.2)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            {contextTarget && (
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(148,163,184,0.1)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {contextTarget}
              </div>
            )}

            {/* Items */}
            {contextMenuItems.map((item, i) => (
              <button
                key={i}
                className="context-menu-item"
                onClick={item.action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "12px 14px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  color: "inherit",
                  borderBottom:
                    i < contextMenuItems.length - 1
                      ? "1px solid rgba(148,163,184,0.06)"
                      : "none",
                }}
              >
                <span style={{ opacity: 0.6 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inject spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Main content with pull offset */}
      <div
        style={{
          transform: isPulling ? `translateY(${Math.min(pullDistance * 0.4, 60)}px)` : "none",
          transition: isPulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
