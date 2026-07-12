import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import {
  ArrowLeft,
  FileSpreadsheet,
  Calculator,
  X,
  BadgeCheck,
  CalendarDays,
  User,
  AlertCircle,
  Loader2,
  Clock,
  Sunrise,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (n: number): string => n.toLocaleString("en-US");

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatSummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  color: string;
  accent: string;
}

const StatSummaryCard: React.FC<StatSummaryCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  accent,
}) => (
  <div
    className={cn(
      "bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-lg shadow-slate-900/5",
      "hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-300",
    )}
  >
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
          accent,
        )}
      >
        <Icon className={cn("w-4.5 h-4.5", color)} />
      </div>
    </div>
    <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
    {subValue && (
      <p className="text-[10px] font-bold text-slate-400 mt-1">{subValue}</p>
    )}
  </div>
);

// ── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
      <p className="text-[11px] font-medium text-slate-400">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-300 text-xs font-bold">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "min-w-[2rem] h-8 rounded-lg text-xs font-bold transition-all",
                currentPage === p
                  ? "bg-indigo-100 text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const EmployeeAttendanceStatsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const importId = searchParams.get("importId");

  const [data, setData] = useState<any[]>([]);
  const [importName, setImportName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Fetch import detail
  useEffect(() => {
    if (!importId) {
      setError("No import ID provided");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await attendanceApi.getImportById(importId);
        const summaries = detail.monthlySummaries || [];
        setData(
          summaries.map((s: any) => ({
            employeeName:
              s.employeeName ||
              [s.employee?.firstName, s.employee?.lastName]
                .filter(Boolean)
                .join(" ") ||
              "Unknown",
            department: s.department || "—",
            regularHours: +(s.regularHours || 0),
            lateMinutes: +(s.lateMinutes || 0),
            earlyOutMinutes: +(s.earlyOutMinutes || 0),
            absenceHours: +(s.absenceHours || 0),
            normalOtHours: +(s.normalOtHours || 0),
            weekendOtHours: +(s.weekendOtHours || 0),
            holidayOtHours: +(s.holidayOtHours || 0),
            ot1Hours: +(s.ot1Hours || 0),
            annualLeaveHours: +(s.annualLeaveHours || 0),
            sickLeaveHours: +(s.sickLeaveHours || 0),
            casualLeaveHours: +(s.casualLeaveHours || 0),
            maternityLeaveHours: +(s.maternityLeaveHours || 0),
            compassionateLeaveHours: +(s.compassionateLeaveHours || 0),
            basicSalary: s.employee?.compensation?.basicSalary,
            grossSalary: s.employee?.compensation?.grossSalary,
          })),
        );
        setImportName(
          detail.periodLabel ||
            detail.fileReference ||
            detail.source ||
            "Attendance Import",
        );
      } catch (err) {
        console.error("Failed to load attendance details:", err);
        setError("Failed to load employee attendance data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [importId]);

  // Filter/search
  const filtered = useMemo(
    () =>
      data.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          e.department.toLowerCase().includes(search.toLowerCase()),
      ),
    [data, search],
  );

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const handlePageChange = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages],
  );

  // Reset page when search changes
  useEffect(() => setPage(1), [search]);

  // Totals for stat cards
  const totals = useMemo(
    () => ({
      employees: data.length,
      regularHours: data.reduce((s, e) => s + e.regularHours, 0),
      normalOt: data.reduce((s, e) => s + e.normalOtHours, 0),
      weekendOt: data.reduce((s, e) => s + e.weekendOtHours, 0),
      holidayOt: data.reduce((s, e) => s + e.holidayOtHours, 0),
      ot1: data.reduce((s, e) => s + e.ot1Hours, 0),
      absenceHours: data.reduce((s, e) => s + e.absenceHours, 0),
      leaveHours: data.reduce(
        (s, e) =>
          s +
          e.annualLeaveHours +
          e.sickLeaveHours +
          e.casualLeaveHours +
          e.maternityLeaveHours +
          e.compassionateLeaveHours,
        0,
      ),
      lateMinutes: data.reduce((s, e) => s + e.lateMinutes, 0),
    }),
    [data],
  );

  // Individual totals in table
  const totalLeave = (e: typeof data[number]) =>
    e.annualLeaveHours +
    e.sickLeaveHours +
    e.casualLeaveHours +
    e.maternityLeaveHours +
    e.compassionateLeaveHours;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200/60 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Employee Attendance Stats
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                {importName}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Detailed attendance breakdown for {fmtInt(data.length)} employee
              {data.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">
            Loading employee attendance data…
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-sm font-bold text-slate-500">{error}</p>
          <button
            onClick={() => navigate("/approval")}
            className="mt-4 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all"
          >
            Back to Approval Workflow
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatSummaryCard
              label="Total Employees"
              value={fmtInt(totals.employees)}
              icon={User}
              color="text-indigo-600"
              accent="bg-gradient-to-br from-indigo-50 to-indigo-100"
            />
            <StatSummaryCard
              label="Regular Hours"
              value={fmt(totals.regularHours)}
              icon={Calculator}
              color="text-emerald-600"
              accent="bg-gradient-to-br from-emerald-50 to-emerald-100"
            />
            <StatSummaryCard
              label="Total OT Hours"
              value={fmt(totals.normalOt + totals.weekendOt + totals.holidayOt + totals.ot1)}
              subValue={`Normal ${fmt(totals.normalOt)} · Weekend ${fmt(totals.weekendOt)} · Holiday ${fmt(totals.holidayOt)} · OT1 ${fmt(totals.ot1)}`}
              icon={Clock}
              color="text-amber-600"
              accent="bg-gradient-to-br from-amber-50 to-amber-100"
            />
            <StatSummaryCard
              label="Absence Hours"
              value={fmt(totals.absenceHours)}
              icon={X}
              color="text-rose-600"
              accent="bg-gradient-to-br from-rose-50 to-rose-100"
            />
            <StatSummaryCard
              label="Leave Hours"
              value={fmt(totals.leaveHours)}
              icon={CalendarDays}
              color="text-blue-600"
              accent="bg-gradient-to-br from-blue-50 to-blue-100"
            />
          </div>

          {/* Table Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-900/5 overflow-hidden">

            {/* Table header */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-700">
                  Employee Attendance Breakdown
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                  {filtered.length} of {data.length}
                </span>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or department…"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Employee
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Department
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Regular Hrs
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Sunrise className="w-3 h-3" />
                        Normal OT
                      </div>
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Sun className="w-3 h-3" />
                        Weekend OT
                      </div>
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Moon className="w-3 h-3" />
                        Holiday OT
                      </div>
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      OT1
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Absence Hrs
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Leave Hrs
                    </th>
                    <th className="py-3.5 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Late Min
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                          <User className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">
                          {search
                            ? "No employees match your search"
                            : "No attendance data available"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((employee, idx) => {
                      const totalOt =
                        employee.normalOtHours +
                        employee.weekendOtHours +
                        employee.holidayOtHours +
                        employee.ot1Hours;
                      const leave = totalLeave(employee);
                      return (
                        <tr
                          key={`${employee.employeeName}-${idx}`}
                          className={cn(
                            "border-b border-slate-50 transition-colors",
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                            "hover:bg-emerald-50/40",
                          )}
                        >
                          <td className="py-3.5 px-6">
                            <span className="text-sm font-bold text-slate-800">
                              {employee.employeeName}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-[11px] font-medium text-slate-500">
                              {employee.department}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span className="text-sm font-bold text-slate-800">
                              {fmt(employee.regularHours)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                employee.normalOtHours > 0
                                  ? "text-amber-600"
                                  : "text-slate-400",
                              )}
                            >
                              {fmt(employee.normalOtHours)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                employee.weekendOtHours > 0
                                  ? "text-orange-600"
                                  : "text-slate-400",
                              )}
                            >
                              {fmt(employee.weekendOtHours)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                employee.holidayOtHours > 0
                                  ? "text-purple-600"
                                  : "text-slate-400",
                              )}
                            >
                              {fmt(employee.holidayOtHours)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                employee.ot1Hours > 0
                                  ? "text-rose-600"
                                  : "text-slate-400",
                              )}
                            >
                              {fmt(employee.ot1Hours)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                employee.absenceHours > 0
                                  ? "text-rose-600"
                                  : "text-slate-400",
                              )}
                            >
                              {fmt(employee.absenceHours)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                leave > 0 ? "text-blue-600" : "text-slate-400",
                              )}
                            >
                              {fmt(leave)}
                            </span>
                          </td>
                          <td className="py-3.5 pr-6 text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                employee.lateMinutes > 0
                                  ? "text-rose-500"
                                  : "text-slate-400",
                              )}
                            >
                              {employee.lateMinutes > 0
                                ? fmtInt(employee.lateMinutes)
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4">
              {filtered.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  {[
                    {
                      label: "Total Regular Hrs",
                      value: fmt(
                        paginated.reduce((s, e) => s + e.regularHours, 0),
                      ),
                    },
                    {
                      label: "Total OT Hrs",
                      value: fmt(
                        paginated.reduce(
                          (s, e) =>
                            s +
                            e.normalOtHours +
                            e.weekendOtHours +
                            e.holidayOtHours +
                            e.ot1Hours,
                          0,
                        ),
                      ),
                    },
                    {
                      label: "Total Absence Hrs",
                      value: fmt(
                        paginated.reduce((s, e) => s + e.absenceHours, 0),
                      ),
                    },
                    {
                      label: "Total Leave Hrs",
                      value: fmt(
                        paginated.reduce((s, e) => s + totalLeave(e), 0),
                      ),
                    },
                    {
                      label: "Total Late Min",
                      value: fmtInt(
                        paginated.reduce((s, e) => s + e.lateMinutes, 0),
                      ),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-2.5 bg-slate-50 rounded-xl"
                    >
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                        {stat.label}
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeAttendanceStatsPage;
