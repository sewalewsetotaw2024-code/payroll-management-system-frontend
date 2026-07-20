import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Loader2,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { payrollRunApi } from "../api/payrollProcessingApi";
import type { PayrollRun } from "../api/payrollProcessingApi";
import { useAppSelector } from "../../../store/hooks";
import type { FiscalYear, PayrollPeriod } from "../../configuration/types/configuration.types";

type ProcessingStatus = "idle" | "processing" | "success" | "error";

interface PayrollProcessingTabProps {
  fiscalYears: FiscalYear[];
  payrollPeriods: PayrollPeriod[];
  runs: PayrollRun[];
  processingStatus: ProcessingStatus;
  processingError: string | null;
  onProcessPeriod: (periodId: string) => void;
}

export const PayrollProcessingTab: React.FC<PayrollProcessingTabProps> = ({
  fiscalYears,
  payrollPeriods,
  runs,
  processingStatus,
  processingError: _processingError,
  onProcessPeriod,
}) => {
  const navigate = useNavigate();
  const [expandedFiscalYearId, setExpandedFiscalYearId] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────

  const sortedPeriodsForFY = useMemo(() => {
    if (!expandedFiscalYearId) return [];
    const filtered = payrollPeriods.filter(
      (p) => p.fiscalYearId === expandedFiscalYearId,
    );
    return [...filtered].sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
      return (
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    });
  }, [payrollPeriods, expandedFiscalYearId]);

  const hasRun = useCallback(
    (periodId: string) => runs.some((r) => r.payrollPeriodId === periodId),
    [runs],
  );

  const sortedFYs = useMemo(() => {
    return [...fiscalYears].sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
      return 0;
    });
  }, [fiscalYears]);

  // ── Handlers ──────────────────────────────────────────

  const handleToggleFY = useCallback((fyId: string) => {
    setExpandedFiscalYearId((prev) => (prev === fyId ? null : fyId));
  }, []);

  const handleViewPeriod = useCallback(
    (periodId: string) => {
      navigate(`/payroll/${periodId}/employees`);
    },
    [navigate],
  );

  const handleProcessClick = useCallback(
    (periodId: string) => {
      onProcessPeriod(periodId);
    },
    [onProcessPeriod],
  );

  // ── Role-based access ──────────────────────────────────
  const userRole = useAppSelector((state) => state.auth.user?.role?.name ?? null);
  const HR_ROLES = new Set(['HR Generalist', 'HR CS Manager', 'HR CS Director']);
  const isHrRole = userRole ? HR_ROLES.has(userRole) : false;

  // ── Generate payslip state ────────────────────────────
  const [generatingRunId, setGeneratingRunId] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGeneratePayslips = useCallback(async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratingRunId(runId);
    setGenerateSuccess(null);
    setGenerateError(null);
    try {
      const response = await payrollRunApi.generatePayslipsForRun(runId);
      setGenerateSuccess(response.data.message || `Generated payslips successfully`);
      setTimeout(() => setGenerateSuccess(null), 3000);
    } catch (err: any) {
      setGenerateError(
        err?.response?.data?.message || err?.message || "Failed to generate payslips",
      );
      setTimeout(() => setGenerateError(null), 5000);
    } finally {
      setGeneratingRunId(null);
    }
  }, []);

  const getRunForPeriod = useCallback(
    (periodId: string) => runs.find((r) => r.payrollPeriodId === periodId),
    [runs],
  );

  const canGeneratePayslips = useCallback(
    (periodId: string) => {
      const run = getRunForPeriod(periodId);
      if (!run) return false;
      return ["PENDING_PAYMENT_APPROVAL", "APPROVED", "DONE"].includes(run.status);
    },
    [getRunForPeriod],
  );

  // ── Render helpers ────────────────────────────────────

  const getPeriodBadge = (status?: string, hasRunVal?: boolean) => {
    if (hasRunVal) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-emerald-700 text-[11px] font-bold border border-brand-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Processed
        </span>
      );
    }
    if (status === "CLOSED" || status === "DONE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[11px] font-bold border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Upcoming
      </span>
    );
  };

  const getFYBadge = (status?: string) => {
    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary text-white text-[11px] font-bold shadow-sm border border-brand-700/30">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[11px] font-medium border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Closed
      </span>
    );
  };

  const getEmployeeCount = useCallback(
    (periodId: string) => {
      const run = runs.find((r) => r.payrollPeriodId === periodId);
      return run?.employeeCount ?? null;
    },
    [runs],
  );

  return (
    <div className="space-y-6">
      {/* Empty state */}
      {fiscalYears.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Banknote className="w-10 h-10 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-700 tracking-tight">
              No Fiscal Years Yet
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-md font-medium">
              Create a fiscal year and payroll period in Configuration first, then return here to process payroll.
            </p>
          </div>
        </div>
      )}

      {/* Fiscal Year List */}
      {fiscalYears.length > 0 && (
        <div className="space-y-4">
          {sortedFYs.map((fy) => {
            const isExpanded = expandedFiscalYearId === fy.id;
            const fyPeriods = payrollPeriods.filter((p) => p.fiscalYearId === fy.id);
            const processedPeriods = fyPeriods.filter((p) => hasRun(p.id!)).length;
            const isActive = fy.status === "ACTIVE";

            return (
              <div
                key={fy.id}
                className="glass rounded-2xl overflow-hidden border-white shadow-lg transition-shadow duration-200 hover:shadow-xl"
              >
                {/* FY Header */}
                <div
                  onClick={() => handleToggleFY(fy.id!)}
                  className="flex items-center justify-between px-7 py-5 cursor-pointer select-none hover:bg-white/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                      isActive
                        ? "bg-brand-50 text-emerald-600 border-brand-200"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    )}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-base font-black tracking-tight",
                          isActive ? "text-slate-900" : "text-slate-500"
                        )}>
                          {fy.name}
                        </span>
                        <span className="hidden sm:inline">{getFYBadge(fy.status)}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {new Date(fy.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        {" — "}
                        {new Date(fy.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        {" · "}
                        <span className="font-bold">{fyPeriods.length}</span> periods
                        {" · "}
                        <span className="font-bold">{processedPeriods}</span> processed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="sm:hidden">{getFYBadge(fy.status)}</span>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                      isExpanded ? "bg-brand-primary text-white" : "bg-slate-50 text-slate-400"
                    )}>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )} />
                    </div>
                  </div>
                </div>

                {/* Expanded period table */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    isExpanded ? "max-h-[2000px]" : "max-h-0"
                  )}
                >
                  <div className="border-t border-slate-100/60 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100">
                          <th className="text-left px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Period</th>
                          <th className="text-left px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Status</th>
                          <th className="text-left px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Date Range</th>
                          <th className="text-left px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Payment Date</th>
                          <th className="text-left px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Cycle</th>
                          <th className="text-center px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Employees</th>
                          <th className="text-right px-5 py-3.5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-[300px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPeriodsForFY.map((pp, idx) => {
                          const periodHasRun = hasRun(pp.id!);
                          const isClosed = pp.status === "CLOSED" || pp.status === "DONE";
                          const isProcessing = processingStatus === "processing";
                          const disableProcess = periodHasRun || isClosed || isProcessing;
                          const processTitle = periodHasRun
                            ? "This period has already been processed"
                            : isClosed
                              ? "This period is closed"
                              : isProcessing
                                ? "Processing in progress"
                                : "Run payroll for this period";
                          const empCount = getEmployeeCount(pp.id!);
                          const isFuture = !periodHasRun && !isClosed && pp.status !== "ACTIVE";

                          return (
                            <tr
                              key={pp.id}
                              className={cn(
                                "transition-colors cursor-pointer border-b border-slate-50",
                                idx % 2 === 0 ? "bg-white/40" : "bg-slate-50/20",
                                isFuture ? "opacity-50" : "hover:bg-brand-50/40",
                              )}
                              onClick={() => periodHasRun && handleViewPeriod(pp.id!)}
                            >
                              <td className="px-5 py-4">
                                <span className="font-bold text-slate-800 text-[13px]">
                                  {pp.name ?? "\u2014"}
                                </span>
                                <span className="ml-2 inline-block text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {pp.cycle ?? "Monthly"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {getPeriodBadge(pp.status, periodHasRun)}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                                {new Date(pp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                {" — "}
                                {new Date(pp.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                                {pp.dateOfPayment
                                  ? new Date(pp.dateOfPayment).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                  : "\u2014"}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-500">
                                {pp.cycle ?? "\u2014"}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className="font-bold text-slate-700 text-sm tabular-nums">
                                  {empCount !== null ? empCount : "\u2014"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleViewPeriod(pp.id!)}
                                    disabled={!periodHasRun && !isClosed}
                                    title={periodHasRun ? "View employee payroll details" : "No payroll data yet"}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border-2 transition-all",
                                      periodHasRun || isClosed
                                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                                        : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed",
                                    )}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleProcessClick(pp.id!)}
                                    disabled={disableProcess}
                                    title={processTitle}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border-2 transition-all shadow-sm",
                                      disableProcess
                                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                        : "bg-primary border-brand-800/30 text-white hover:bg-brand-700 shadow-brand-900/10",
                                    )}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                    Process
                                  </button>
                                  {isHrRole && (() => {
                                    const run = getRunForPeriod(pp.id!);
                                    const canGenerate = canGeneratePayslips(pp.id!);
                                    const isGenerating = generatingRunId === run?.id;
                                    const genTitle = !run
                                      ? "Process payroll first"
                                      : !canGenerate
                                        ? "Payroll must be fully approved before generating payslips"
                                        : "Generate payslips for this period";
                                    return (
                                      <button
                                        onClick={(e) => run && handleGeneratePayslips(run.id, e)}
                                        disabled={!run || !canGenerate || isGenerating}
                                        title={genTitle}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border-2 transition-all shadow-sm",
                                          !run || !canGenerate || isGenerating
                                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                            : "bg-brand-primary border-brand-800/30 text-white hover:bg-brand-700 shadow-brand-900/10",
                                        )}
                                      >
                                        {isGenerating ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        )}
                                        {isGenerating ? "Gen..." : "Payslips"}
                                      </button>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Success/Error toasts for payslip generation */}
      {generateSuccess && (
        <div className="fixed bottom-4 right-4 bg-brand-primary text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-black z-50 flex items-center gap-3 border border-brand-700/30">
          <CheckCircle2 className="w-4 h-4" />
          {generateSuccess}
        </div>
      )}
      {generateError && (
        <div className="fixed bottom-4 right-4 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-black z-50 flex items-center gap-3 border-2 border-rose-600/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {generateError}
        </div>
      )}
    </div>
  );
};
