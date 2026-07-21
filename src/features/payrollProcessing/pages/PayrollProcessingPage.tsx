import React, { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  RefreshCw,
  CalendarRange,
  Layers,
  CheckCircle2,
  Users,
} from "lucide-react";
import { payrollRunApi, type PayrollRun } from "../api/payrollProcessingApi";
import { fiscalYearApi, payrollPeriodApi } from "../../configuration/api/configurationApi";
import type { FiscalYear, PayrollPeriod } from "../../configuration/types/configuration.types";
import { PayrollProcessingTab } from "../components/PayrollProcessingTab";
import { attendanceApi } from "../../attendance/api/attendanceApi";

/** Current status of the payroll processing workflow. */
type ProcessingStatus = "idle" | "processing" | "success" | "error";

/**
 * PayrollProcessingPage — fiscal year / period browser that loads common data
 * and delegates the period drill-down to PayrollProcessingTab. Clicking "View"
 * on a period navigates to a dedicated employee list page.
 */
export const PayrollProcessingPage: React.FC = () => {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [attendanceApproved, setAttendanceApproved] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  // ── Data fetching ──────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fyRes, ppRes, runsRes, imports] = await Promise.all([
        fiscalYearApi.getAll(),
        payrollPeriodApi.getAll(),
        payrollRunApi.getRuns({ limit: 100, _t: Date.now() }),
        attendanceApi.listImports(),
      ]);
      const fetchedFYs: FiscalYear[] = fyRes.data?.data || [];
      const fetchedPPs: PayrollPeriod[] = ppRes.data?.data || [];
      const fetchedRuns: PayrollRun[] = runsRes.data?.data || [];

      setFiscalYears(
        [...fetchedFYs].sort((a, b) => {
          if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
          if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }),
      );

      setPayrollPeriods(fetchedPPs);
      setRuns(fetchedRuns);

      // Check attendance approval — at least one active import must be APPROVED
      const activeImport = imports.find((imp) => imp.isActive);
      setAttendanceApproved(activeImport?.status === "APPROVED");

      // Check payment approval — at least one run must be APPROVED or DONE
      const hasApprovedPayment = fetchedRuns.some(
        (r) => r.status === "APPROVED" || r.status === "DONE",
      );
      setPaymentApproved(hasApprovedPayment);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Processing handler ─────────────────────────────────

  const handleProcessPeriod = async (periodId: string) => {
    setProcessingStatus("processing");
    setProcessingError(null);
    try {
      await payrollRunApi.runPayroll({
        payrollPeriodId: periodId,
        page: 1,
        limit: 500,
      });
      setProcessingStatus("success");
      await fetchData();
      setTimeout(() => setProcessingStatus("idle"), 3000);
    } catch (err: any) {
      setProcessingError(
        err?.response?.data?.message || err?.message || "Failed to process",
      );
      setProcessingStatus("error");
    }
  };

  // ── Derived stats ──────────────────────────────────────

  const totalPeriods = payrollPeriods.length;
  const activeRuns = runs.filter((r) => r.status === "COMPLETED" || r.status === "DONE").length;
  const processedPeriods = new Set(runs.map((r) => r.payrollPeriodId)).size;
  const totalEmployees = runs.reduce((s, r) => s + Number(r.employeeCount || 0), 0);
  const processedPct = totalPeriods > 0 ? Math.round((processedPeriods / totalPeriods) * 100) : 0;

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-10 pb-12 relative">
      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="h-48 w-full rounded-[3rem] bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="h-32 rounded-[2rem] bg-slate-100 animate-pulse" />
            <div className="h-32 rounded-[2rem] bg-slate-100 animate-pulse" />
            <div className="h-32 rounded-[2rem] bg-slate-100 animate-pulse" />
            <div className="h-32 rounded-[2rem] bg-slate-100 animate-pulse" />
          </div>
          <div className="h-96 rounded-[3rem] bg-slate-100 animate-pulse" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="glass rounded-[3rem] p-12 flex items-center gap-6 border-white shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center shrink-0 shadow-sm">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-black text-slate-900 tracking-tight">Failed to Load</p>
            <p className="text-sm text-slate-500 font-medium mt-1">{error}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && (
        <>
          {/* ── Refined Gradient Header ── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 rounded-[3rem] p-10 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-400/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                      <Layers className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight leading-none">Payroll Processing</h1>
                      <p className="text-brand-100 font-bold text-xs uppercase tracking-widest mt-2">Payroll Operations &bull; Processing Center</p>
                    </div>
                  </div>
                  <p className="text-brand-50/80 text-sm max-w-xl font-medium leading-relaxed">
                    Browse fiscal years and payroll periods. Click <strong className="text-white">View</strong> to manage
                    employees or <strong className="text-white">Process</strong> to run payroll for a period.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 shadow-inner group hover:bg-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                        <CalendarRange className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Active Periods</p>
                        <p className="text-sm font-black text-white">{totalPeriods} Total &middot; {processedPeriods} Processed</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-[10px] font-bold text-emerald-200/70">
                        {processedPct}% completion rate
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative swoosh */}
            <svg className="absolute bottom-0 right-0 w-48 h-48 text-white/5 -mb-12 -mr-12 pointer-events-none" viewBox="0 0 200 200" fill="none">
              <path d="M0 200C60 160 100 120 140 80C160 60 180 40 200 0V200H0Z" fill="currentColor" />
            </svg>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Fiscal Years", value: fiscalYears.length, icon: CalendarRange, iconBg: "bg-brand-100 text-emerald-600" },
              { label: "Payroll Periods", value: totalPeriods, icon: Layers, iconBg: "bg-brand-100 text-emerald-600" },
              { label: "Active Runs", value: activeRuns, icon: CheckCircle2, iconBg: "bg-brand-100 text-emerald-600" },
              { label: "Total Employees", value: totalEmployees, icon: Users, iconBg: "bg-brand-100 text-emerald-600" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="glass rounded-[2rem] p-8 shadow-xl border-white group hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform text-brand-primary">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* ── Processing Tab ── */}
          <div className="glass rounded-[3rem] shadow-2xl border-white overflow-hidden bg-white/30 backdrop-blur-md p-8">
            <PayrollProcessingTab
              fiscalYears={fiscalYears}
              payrollPeriods={payrollPeriods}
              runs={runs}
              processingStatus={processingStatus}
              processingError={processingError}
              onProcessPeriod={handleProcessPeriod}
              attendanceApproved={attendanceApproved}
              paymentApproved={paymentApproved}
            />
          </div>
        </>
      )}
    </div>
  );
};
