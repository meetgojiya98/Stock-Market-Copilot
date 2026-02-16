"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  X,
  Columns3,
  Eye,
  EyeOff,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

export type SortDirection = "asc" | "desc" | "none";

export type SortState = {
  key: string;
  direction: SortDirection;
};

export type FilterItem = {
  id: string;
  label: string;
  value?: string;
};

export type ColumnDef = {
  id: string;
  label: string;
  visible: boolean;
};

export type RowGroup<T = Record<string, unknown>> = {
  label: string;
  rows: T[];
  aggregate?: Record<string, ReactNode>;
};

type DensityLevel = "comfortable" | "cozy" | "compact";

const DENSITY_KEY = "smc_table_density_v1";

/* ────────────────────────────────────────────────────────────────────────────
 * 1. DensityToggle
 *
 * Three buttons (Comfortable / Cozy / Compact) that set a CSS class on a
 * parent wrapper. The chosen density is persisted to localStorage.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DensityToggleProps {
  /** Callback after density changes */
  onChange?: (level: DensityLevel) => void;
  /** Override the parent ref to apply the class on */
  targetRef?: React.RefObject<HTMLElement | null>;
}

export function DensityToggle({ onChange, targetRef }: DensityToggleProps) {
  const [density, setDensity] = useState<DensityLevel>("comfortable");
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* Hydrate from localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DENSITY_KEY) as DensityLevel | null;
      if (stored && ["comfortable", "cozy", "compact"].includes(stored)) {
        setDensity(stored);
      }
    } catch {
      /* SSR / storage unavailable */
    }
  }, []);

  /* Apply class to parent */
  useEffect(() => {
    const target =
      targetRef?.current ??
      wrapperRef.current?.closest("[data-density-target]") ??
      wrapperRef.current?.parentElement;

    if (!target) return;
    target.classList.remove(
      "density-comfortable",
      "density-cozy",
      "density-compact"
    );
    target.classList.add(`density-${density}`);
  }, [density, targetRef]);

  const handleChange = useCallback(
    (level: DensityLevel) => {
      setDensity(level);
      try {
        localStorage.setItem(DENSITY_KEY, level);
      } catch {
        /* ignore */
      }
      onChange?.(level);
    },
    [onChange]
  );

  const levels: { key: DensityLevel; label: string }[] = [
    { key: "comfortable", label: "Comfortable" },
    { key: "cozy", label: "Cozy" },
    { key: "compact", label: "Compact" },
  ];

  return (
    <div
      ref={wrapperRef}
      className="detail-level-toggle"
      role="radiogroup"
      aria-label="Table density"
    >
      {levels.map((l) => (
        <button
          key={l.key}
          type="button"
          role="radio"
          aria-checked={density === l.key}
          className={`detail-level-btn${density === l.key ? " active" : ""}`}
          onClick={() => handleChange(l.key)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. SortableHeader
 *
 * Column header with sort-indicator class. Clicking cycles through
 * asc -> desc -> none. Shows contextual arrow icons.
 * ──────────────────────────────────────────────────────────────────────────── */

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortState;
  onSort: (next: SortState) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey && currentSort.direction !== "none";
  const isDesc = currentSort.key === sortKey && currentSort.direction === "desc";

  const handleClick = useCallback(() => {
    let next: SortDirection;
    if (currentSort.key !== sortKey || currentSort.direction === "none") {
      next = "asc";
    } else if (currentSort.direction === "asc") {
      next = "desc";
    } else {
      next = "none";
    }
    onSort({ key: sortKey, direction: next });
  }, [currentSort, sortKey, onSort]);

  const activeClass = isActive ? " active" : "";
  const descClass = isDesc ? " desc" : "";

  return (
    <th
      className={`sort-indicator${activeClass}${descClass} ${className}`.trim()}
      onClick={handleClick}
      role="columnheader"
      aria-sort={
        !isActive
          ? "none"
          : currentSort.direction === "asc"
          ? "ascending"
          : "descending"
      }
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
        {label}
        <span className="sort-arrow">
          {!isActive && <ArrowUpDown size={13} style={{ opacity: 0.35 }} />}
          {isActive && currentSort.direction === "asc" && <ArrowUp size={13} />}
          {isActive && currentSort.direction === "desc" && <ArrowDown size={13} />}
        </span>
      </span>
    </th>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. ExpandableRow
 *
 * Table row that expands to show a detail panel below. Uses expandable-row
 * classes with collapsed/expanded states. Click toggles the chevron icon.
 * ──────────────────────────────────────────────────────────────────────────── */

interface ExpandableRowProps {
  /** Cells for the main row (array of ReactNode) */
  cells: ReactNode[];
  /** Content shown when expanded */
  detail: ReactNode;
  /** Total column count for the detail colspan */
  colSpan: number;
  /** Optional controlled open state */
  isOpen?: boolean;
  /** Callback when toggle fires */
  onToggle?: (open: boolean) => void;
  className?: string;
}

export function ExpandableRow({
  cells,
  detail,
  colSpan,
  isOpen: controlledOpen,
  onToggle,
  className = "",
}: ExpandableRowProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = useCallback(() => {
    const next = !open;
    if (controlledOpen === undefined) setInternalOpen(next);
    onToggle?.(next);
  }, [open, controlledOpen, onToggle]);

  return (
    <>
      <tr
        className={className}
        onClick={toggle}
        style={{ cursor: "pointer" }}
        aria-expanded={open}
      >
        <td style={{ width: "2rem", textAlign: "center" }}>
          {open ? (
            <ChevronDown size={14} style={{ color: "var(--ink-muted)" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "var(--ink-muted)" }} />
          )}
        </td>
        {cells.map((cell, i) => (
          <td key={i}>{cell}</td>
        ))}
      </tr>
      <tr>
        <td colSpan={colSpan + 1} style={{ padding: 0 }}>
          <div className={`expandable-row ${open ? "expanded" : "collapsed"}`}>
            <div
              style={{
                padding: "0.65rem 0.85rem",
                borderBottom: open ? `1px solid var(--surface-border)` : "none",
              }}
            >
              {detail}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. FilterChipBar
 *
 * Bar of active filter chips above a table. Each chip has a label plus an X
 * button to remove it. Uses filter-chip* CSS classes.
 * ──────────────────────────────────────────────────────────────────────────── */

interface FilterChipBarProps {
  filters: FilterItem[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}

export function FilterChipBar({
  filters,
  onRemove,
  onClearAll,
}: FilterChipBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className="filter-chip-bar" role="list" aria-label="Active filters">
      {filters.map((f) => (
        <span key={f.id} className="filter-chip" role="listitem">
          <span>{f.label}</span>
          {f.value && (
            <span
              style={{
                fontWeight: 400,
                color: "var(--ink-muted)",
                marginLeft: "0.15rem",
              }}
            >
              {f.value}
            </span>
          )}
          <button
            type="button"
            className="filter-chip-remove"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onRemove(f.id);
            }}
            aria-label={`Remove filter ${f.label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--ink-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem 0.4rem",
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. ColumnToggleMenu
 *
 * Dropdown to show/hide table columns. Uses col-toggle-* classes.
 * ──────────────────────────────────────────────────────────────────────────── */

interface ColumnToggleMenuProps {
  columns: ColumnDef[];
  onToggle: (id: string) => void;
}

export function ColumnToggleMenu({ columns, onToggle }: ColumnToggleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: globalThis.MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Toggle columns"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "0.3rem 0.55rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          borderRadius: "0.4rem",
          border: `1px solid var(--surface-border)`,
          background: "transparent",
          color: "var(--ink-muted)",
          cursor: "pointer",
        }}
      >
        <Columns3 size={14} />
        Columns
      </button>

      {isOpen && (
        <div ref={menuRef} className="col-toggle-menu" role="menu">
          {columns.map((col) => (
            <label
              key={col.id}
              className="col-toggle-item"
              role="menuitemcheckbox"
              aria-checked={col.visible}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1rem",
                  height: "1rem",
                  color: col.visible ? "var(--accent)" : "var(--ink-muted)",
                }}
              >
                {col.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </span>
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => onToggle(col.id)}
                style={{ display: "none" }}
              />
              <span style={{ color: col.visible ? "var(--ink)" : "var(--ink-muted)" }}>
                {col.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. StickyFooter
 *
 * Sticky footer row for column totals / aggregates. Uses the
 * sticky-footer-row class.
 * ──────────────────────────────────────────────────────────────────────────── */

interface StickyFooterProps {
  /** Array of cell contents matching your column layout */
  cells: ReactNode[];
  className?: string;
}

export function StickyFooter({ cells, className = "" }: StickyFooterProps) {
  return (
    <tfoot>
      <tr className={`sticky-footer-row ${className}`.trim()}>
        {cells.map((cell, i) => (
          <td
            key={i}
            style={{
              padding: "var(--table-row-py, 0.55rem) 0.75rem",
              fontSize: "var(--table-font, 0.78rem)",
            }}
          >
            {cell}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 7. GroupedRows
 *
 * Collapsible row groups with an aggregate header. Uses grouped-header
 * class. Each group can be independently expanded / collapsed.
 * ──────────────────────────────────────────────────────────────────────────── */

interface GroupedRowsProps<T = Record<string, ReactNode>> {
  groups: RowGroup<T>[];
  /** Render function for each row within a group */
  renderRow: (row: T, index: number) => ReactNode;
  /** Column count for the group header colspan */
  colSpan: number;
  /** Render function for the aggregate summary shown in the group header */
  renderAggregate?: (aggregate: Record<string, ReactNode>) => ReactNode;
  /** Optional list of initially-collapsed group labels */
  defaultCollapsed?: string[];
}

export function GroupedRows<T = Record<string, ReactNode>>({
  groups,
  renderRow,
  colSpan,
  renderAggregate,
  defaultCollapsed = [],
}: GroupedRowsProps<T>) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(defaultCollapsed)
  );

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  return (
    <>
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.label);

        return (
          <tbody key={group.label}>
            {/* Group header */}
            <tr>
              <td colSpan={colSpan} style={{ padding: 0 }}>
                <div
                  className={`grouped-header${isCollapsed ? " collapsed" : ""}`}
                  onClick={() => toggleGroup(group.label)}
                  role="button"
                  aria-expanded={!isCollapsed}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroup(group.label);
                    }
                  }}
                >
                  <ChevronDown size={13} className="group-chevron" />
                  <span>{group.label}</span>
                  <span style={{ marginLeft: "0.35rem", opacity: 0.6 }}>
                    ({group.rows.length})
                  </span>
                  {group.aggregate && renderAggregate && (
                    <span style={{ marginLeft: "auto" }}>
                      {renderAggregate(group.aggregate)}
                    </span>
                  )}
                </div>
              </td>
            </tr>

            {/* Group rows */}
            {!isCollapsed &&
              group.rows.map((row, idx) => renderRow(row, idx))}
          </tbody>
        );
      })}
    </>
  );
}
