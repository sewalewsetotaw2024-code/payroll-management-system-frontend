import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { payrollRunApi } from "../../payrollProcessing/api/payrollProcessingApi";
import type { PayrollRunItem } from "../../payrollProcessing/api/payrollProcessingApi";
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  FileSpreadsheet,
  Calculator,
  X,
  BadgeCheck,
  User,
  AlertCircle,
  Loader2,
  Banknote,
  Landmark,
  Download,
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

// ── Export Helpers ────────────────────────────────────────────────────────────

function exportToExcel(rows: EmployeePayrollRow[]): void {
  const data = rows.map((r) => ({
    "Employee Name": r.employeeName,
    Department: r.department,
    "TIN Number": r.tinNumber,
    "Job Position": r.jobPosition,
    "Work Days": r.workDays,
    "Basic Salary": r.basicSalary,
    "Prorated Salary": r.proratedSalary,
    "Gross Taxable Income": r.grossTaxableIncome,
    "Gross Salary": r.grossSalary,
    "Total Deductions": r.totalDeductions,
    "Net Salary": r.netSalary,
    "Cost to Company": r.costToCompany,
    Currency: r.currency,
    "Mid-Month Hire": r.isMidMonthHire ? "Yes" : "No",
    "Deduction Cap Breached": r.deductionCapBreached ? "Yes" : "No",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 18 },
    { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    { wch: 10 }, { wch: 14 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Payroll Employees");
  XLSX.writeFile(wb, `payroll_employees_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportToCSV(rows: EmployeePayrollRow[]): void {
  const headers = [
    "Employee Name", "Department", "TIN Number", "Job Position",
    "Work Days", "Basic Salary", "Prorated Salary", "Gross Taxable Income",
    "Gross Salary", "Total Deductions", "Net Salary", "Cost to Company",
    "Currency", "Mid-Month Hire", "Deduction Cap Breached",
  ];
  const csvRows = [headers.join(",")];
  for (const r of rows) {
    csvRows.push([
      `"${r.employeeName.replace(/"/g, '""')}"`,
      `"${r.department.replace(/"/g, '""')}"`,
      `"${r.tinNumber.replace(/"/g, '""')}"`,
      `"${r.jobPosition.replace(/"/g, '""')}"`,
      r.workDays,
      r.basicSalary,
      r.proratedSalary,
      r.grossTaxableIncome,
      r.grossSalary,
      r.totalDeductions,
      r.netSalary,
      r.costToCompany,
      r.currency,
      r.isMidMonthHire ? "Yes" : "No",
      r.deductionCapBreached ? "Yes" : "No",
    ].join(","));
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payroll_employees_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
                  ? "bg-blue-100 text-blue-700 shadow-sm"
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

interface EmployeePayrollRow {
  employeeName: string;
  department: string;
  tinNumber: string;
  jobPosition: string;
  workDays: number;
  basicSalary: number;
  proratedSalary: number;
  grossTaxableIncome: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  costToCompany: number;
  currency: string;
  isMidMonthHire: boolean;
  deductionCapBreached: boolean;
}

const PayrollEmployeeStatsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const periodId = searchParams.get("periodId");

  const [items, setItems] = useState<EmployeePayrollRow[]>([]);
  const [runInfo, setRunInfo] = useState<{ totalGross: number; totalNet: number; totalTax: number; totalPension: number; totalDeductions: number; totalCostToCompany: number; employeeCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Fetch ALL payroll run items across ALL runs for the period ────────
  useEffect(() => {
    if (!periodId) {
      setError("No payroll period ID provided");
      setLoading(false);
      return;
    }

    const fetchAllRuns = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch ALL runs for the period
        const runsRes = await payrollRunApi.getRuns({ payrollPeriodId: periodId });
        const runs = Array.isArray(runsRes.data?.data) ? runsRes.data.data : [];
        if (runs.length === 0) {
          setItems([]);
          setRunInfo(null);
          setLoading(false);
          return;
        }

        // 2. For each run, fetch items across all pages
        const PAGE_LIMIT = 100;
        const allRunItems: PayrollRunItem[] = [];

        for (const run of runs) {
          // First page to get total pages
          const first = await payrollRunApi.getRunItems(run.id, { page: 1, limit: PAGE_LIMIT });
          const pagination = first.data?.pagination;
          const firstBatch = first.data?.data || [];

          // Remaining pages
          const totalPages = pagination?.totalPages ?? 1;
          const remainingPages: number[] = [];
          for (let p = 2; p <= totalPages; p++) {
            remainingPages.push(p);
          }

          const restResponses = remainingPages.length > 0
            ? await Promise.all(
                remainingPages.map((p) =>
                  payrollRunApi.getRunItems(run.id, { page: p, limit: PAGE_LIMIT }),
                ),
              )
            : [];

          allRunItems.push(
            ...firstBatch,
            ...restResponses.flatMap((r) => r.data?.data || []),
          );
        }

        // 3. Aggregated totals across all runs (coerce to number — API may return strings)
        const toNum = (v: any): number => {
          const n = Number(v);
          return isNaN(n) ? 0 : n;
        };
        const aggTotalGross = runs.reduce((s, r) => s + toNum(r.totalGross), 0);
        const aggTotalNet = runs.reduce((s, r) => s + toNum(r.totalNet), 0);
        const aggTotalTax = runs.reduce((s, r) => s + toNum(r.totalTax), 0);
        const aggTotalPension = runs.reduce((s, r) => s + toNum(r.totalPension), 0);
        const aggTotalCost = runs.reduce((s, r) => s + toNum(r.totalCostToCompany), 0);
        const aggEmployeeCount = runs.reduce((s, r) => s + toNum(r.employeeCount), 0);
        const aggTotalDeductions = aggTotalGross - aggTotalNet;

        setRunInfo({
          totalGross: aggTotalGross,
          totalNet: aggTotalNet,
          totalTax: aggTotalTax,
          totalPension: aggTotalPension,
          totalDeductions: aggTotalDeductions,
          totalCostToCompany: aggTotalCost,
          employeeCount: aggEmployeeCount,
        });

        // 4. Map to display rows (coerce all numeric fields with + to prevent string concatenation)
        setItems(
          allRunItems.map((item: PayrollRunItem) => ({
            employeeName:
              [item.employee?.firstName, item.employee?.lastName]
                .filter(Boolean)
                .join(" ") || "Unknown",
            department: item.employee?.departmentName || "—",
            tinNumber: item.employee?.tinNumber || "—",
            jobPosition: item.employee?.jobPosition || "—",
            workDays: +(item.workDays ?? 0),
            basicSalary: +(item.basicSalary ?? 0),
            proratedSalary: +(item.proratedSalary ?? 0),
            grossTaxableIncome: +(item.grossTaxableIncome ?? 0),
            grossSalary: +(item.grossSalary ?? 0),
            totalDeductions: +(item.totalDeductions ?? 0),
            netSalary: +(item.netSalary ?? 0),
            costToCompany: +(item.costToCompany ?? 0),
            currency: item.currency || "ETB",
            isMidMonthHire: item.isMidMonthHire ?? false,
            deductionCapBreached: item.deductionCapBreached ?? false,
          })),
        );
      } catch (err) {
        console.error("Failed to load payroll items:", err);
        setError("Failed to load employee payroll data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllRuns();
  }, [periodId]);

  // Filter/search
  const filtered = useMemo(
    () =>
      items.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          e.department.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
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
      employees: items.length,
      totalGross: items.reduce((s, e) => s + e.grossSalary, 0),
      totalNet: items.reduce((s, e) => s + e.netSalary, 0),
      totalDeductions: items.reduce((s, e) => s + e.totalDeductions, 0),
      totalCostToCompany: items.reduce((s, e) => s + e.costToCompany, 0),
      totalBasic: items.reduce((s, e) => s + e.basicSalary, 0),
    }),
    [items],
  );

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
                Employee Payroll Details
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                Run
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Detailed payroll breakdown for {fmtInt(items.length)} employee
              {items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">
            Loading employee payroll data…
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
            className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
          >
            Back to Approval Workflow
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatSummaryCard
              label="Total Employees"
              value={fmtInt(totals.employees)}
              icon={User}
              color="text-blue-600"
              accent="bg-gradient-to-br from-blue-50 to-blue-100"
            />
            <StatSummaryCard
              label="Total Gross Salary"
              value={`ETB ${fmt(totals.totalGross)}`}
              icon={Banknote}
              color="text-emerald-600"
              accent="bg-gradient-to-br from-emerald-50 to-emerald-100"
            />
            <StatSummaryCard
              label="Total Net Pay"
              value={`ETB ${fmt(totals.totalNet)}`}
              icon={BadgeCheck}
              color="text-emerald-600"
              accent="bg-gradient-to-br from-emerald-50 to-emerald-100"
            />
            <StatSummaryCard
              label="Total Deductions"
              value={`ETB ${fmt(totals.totalDeductions)}`}
              icon={X}
              color="text-rose-600"
              accent="bg-gradient-to-br from-rose-50 to-rose-100"
            />
            <StatSummaryCard
              label="Total Income Tax"
              value={`ETB ${fmt(runInfo?.totalTax ?? 0)}`}
              icon={Landmark}
              color="text-amber-600"
              accent="bg-gradient-to-br from-amber-50 to-amber-100"
            />
            <StatSummaryCard
              label="Total Cost to Company"
              value={`ETB ${fmt(totals.totalCostToCompany)}`}
              icon={Calculator}
              color="text-purple-600"
              accent="bg-gradient-to-br from-purple-50 to-purple-100"
            />
          </div>

          {/* Table Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-900/5 overflow-hidden">

            {/* Table header */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-700">
                  Employee Payroll Breakdown
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                  {filtered.length} of {items.length}
                </span>
              </div>

              {/* Export buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToExcel(items)}
                  className="px-3 py-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                  title="Export to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={() => exportToCSV(items)}
                  className="px-3 py-2 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or department…"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition-all"
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
                      Work Days
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Basic Salary
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Prorated Salary
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Gross Taxable
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Gross Salary
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Deductions
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Net Salary
                    </th>
                    <th className="py-3.5 pr-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Cost to Company
                    </th>
                    <th className="py-3.5 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                          <User className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">
                          {search
                            ? "No employees match your search"
                            : "No payroll data available"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((emp, idx) => (
                      <tr
                        key={`${emp.employeeName}-${idx}`}
                        className={cn(
                          "border-b border-slate-50 transition-colors",
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                          "hover:bg-blue-50/40",
                        )}
                      >
                        <td className="py-3.5 px-6">
                          <div>
                            <span className="text-sm font-bold text-slate-800">
                              {emp.employeeName}
                            </span>
                            {emp.tinNumber !== "—" && (
                              <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                                TIN: {emp.tinNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-[11px] font-medium text-slate-500">
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-slate-800">
                            {emp.workDays}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-slate-800">
                            ETB {fmt(emp.basicSalary)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className={cn(
                            "text-sm font-bold",
                            emp.proratedSalary > 0 ? "text-slate-800" : "text-slate-400",
                          )}>
                            {emp.proratedSalary > 0 ? `ETB ${fmt(emp.proratedSalary)}` : "—"}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-slate-800">
                            ETB {fmt(emp.grossTaxableIncome)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-slate-800">
                            ETB {fmt(emp.grossSalary)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-rose-600">
                            ETB {fmt(emp.totalDeductions)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-emerald-600">
                            ETB {fmt(emp.netSalary)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className="text-sm font-bold text-purple-600">
                            ETB {fmt(emp.costToCompany)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-6 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {emp.isMidMonthHire && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap" title="Mid-month hire">
                                Mid
                              </span>
                            )}
                            {emp.deductionCapBreached && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 whitespace-nowrap" title="Deduction cap breached">
                                Cap!
                              </span>
                            )}
                            {!emp.isMidMonthHire && !emp.deductionCapBreached && (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
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
                      label: "Total Basic Salary",
                      value: `ETB ${fmt(
                        paginated.reduce((s, e) => s + e.basicSalary, 0),
                      )}`,
                    },
                    {
                      label: "Total Gross",
                      value: `ETB ${fmt(
                        paginated.reduce((s, e) => s + e.grossSalary, 0),
                      )}`,
                    },
                    {
                      label: "Total Deductions",
                      value: `ETB ${fmt(
                        paginated.reduce((s, e) => s + e.totalDeductions, 0),
                      )}`,
                    },
                    {
                      label: "Total Net",
                      value: `ETB ${fmt(
                        paginated.reduce((s, e) => s + e.netSalary, 0),
                      )}`,
                    },
                    {
                      label: "Total Cost to Company",
                      value: `ETB ${fmt(
                        paginated.reduce((s, e) => s + e.costToCompany, 0),
                      )}`,
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

export default PayrollEmployeeStatsPage;
