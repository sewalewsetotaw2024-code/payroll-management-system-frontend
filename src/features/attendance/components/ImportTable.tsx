import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Zap,
  Calendar,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Pagination } from "../../../components/ui/Pagination/Pagination";
import type { AttendanceImport } from "../types/attendance.types";

interface ImportTableProps {
  imports: AttendanceImport[];
  selectedImportId: string | null;
  onSelectImport: (imp: AttendanceImport) => void;
  onToggleActive: (imp: AttendanceImport) => void;
  pageSize?: number;
}

/**
 * Sortable, paginated table of attendance imports.
 * - Active import always pinned to the top row
 * - Remaining imports sorted by importedAt descending (most recent first)
 * - Default page size: 10
 */
export const ImportTable: React.FC<ImportTableProps> = ({
  imports,
  selectedImportId,
  onSelectImport,
  onToggleActive,
  pageSize: initialPageSize = 10,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortField, setSortField] = useState<"importedAt" | "totalEmployees" | "totalRecords">("importedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Separate active import from the rest
  const activeImport = imports.find((imp) => imp.isActive);
  const otherImports = imports.filter((imp) => !imp.isActive);

  // Sort the non-active imports
  const sortedOthers = useMemo(() => {
    const sorted = [...otherImports].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "totalEmployees":
          aVal = a.totalEmployees ?? 0;
          bVal = b.totalEmployees ?? 0;
          break;
        case "totalRecords":
          aVal = a.totalRecords ?? 0;
          bVal = b.totalRecords ?? 0;
          break;
        default:
          aVal = new Date(a.importedAt).getTime();
          bVal = new Date(b.importedAt).getTime();
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [otherImports, sortField, sortDir]);

  // Paginate the non-active imports
  const totalPages = Math.max(1, Math.ceil(sortedOthers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedOthers = sortedOthers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Final list: active first (always visible), then paginated others
  const visibleImports = activeImport
    ? [activeImport, ...paginatedOthers]
    : paginatedOthers;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field)
      return <ChevronDown className="w-3 h-3 text-slate-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-emerald-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-emerald-600" />
    );
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (imports.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No attendance imports yet.
      </div>
    );
  }

  return (
    <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/60 bg-white/40">
            <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase text-[10px] tracking-wider border-r border-slate-200/50">
              Period
            </th>
            <th className="px-4 py-3 text-center font-bold text-slate-400 uppercase text-[10px] tracking-wider border-r border-slate-200/50">
              <button
                onClick={() => handleSort("totalEmployees")}
                className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors"
              >
                <Users className="w-3 h-3" />
                Employees
                <SortIcon field="totalEmployees" />
              </button>
            </th>
            <th className="px-4 py-3 text-center font-bold text-slate-400 uppercase text-[10px] tracking-wider border-r border-slate-200/50">
              <button
                onClick={() => handleSort("totalRecords")}
                className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Records
                <SortIcon field="totalRecords" />
              </button>
            </th>
            <th className="px-4 py-3 text-center font-bold text-slate-400 uppercase text-[10px] tracking-wider border-r border-slate-200/50">
              Status
            </th>
            <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase text-[10px] tracking-wider border-r border-slate-200/50">
              <button
                onClick={() => handleSort("importedAt")}
                className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Imported
                <SortIcon field="importedAt" />
              </button>
            </th>
            <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleImports.map((imp, idx) => {
            const isSelected = imp.id === selectedImportId;
            return (
              <tr
                key={imp.id}
                onClick={() => onSelectImport(imp)}
                className={cn(
                  "border-b border-slate-100 cursor-pointer transition-colors",
                  imp.isActive
                    ? "bg-brand-50/60 hover:bg-brand-50"
                    : isSelected
                      ? "bg-blue-50/40 hover:bg-blue-50/60"
                      : idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
                  "hover:bg-brand-50/60 transition-colors"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {imp.isActive && (
                      <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800 text-xs">
                      {imp.periodLabel || "Import"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-slate-600 text-xs">
                  {imp.totalEmployees ?? "—"}
                </td>
                <td className="px-4 py-3 text-center text-slate-600 text-xs">
                  {imp.totalRecords ?? "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {imp.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-emerald-700 border border-brand-200">
                        <Zap className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    )}
                    {imp.processedAt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        <CheckCircle2 className="w-2.5 h-2.5" /> PROCESSED
                      </span>
                    )}
                    {!imp.isActive && !imp.processedAt && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {formatDate(imp.importedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {!imp.processedAt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleActive(imp);
                      }}
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-md transition-all",
                        imp.isActive
                          ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                          : "bg-brand-100 text-emerald-700 hover:bg-emerald-200"
                      )}
                    >
                      {imp.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedOthers.length > 0 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={sortedOthers.length}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
};
