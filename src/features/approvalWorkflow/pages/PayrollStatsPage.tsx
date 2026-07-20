import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Banknote,
  BadgeCheck,
  Users,
  Calculator,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  payrollRunApi,
  type PayrollRunItem,
} from "../../payrollProcessing/api/payrollProcessingApi";
import { ExpandablePayrollTable } from "../../payrollProcessing/components/ExpandablePayrollTable";
import { Pagination } from "../../../components/ui";

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatSummaryCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  accent: string;
}

const StatSummaryCard: React.FC<StatSummaryCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  accent,
}) => (
  <div
    className={cn(
      "bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5",
      "shadow-lg shadow-slate-900/5",
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
  </div>
);

const fmt = (n: number): string =>
  "ETB " +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export const PayrollStatsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const periodId = searchParams.get("periodId");

  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // ── Fetch payroll data ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!periodId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Same approach as PeriodEmployeesPage: find the main run and get its items
      const runsRes = await payrollRunApi.getRuns({
        payrollPeriodId: periodId,
        limit: 100,
        _t: Date.now(),
      });
      const runs = runsRes.data?.data ?? [];
      // Pick the run without batchId (the "main" run), or fall back to the first
      const currentRun = runs.find((r) => !r.payrollBatchId) ?? runs[0] ?? null;
      if (!currentRun) {
        setItems([]);
        setRunId("");
        setLoading(false);
        return;
      }

      setRunId(currentRun.id);

      // Fetch items from the main run
      const itemsRes = await payrollRunApi.getRunItems(currentRun.id, {
        page: 1,
        limit: 1000,
      });
      setItems(itemsRes.data?.data ?? []);
      setPage(1);
    } catch (err: any) {
      console.error("Failed to load payroll stats:", err);
      setError("Failed to load payroll statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Client-side pagination ──────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  // ── Totals for summary cards ────────────────────────────────
  const totals = useMemo(
    () => ({
      employees: items.length,
      totalGross: items.reduce(
        (s, e) => s + (Number(e.grossSalary) || 0),
        0,
      ),
      totalNet: items.reduce((s, e) => s + (Number(e.netSalary) || 0), 0),
      totalDeductions: items.reduce(
        (s, e) => s + (Number(e.totalDeductions) || 0),
        0,
      ),
    }),
    [items],
  );

  // ── No periodId guard ────────────────────────────────────────
  if (!periodId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "w-10 h-10 rounded-xl border border-slate-200 bg-white",
              "flex items-center justify-center",
              "hover:bg-slate-50 hover:border-slate-300 transition-all duration-200",
              "shadow-sm",
            )}
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">
              Payroll Statistics
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Per-employee payroll breakdown
            </p>
          </div>
        </div>
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-slate-500">
            No payroll period selected.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Navigate from the approval workflow to view payroll statistics.
          </p>
          <button
            onClick={() => navigate("/approval-workflow")}
            className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
          >
            Go to Approval Workflow
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className={cn(
            "w-10 h-10 rounded-xl border border-slate-200 bg-white",
            "flex items-center justify-center",
            "hover:bg-slate-50 hover:border-slate-300 transition-all duration-200",
            "shadow-sm",
          )}
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">
            Payroll Statistics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Active period &middot; {items.length} processed employee
            {items.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!loading && !error && items.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Processed Employees
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">
            Loading payroll data…
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
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
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
          {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatSummaryCard
                label="Employees"
                value={totals.employees.toLocaleString("en-US")}
                icon={Users}
                color="text-blue-600"
                accent="bg-gradient-to-br from-blue-50 to-blue-100"
              />
              <StatSummaryCard
                label="Gross Pay"
                value={fmt(totals.totalGross)}
                icon={Calculator}
                color="text-emerald-600"
                accent="bg-gradient-to-br from-brand-50 to-brand-100"
              />
              <StatSummaryCard
                label="Total Deductions"
                value={fmt(totals.totalDeductions)}
                icon={Banknote}
                color="text-rose-600"
                accent="bg-gradient-to-br from-rose-50 to-rose-100"
              />
              <StatSummaryCard
                label="Net Pay"
                value={fmt(totals.totalNet)}
                icon={BadgeCheck}
                color="text-emerald-600"
                accent="bg-gradient-to-br from-brand-50 to-brand-100"
              />
            </div>
          )}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">
                No processed employees found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                This payroll period has no processed payroll run items yet.
              </p>
            </div>
          )}

          {/* Expandable Table */}
          {items.length > 0 && (
            <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
              <ExpandablePayrollTable
                items={paginatedItems}
                runId={runId}
                loading={false}
                onSelectItem={() => {}}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={items.length}
                  onPageChange={handlePageChange}
                  pageSize={PAGE_SIZE}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
