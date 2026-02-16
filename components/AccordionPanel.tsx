"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

export interface AccordionSection {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}

interface AccordionPanelProps {
  sections: AccordionSection[];
  /** When false (default), only one section can be open at a time */
  allowMultiple?: boolean;
  /** Optional callback when open sections change */
  onChange?: (openIds: string[]) => void;
  className?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Internal animated content wrapper
 *
 * Measures content height and animates between 0 and the measured value so
 * the accordion-content CSS transition produces a smooth expand/collapse.
 * ──────────────────────────────────────────────────────────────────────────── */

function AnimatedContent({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    undefined
  );

  /* Measure height whenever open state changes */
  useEffect(() => {
    if (!contentRef.current) return;

    if (open) {
      const measured = contentRef.current.scrollHeight;
      setHeight(measured);
    } else {
      /* First set to current height so the browser can transition from a
         real value down to 0 (instead of jumping from "auto"). */
      const measured = contentRef.current.scrollHeight;
      setHeight(measured);
      /* Force a reflow, then collapse */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
    }
  }, [open]);

  /* After expand animation ends, switch to auto so content resize works */
  const handleTransitionEnd = useCallback(() => {
    if (open) {
      setHeight(undefined);
    }
  }, [open]);

  return (
    <div
      className="accordion-content"
      style={{
        maxHeight: height !== undefined ? `${height}px` : open ? "none" : "0px",
        overflow: "hidden",
      }}
      onTransitionEnd={handleTransitionEnd}
      role="region"
      aria-hidden={!open}
    >
      <div ref={contentRef}>
        <div style={{ padding: "0.65rem 0.85rem" }}>{children}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * AccordionPanel
 *
 * Reusable accordion supporting single-open or multi-open mode.
 * Uses accordion-section, accordion-trigger, accordion-chevron,
 * and accordion-content CSS classes from globals.css.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function AccordionPanel({
  sections,
  allowMultiple = false,
  onChange,
  className = "",
}: AccordionPanelProps) {
  /* Compute initial open set from defaultOpen flags */
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const defaults = sections.filter((s) => s.defaultOpen).map((s) => s.id);
    if (!allowMultiple && defaults.length > 1) {
      return new Set([defaults[0]]);
    }
    return new Set(defaults);
  });

  const toggle = useCallback(
    (id: string) => {
      setOpenIds((prev) => {
        let next: Set<string>;

        if (allowMultiple) {
          next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        } else {
          /* Single mode: toggle off if already open, otherwise switch */
          next = prev.has(id) ? new Set() : new Set([id]);
        }

        onChange?.(Array.from(next));
        return next;
      });
    },
    [allowMultiple, onChange]
  );

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}
    >
      {sections.map((section) => {
        const isOpen = openIds.has(section.id);

        return (
          <div key={section.id} className="accordion-section">
            {/* Trigger */}
            <button
              type="button"
              className="accordion-trigger"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${section.id}`}
              id={`accordion-trigger-${section.id}`}
              onClick={() => toggle(section.id)}
            >
              <span>{section.title}</span>
              <ChevronDown size={15} className="accordion-chevron" />
            </button>

            {/* Content */}
            <AnimatedContent open={isOpen}>
              <div
                id={`accordion-content-${section.id}`}
                role="region"
                aria-labelledby={`accordion-trigger-${section.id}`}
              >
                {section.content}
              </div>
            </AnimatedContent>
          </div>
        );
      })}
    </div>
  );
}
