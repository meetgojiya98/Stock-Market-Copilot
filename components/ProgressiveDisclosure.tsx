"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  TrendingUp,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

export type DetailLevel = "overview" | "detail" | "deep";

export interface HoverAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 1. ShowMore
 *
 * Truncates children to a specified number of lines with a gradient fade.
 * A "Show more" / "Show less" toggle reveals the full content.
 * Uses show-more-text, clamped, show-more-btn CSS classes.
 * ════════════════════════════════════════════════════════════════════════════ */

interface ShowMoreProps {
  children: ReactNode;
  maxLines?: number;
  className?: string;
}

export function ShowMore({
  children,
  maxLines = 3,
  className = "",
}: ShowMoreProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  /* Determine whether the content actually overflows */
  useEffect(() => {
    if (!contentRef.current) return;
    const lineHeight = parseFloat(
      getComputedStyle(contentRef.current).lineHeight || "20"
    );
    const maxHeight = lineHeight * maxLines;
    setNeedsClamp(contentRef.current.scrollHeight > maxHeight + 2);
  }, [children, maxLines]);

  const lineHeightEm = 1.5; // approximate line-height in em
  const clampHeight = `${maxLines * lineHeightEm}em`;

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className={`show-more-text${!expanded && needsClamp ? " clamped" : ""}`}
        style={
          !expanded && needsClamp
            ? { maxHeight: clampHeight }
            : { maxHeight: "none" }
        }
      >
        {children}
      </div>
      {needsClamp && (
        <button
          type="button"
          className="show-more-btn"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * 2. DetailLevelToggle
 *
 * Three-level detail selector: Overview / Detail / Deep.
 * Uses detail-level-toggle and detail-level-btn CSS classes.
 * ════════════════════════════════════════════════════════════════════════════ */

interface DetailLevelToggleProps {
  level: DetailLevel;
  onChange: (level: DetailLevel) => void;
  className?: string;
}

const DETAIL_LEVELS: { key: DetailLevel; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "detail", label: "Detail" },
  { key: "deep", label: "Deep" },
];

export function DetailLevelToggle({
  level,
  onChange,
  className = "",
}: DetailLevelToggleProps) {
  return (
    <div
      className={`detail-level-toggle ${className}`.trim()}
      role="radiogroup"
      aria-label="Detail level"
    >
      {DETAIL_LEVELS.map((l) => (
        <button
          key={l.key}
          type="button"
          role="radio"
          aria-checked={level === l.key}
          className={`detail-level-btn${level === l.key ? " active" : ""}`}
          onClick={() => onChange(l.key)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * 3. AdvancedToggle
 *
 * Shows basic fields by default and reveals advanced fields when toggled.
 * Uses advanced-toggle and advanced-panel CSS classes.
 * ════════════════════════════════════════════════════════════════════════════ */

interface AdvancedToggleProps {
  /** Always-visible content */
  basic: ReactNode;
  /** Content revealed on toggle */
  advanced: ReactNode;
  /** Label text for the toggle button */
  label?: string;
  /** Controlled open state */
  isOpen?: boolean;
  /** Callback for toggle */
  onToggle?: (open: boolean) => void;
  className?: string;
}

export function AdvancedToggle({
  basic,
  advanced,
  label = "Show advanced",
  isOpen: controlledOpen,
  onToggle,
  className = "",
}: AdvancedToggleProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const toggle = useCallback(() => {
    const next = !open;
    if (controlledOpen === undefined) setInternalOpen(next);
    onToggle?.(next);
  }, [open, controlledOpen, onToggle]);

  /* Animate panel height */
  useEffect(() => {
    if (!panelRef.current) return;

    if (open) {
      const measured = panelRef.current.scrollHeight;
      setHeight(measured);
    } else {
      const measured = panelRef.current.scrollHeight;
      setHeight(measured);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
    }
  }, [open]);

  const handleTransitionEnd = useCallback(() => {
    if (open) setHeight(undefined);
  }, [open]);

  return (
    <div className={className}>
      {/* Basic content */}
      {basic}

      {/* Toggle trigger */}
      <button
        type="button"
        className="advanced-toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        <Settings2 size={13} />
        <span>{open ? "Hide advanced" : label}</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Advanced panel */}
      <div
        ref={panelRef}
        className={`advanced-panel${!open ? " hidden" : ""}`}
        style={{
          maxHeight:
            height !== undefined ? `${height}px` : open ? "none" : "0px",
          overflow: "hidden",
        }}
        onTransitionEnd={handleTransitionEnd}
        aria-hidden={!open}
      >
        <div style={{ paddingTop: "0.5rem" }}>{advanced}</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * 4. HoverActions
 *
 * A set of action buttons that are hidden until the parent element is
 * hovered. Uses hover-actions-parent and hover-actions CSS classes.
 * ════════════════════════════════════════════════════════════════════════════ */

interface HoverActionsProps {
  actions: HoverAction[];
  children: ReactNode;
  className?: string;
  /** Position of the action buttons relative to children */
  position?: "right" | "top-right" | "bottom-right";
}

export function HoverActions({
  actions,
  children,
  className = "",
  position = "right",
}: HoverActionsProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    right: {
      position: "absolute",
      right: "0.5rem",
      top: "50%",
      transform: "translateY(-50%)",
    },
    "top-right": {
      position: "absolute",
      right: "0.5rem",
      top: "0.35rem",
    },
    "bottom-right": {
      position: "absolute",
      right: "0.5rem",
      bottom: "0.35rem",
    },
  };

  return (
    <div
      className={`hover-actions-parent ${className}`.trim()}
      style={{ position: "relative" }}
    >
      {children}

      <div className="hover-actions" style={positionStyles[position]}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            background: "var(--surface-emphasis)",
            border: `1px solid var(--surface-border)`,
            borderRadius: "0.4rem",
            padding: "0.15rem 0.2rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              title={action.label}
              aria-label={action.label}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                action.onClick();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.6rem",
                height: "1.6rem",
                borderRadius: "0.3rem",
                border: "none",
                background: "transparent",
                color: "var(--ink-muted)",
                cursor: "pointer",
                fontSize: "0.72rem",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--accent) 12%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)";
              }}
            >
              {action.icon ?? action.label.charAt(0)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * 5. QuickPreview
 *
 * A popover that appears on hover to show a preview with a mini chart
 * placeholder. Uses popover-preview and popover-preview-chart CSS classes.
 * ════════════════════════════════════════════════════════════════════════════ */

interface QuickPreviewProps {
  children: ReactNode;
  /** Symbol / title shown at top of preview */
  title: string;
  /** Current price line */
  price?: string;
  /** Change text */
  change?: string;
  /** Whether change is positive */
  positive?: boolean;
  /** Additional info rows */
  info?: { label: string; value: string }[];
  /** Custom content below the chart placeholder */
  extra?: ReactNode;
  /** Delay in ms before showing the preview */
  delay?: number;
  className?: string;
}

export function QuickPreview({
  children,
  title,
  price,
  change,
  positive,
  info,
  extra,
  delay = 400,
  className = "",
}: QuickPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    hoverTimer.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      /* Position below and to the right by default; nudge if off-screen */
      let left = rect.left;
      let top = rect.bottom + 6;

      const popoverWidth = 260;
      const popoverHeight = 220; // approximate

      if (left + popoverWidth > window.innerWidth - 8) {
        left = window.innerWidth - popoverWidth - 8;
      }
      if (top + popoverHeight > window.innerHeight - 8) {
        top = rect.top - popoverHeight - 6;
      }
      if (left < 8) left = 8;
      if (top < 8) top = 8;

      setCoords({ left, top });
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setVisible(false);
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  /* Mini sparkline placeholder using SVG */
  const sparklinePath = "M0,30 Q15,28 30,20 T60,22 T90,10 T120,15 T150,8 T180,12 T210,5 T240,10";

  return (
    <div
      ref={triggerRef}
      className={className}
      style={{ display: "inline-block" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <div
          ref={popoverRef}
          className="popover-preview"
          style={{
            position: "fixed",
            left: `${coords.left}px`,
            top: `${coords.top}px`,
          }}
          onMouseEnter={() => {
            /* Keep popover open while hovering it */
            if (hoverTimer.current) {
              clearTimeout(hoverTimer.current);
              hoverTimer.current = null;
            }
          }}
          onMouseLeave={hide}
          role="tooltip"
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.4rem",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.82rem",
                color: "var(--ink)",
              }}
            >
              {title}
            </span>
            {change && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: positive ? "var(--positive)" : "var(--negative)",
                }}
              >
                {change}
              </span>
            )}
          </div>

          {/* Price */}
          {price && (
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: "0.4rem",
              }}
            >
              {price}
            </div>
          )}

          {/* Mini chart placeholder */}
          <div className="popover-preview-chart">
            <svg
              viewBox="0 0 240 40"
              preserveAspectRatio="none"
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <path
                d={sparklinePath}
                fill="none"
                stroke={positive !== false ? "var(--positive)" : "var(--negative)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`${sparklinePath} L240,40 L0,40 Z`}
                fill={
                  positive !== false
                    ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                    : "color-mix(in srgb, var(--negative) 12%, transparent)"
                }
              />
            </svg>
          </div>

          {/* Info rows */}
          {info && info.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.2rem 0.5rem",
                marginTop: "0.45rem",
                fontSize: "0.72rem",
              }}
            >
              {info.map((row) => (
                <div key={row.label} style={{ display: "contents" }}>
                  <span style={{ color: "var(--ink-muted)" }}>{row.label}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--ink)",
                      textAlign: "right",
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Trend icon hint */}
          {!info && !extra && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                marginTop: "0.4rem",
                fontSize: "0.7rem",
                color: "var(--ink-muted)",
              }}
            >
              <TrendingUp size={12} />
              <span>Hover for live data</span>
            </div>
          )}

          {/* Extra slot */}
          {extra && <div style={{ marginTop: "0.45rem" }}>{extra}</div>}
        </div>
      )}
    </div>
  );
}
