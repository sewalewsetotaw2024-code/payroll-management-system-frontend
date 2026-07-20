import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  Users,
  Clock,
  X,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { DataTable } from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { attendanceApi } from "../../attendance/api/attendanceApi";

// ── Types ─────────────────────────────────────────────────────────────────

interface AttendanceEmployeeRow {
  employeeName: string;
  externalId: string;
  regularHours: number;
  overtimeHours: number;
  absentDays: number;
  paidLeaveDays: number;
  actualDays: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (n: number): string => n.toLocaleString("en-US");

// ── Stat Card ─────────────────────────────────────────────────────────────

interface StatSummaryCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
}

const StatSummaryCard: React.FC<StatSummaryCardProps> = ({
  label,
  value,
  icon: Icon,
  gradient,
}) => (
  <div
    className={cn(
      "rounded-xl p-5 shadow-sm transition-all duration-300",
      "hover:shadow-md hover:scale-[1.01]",
      gradient,
    )}
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────

export const AttendanceStatsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const importId = searchParams.get("importId");

  const [data, setData] = useState<AttendanceEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!importId) {
      setLoading(false);
      return;
    }

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
          externalId: s.externalId || s.employee?.externalId || "—",
          regularHours: +(s.regularHours || 0),
          overtimeHours:
            +(s.normalOtHours || 0) +
            +(s.weekendOtHours || 0) +
            +(s.holidayOtHours || 0) +
            +(s.ot1Hours || 0),
          absentDays: +(s.absentDays ?? +(s.absenceHours || 0)),
          paidLeaveDays: +(
            s.paidLeaveDays ??
            +(s.annualLeaveHours || 0) +
              +(s.sickLeaveHours || 0) +
              +(s.casualLeaveHours || 0) +
              +(s.maternityLeaveHours || 0) +
              +(s.compassionateLeaveHours || 0)
          ),
          actualDays: +(s.actualDays || 0),
        })),
      );
    } catch (err) {
      console.error("Failed to load attendance stats:", err);
      setError("Failed to load attendance statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId]);

  // ── Derived data ────────────────────────────────────────────────────────

  const totals = useMemo(
    () => ({
      employees: data.length,
      regularHours: data.reduce((s, e) => s + e.regularHours, 0),
      absentDays: data.reduce((s, e) => s + e.absentDays, 0),
    }),
    [data],
  );

  // ── Table columns ───────────────────────────────────────────────────────

  const columns: Column<AttendanceEmployeeRow>[] = [
    {
      key: "employeeName",
      label: "Employee Name",
      sortable: true,
      render: (value) => (
        <span className="font-bold text-slate-800">{value}</span>
      ),
    },
    {
      key: "externalId",
      label: "External ID",
      sortable: true,
    },
    {
      key: "regularHours",
      label: "Regular Hours",
      sortable: true,
      className: "text-right",
      render: (value) => (
        <span className="font-bold text-slate-800">{fmt(value)}</span>
      ),
    },
    {
      key: "overtimeHours",
      label: "Overtime Hours",
      sortable: true,
      className: "text-right",
      render: (value) => (
        <span
          className={cn(
            "font-bold",
            value > 0 ? "text-amber-600" : "text-slate-400",
          )}
        >
          {fmt(value)}
        </span>
      ),
    },
    {
      key: "absentDays",
      label: "Absent Days",
      sortable: true,
      className: "text-right",
      render: (value) => (
        <span
          className={cn(
            "font-bold",
            value > 0 ? "text-rose-600" : "text-slate-400",
          )}
        >
          {fmt(value)}
        </span>
      ),
    },
    {
      key: "paidLeaveDays",
      label: "Paid Leave Days",
      sortable: true,
      className: "text-right",
      render: (value) => (
        <span
          className={cn(
            "font-bold",
            value > 0 ? "text-blue-600" : "text-slate-400",
          )}
        >
          {fmt(value)}
        </span>
      ),
    },
    {
      key: "actualDays",
      label: "Actual Days",
      sortable: true,
      className: "text-right",
      render: (value) => (
        <span className="font-bold text-slate-800">{fmtInt(value)}</span>
      ),
    },
  ];

  // ── No importId state ───────────────────────────────────────────────────

  if (!importId) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "w-10 h-10 rounded-xl border border-slate-200/60",
              "flex items-center justify-center",
              "hover:bg-slate-50 hover:border-slate-300",
              "transition-all duration-200",
            )}
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
              Attendance Statistics
            </h1>
          </div>
        </div>

        {/* Empty state */}
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-500">
            No attendance import selected. Please go back and select an import.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 text-xs font-bold text-emerald-600 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className={cn(
            "w-10 h-10 rounded-xl border border-slate-200/60",
            "flex items-center justify-center",
            "hover:bg-slate-50 hover:border-slate-300",
            "transition-all duration-200",
          )}
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
            Attendance Statistics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Per-employee attendance breakdown for the selected import
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">
            Loading attendance data…
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-sm font-bold text-slate-500">{error}</p>
          <button
            onClick={fetchData}
            className={cn(
              "mt-4 px-4 py-2 text-xs font-bold text-emerald-600",
              "bg-brand-50 border border-brand-200 rounded-xl",
              "hover:bg-brand-100 transition-all",
              "inline-flex items-center gap-1.5",
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatSummaryCard
              label="Total Employees"
              value={fmtInt(totals.employees)}
              icon={Users}
              gradient="bg-gradient-to-br from-brand-500 to-brand-600"
            />
            <StatSummaryCard
              label="Total Regular Hours"
              value={fmt(totals.regularHours)}
              icon={Clock}
              gradient="bg-gradient-to-br from-teal-400 to-teal-500"
            />
            <StatSummaryCard
              label="Total Absent Days"
              value={fmt(totals.absentDays)}
              icon={X}
              gradient="bg-gradient-to-br from-rose-400 to-rose-500"
            />
          </div>

          {/* Table Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-900/5 overflow-hidden">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-slate-700">
                Employee Attendance Breakdown
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                {data.length} employee{data.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* DataTable */}
            <div className="p-5">
              <DataTable<AttendanceEmployeeRow>
                columns={columns}
                data={data}
                loading={loading}
                emptyState="No attendance data available for this import"
                searchPlaceholder="Search employees…"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
