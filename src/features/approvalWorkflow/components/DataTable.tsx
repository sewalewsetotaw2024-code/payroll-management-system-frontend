import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";
import { cn } from "../../../lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: string;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

type SortDir = "asc" | "desc" | null;

function compareValues(a: unknown, b: unknown, dir: "asc" | "desc"): number {
  const cmp =
    a == null && b == null
      ? 0
      : a == null
        ? 1
        : b == null
          ? -1
          : typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b));
  return dir === "asc" ? cmp : -cmp;
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyState = "Nothing to display",
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Search…",
}: DataTableProps<T>) {
  // ---- state ----
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  // ---- filtering (case-insensitive match across every visible cell) ----
  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, columns, query]);

  // ---- sorting ----
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) =>
      compareValues(a[sortKey], b[sortKey], sortDir),
    );
  }, [filtered, sortKey, sortDir]);

  // ---- pagination ----
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const pageData = useMemo(
    () => sorted.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [sorted, safePage, pageSize],
  );

  const rangeStart = sorted.length === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min((safePage + 1) * pageSize, sorted.length);

  // ---- handlers ----
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        // cycle: asc → desc → none
        if (sortDir === "asc") setSortDir("desc");
        else if (sortDir === "desc") {
          setSortKey(null);
          setSortDir(null);
        }
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortKey, sortDir],
  );

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setPage(0);
  }, []);

  // ---- render ----
  return (
    <div className="w-full">
      {/* ---------- search ---------- */}
      {searchable && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4",
              "text-sm font-medium text-slate-700 placeholder:text-slate-400",
              "outline-none transition-all duration-200",
              "focus:ring-2 focus:ring-brand-200 focus:border-brand-400",
            )}
          />
        </div>
      )}

      {/* ---------- table wrapper ---------- */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
        {loading ? (
          /* ---------- loading ---------- */
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <span className="text-sm font-semibold text-slate-500">
              Loading data…
            </span>
          </div>
        ) : sorted.length === 0 ? (
          /* ---------- empty ---------- */
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Inbox className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{emptyState}</p>
          </div>
        ) : (
          <>
            <table className="w-full min-w-[960px] border-collapse">
              {/* ---- head ---- */}
              <thead>
                <tr className="bg-gradient-to-r from-slate-50/80 to-white">
                  {columns.map((col, colIdx) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                        className={cn(
                          "px-5 py-3 text-left",
                          "text-[10px] font-extrabold uppercase tracking-widest text-slate-500",
                          "select-none whitespace-nowrap",
                          col.sortable !== false &&
                            "cursor-pointer hover:text-slate-700 transition-colors duration-150",
                          col.className,
                          colIdx !== columns.length - 1 && 'border-r border-slate-200/50',
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable !== false && (
                            <span className="inline-flex flex-col leading-none">
                              <ChevronUp
                                className={cn(
                                  "h-3 w-3 -mb-0.5 transition-colors",
                                  active && sortDir === "asc"
                                    ? "text-emerald-500"
                                    : "text-slate-300",
                                )}
                              />
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 -mt-0.5 transition-colors",
                                  active && sortDir === "desc"
                                    ? "text-emerald-500"
                                    : "text-slate-300",
                                )}
                              />
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* ---- body ---- */}
              <tbody>
                {pageData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={cn(
                      "transition-colors duration-150 border-b border-slate-100 last:border-0",
                      rowIdx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
                      "hover:bg-brand-50/60",
                    )}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key}
                        className={cn(
                          "whitespace-nowrap py-3 px-5 text-sm font-medium text-slate-700",
                          col.className,
                          colIdx !== columns.length - 1 && 'border-r border-slate-200/50',
                        )}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ---------- pagination ---------- */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <span className="text-xs font-semibold text-slate-500">
                Showing {rangeStart}–{rangeEnd} of {sorted.length} results
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    "text-xs font-semibold text-slate-500 transition-colors",
                    "hover:bg-slate-100/80 disabled:opacity-30 disabled:cursor-not-allowed",
                  )}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-2 text-xs font-bold text-slate-600">
                  {safePage + 1}/{totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={safePage >= totalPages - 1}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    "text-xs font-semibold text-slate-500 transition-colors",
                    "hover:bg-slate-100/80 disabled:opacity-30 disabled:cursor-not-allowed",
                  )}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Example usage (uncomment to preview):
//
// interface Employee {
//   id: number;
//   name: string;
//   department: string;
//   salary: number;
//   status: "active" | "inactive";
// }
//
// const columns: Column<Employee>[] = [
//   { key: "id",         label: "ID",         sortable: true },
//   { key: "name",       label: "Name",       sortable: true },
//   { key: "department", label: "Department",  sortable: true },
//   { key: "salary",     label: "Salary",      sortable: true,
//     render: (v) => `ETB ${Number(v).toLocaleString()}` },
//   { key: "status",     label: "Status",      sortable: false,
//     render: (v) => (
//       <span className={cn(
//         "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
//         v === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
//       )}>{v}</span>
//     )},
// ];
//
// <DataTable columns={columns} data={rows} loading={false} emptyState="No employees found" />
// ---------------------------------------------------------------------------
