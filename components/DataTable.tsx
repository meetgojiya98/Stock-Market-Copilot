"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
};

type SortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

type DataTableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchable = false,
  pageSize: initialPageSize = 10,
  onRowClick,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return typeof val === "string" && val.toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { key, direction } = sort;
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      const sa = String(av);
      const sb = String(bv);
      return direction === "asc"
        ? sa.localeCompare(sb)
        : sb.localeCompare(sa);
    });
  }, [filtered, sort]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );
  const showFrom = sorted.length === 0 ? 0 : safePage * pageSize + 1;
  const showTo = Math.min((safePage + 1) * pageSize, sorted.length);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const alignClass = (align?: string) => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      {searchable && (
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--surface-border)" }}
        >
          <Search size={14} style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search..."
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: "var(--ink)" }}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ color: "var(--ink)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium text-xs ${alignClass(col.align)}`}
                  style={{
                    color: "var(--ink-muted)",
                    width: col.width,
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="inline-flex">
                        {sort?.key === col.key ? (
                          sort.direction === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )
                        ) : (
                          <ArrowUpDown
                            size={12}
                            style={{ opacity: 0.3 }}
                          />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row, ri) => (
                <tr
                  key={ri}
                  onClick={() => onRowClick?.(row)}
                  className="transition-colors"
                  style={{
                    borderBottom: "1px solid var(--surface-border)",
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 ${alignClass(col.align)}`}
                      style={{ width: col.width }}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div
          className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderTop: "1px solid var(--surface-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Showing {showFrom}-{showTo} of {sorted.length}
          </span>

          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) =>
                handlePageSizeChange(Number(e.target.value))
              }
              className="text-xs rounded px-2 py-1 outline-none"
              style={{
                backgroundColor: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--surface-border)",
              }}
            >
              {[10, 25, 50].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="p-1 rounded transition-colors disabled:opacity-30"
                style={{ color: "var(--ink-muted)" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="text-xs min-w-[4rem] text-center"
                style={{ color: "var(--ink-muted)" }}
              >
                {safePage + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={safePage >= totalPages - 1}
                className="p-1 rounded transition-colors disabled:opacity-30"
                style={{ color: "var(--ink-muted)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
